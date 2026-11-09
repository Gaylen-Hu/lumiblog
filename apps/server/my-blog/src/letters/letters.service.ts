import {
  BadRequestException,
  ConflictException,
  HttpException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { open } from 'fs/promises';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { LetterKeys, normalizeEmail } from './letter-security';
import { LetterQuota } from './letter-quota';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export class SendLetter {
  @IsUUID('4') id!: string;
  @IsInt() startedAt!: number;
  @Matches(/^[a-f0-9]{64}$/) claimDigest!: string;
  @Transform(trim) @Length(1, 60) nickname!: string;
  @Transform(trim) @IsEmail() @MaxLength(254) email!: string;
  @Transform(trim) @Matches(/^(?:[+0-9][0-9 ()-]{4,30})?$/) phone!: string;
  @IsIn(['general', 'work', 'other']) topic!: string;
  @Transform(trim) @Length(1, 3000) body!: string;
  @IsBoolean() allowPublic!: boolean;
}
export class InboxQuery {
  @IsOptional()
  @IsIn([
    'private',
    'pending',
    'declined',
    'published',
    'withdrawn',
    'unread',
    'handled',
  ])
  filter?: string;
  @IsOptional() @Transform(trim) @IsEmail() @MaxLength(254) email?: string;
  @IsOptional() @IsUUID() before?: string;
}
export class LetterAction {
  @IsIn(['read', 'handled', 'publish', 'decline', 'withdraw']) action!: string;
}
const receipt = { received: true };
const publicFields = {
  publicId: true,
  nickname: true,
  body: true,
  publishedAt: true,
};
const safeSummary = {
  id: true,
  nickname: true,
  topic: true,
  status: true,
  allowPublic: true,
  createdAt: true,
  readAt: true,
  handledAt: true,
};

@Injectable()
export class LettersService {
  private readonly logger = new Logger(LettersService.name);
  constructor(
    private readonly db: PrismaService,
    private readonly keys: LetterKeys,
    private readonly quota: LetterQuota,
    private readonly config: ConfigService,
  ) {}
  async send(input: SendLetter, source: string) {
    const email = normalizeEmail(input.email);
    const fingerprint = this.keys.digest(
      'submission',
      JSON.stringify([
        input.startedAt,
        input.nickname,
        email,
        input.phone,
        input.topic,
        input.body,
        input.allowPublic,
        input.claimDigest,
      ]),
    );
    return this.db
      .$transaction(async (tx) => {
        // Serialize identical submissions, including the new-letter quota reservation.
        await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${input.id}))`;
        const previous = await tx.studyLetter.findUnique({
          where: { id: input.id },
          select: { fingerprint: true, deletedAt: true },
        });
        if (previous) {
          if (previous.deletedAt) throw new GoneException();
          if (previous.fingerprint !== fingerprint)
            throw new ConflictException('Submission changed');
          return 'replayed';
        }
        const age = Date.now() - input.startedAt;
        if (age < -300_000 || age > 86_400_000)
          throw new BadRequestException('Submission expired');
        const contact = this.keys.encrypt(input.id, input.email, input.phone);
        await this.quota.take(this.keys.digest('source', source));
        await tx.studyLetter.create({
          data: {
            id: input.id,
            nickname: input.nickname,
            body: input.body,
            topic: input.topic,
            allowPublic: input.allowPublic,
            status: input.allowPublic ? 'pending' : 'private',
            contact,
            emailKey: this.keys.digest('email', email),
            claimDigest: input.claimDigest,
            fingerprint,
          },
        });
        return 'received';
      })
      .then((outcome) => {
        this.logger.log('letter-write ' + outcome);
        return receipt;
      })
      .catch((error) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        )
          throw new ConflictException('Submission conflict');
        if (error instanceof HttpException) throw error;
        // Prisma errors can contain submitted values. Keep them out of the global logger.
        throw new ServiceUnavailableException(
          'Mailbox temporarily unavailable',
        );
      });
  }
  async published(cursor?: string) {
    let before: Prisma.StudyLetterWhereInput | undefined;
    if (cursor) {
      if (typeof cursor !== 'string' || cursor.length > 100)
        throw new BadRequestException('Invalid cursor');
      const [timestamp, id, extra] = cursor.split('~');
      const date = new Date(timestamp);
      if (
        extra !== undefined ||
        !Number.isFinite(date.getTime()) ||
        date.toISOString() !== timestamp ||
        !/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id ?? '')
      )
        throw new BadRequestException('Invalid cursor');
      before = {
        OR: [
          { publishedAt: { lt: date } },
          { publishedAt: date, publicId: { lt: id } },
        ],
      };
    }
    const rows = await this.db.studyLetter.findMany({
      where: {
        status: 'published',
        allowPublic: true,
        deletedAt: null,
        ...before,
      },
      select: publicFields,
      orderBy: [{ publishedAt: 'desc' }, { publicId: 'desc' }],
      take: 21,
    });
    const items = rows.slice(0, 20);
    const last = items.at(-1);
    return {
      items,
      next:
        rows.length > 20 && last?.publishedAt
          ? last.publishedAt.toISOString() + '~' + last.publicId
          : null,
    };
  }
  async inbox(query: InboxQuery) {
    const where: Prisma.StudyLetterWhereInput = { deletedAt: null };
    if (query.filter === 'unread') where.readAt = null;
    else if (query.filter === 'handled') where.handledAt = { not: null };
    else if (query.filter) where.status = query.filter;
    if (query.email)
      where.emailKey = this.keys.digest('email', normalizeEmail(query.email));
    return this.db.studyLetter.findMany({
      where,
      select: safeSummary,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 40,
      ...(query.before ? { cursor: { id: query.before }, skip: 1 } : {}),
    });
  }
  async detail(id: string) {
    const row = await this.db.studyLetter.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...safeSummary,
        body: true,
        contact: true,
        reviewedAt: true,
        reviewedBy: true,
      },
    });
    if (!row?.contact) throw new NotFoundException();
    const { contact, ...fields } = row;
    return { ...fields, ...this.keys.decrypt(id, contact) };
  }
  private async journal(id: string, action: 'withdraw' | 'delete') {
    // Kept outside database backups. Replay before exposing a restored database.
    const path = this.config.get<string>('LETTERS_PRIVACY_JOURNAL');
    if (!path)
      throw new ServiceUnavailableException('Privacy journal unavailable');
    try {
      const file = await open(path, 'a', 0o600);
      try {
        await file.writeFile(
          JSON.stringify({ id, action, at: new Date().toISOString() }) + '\n',
        );
        await file.sync();
      } finally {
        await file.close();
      }
    } catch {
      throw new ServiceUnavailableException('Privacy journal unavailable');
    }
  }
  async update(id: string, action: string, actor: string) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${id}))`;
      const row = await tx.studyLetter.findUnique({
        where: { id },
        select: { status: true, allowPublic: true, deletedAt: true },
      });
      if (!row || row.deletedAt) throw new NotFoundException();
      const now = new Date();
      let data: Prisma.StudyLetterUpdateInput;
      if (action === 'read') data = { readAt: now };
      else if (action === 'handled') data = { readAt: now, handledAt: now };
      else if (action === 'delete') {
        await this.journal(id, 'delete');
        data = {
          deletedAt: now,
          status: 'deleted',
          allowPublic: false,
          publishedAt: null,
          nickname: null,
          body: null,
          contact: null,
          emailKey: null,
          claimDigest: null,
          fingerprint: null,
          visitorId: null,
          topic: null,
          reviewedAt: null,
          reviewedBy: null,
          handledAt: null,
          readAt: null,
        };
      } else {
        const transitions: Record<string, [string, string]> = {
          publish: ['pending', 'published'],
          decline: ['pending', 'declined'],
          withdraw: ['published', 'withdrawn'],
        };
        const transition = transitions[action];
        if (!row.allowPublic || !transition || row.status !== transition[0])
          throw new ConflictException('Invalid review transition');
        if (action === 'withdraw') await this.journal(id, 'withdraw');
        data = {
          status: transition[1],
          publishedAt: action === 'publish' ? now : null,
          reviewedAt: now,
          reviewedBy: actor,
        };
      }
      await tx.studyLetter.update({ where: { id }, data });
      return { ok: true };
    });
  }
}
