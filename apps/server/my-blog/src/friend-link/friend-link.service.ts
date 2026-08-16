import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { FriendLink, FriendLinkStatus, Prisma } from '@prisma/client';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFriendLinkDto, UpdateFriendLinkDto } from './dto';

const OUR_HOSTS = new Set(['new-universe.cn', 'www.new-universe.cn']);
const CHECK_INTERVAL = 24 * 60 * 60 * 1000;
const GRACE_PERIOD = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class FriendLinkService implements OnModuleInit {
  private readonly logger = new Logger(FriendLinkService.name);
  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    const timer = setInterval(() => this.runDailyCheck().catch((error) => this.logger.error(error)), CHECK_INTERVAL);
    timer.unref();
    void this.runDailyCheck();
  }

  async apply(dto: CreateFriendLinkDto) {
    await this.assertSafeUrl(dto.siteUrl);
    await this.assertSafeUrl(dto.reciprocalUrl);
    const siteUrl = this.normaliseUrl(dto.siteUrl);
    const exists = await this.prisma.friendLink.findUnique({ where: { siteUrl } });
    if (exists) throw new ConflictException('This website has already submitted a friend-link application.');
    return this.prisma.friendLink.create({ data: { ...dto, siteUrl, reciprocalUrl: this.normaliseUrl(dto.reciprocalUrl) } });
  }

  async create(dto: CreateFriendLinkDto) { return this.apply(dto); }

  async findApproved() {
    return this.prisma.friendLink.findMany({
      where: { status: FriendLinkStatus.APPROVED },
      select: { id: true, siteName: true, siteUrl: true, description: true, createdAt: true },
      orderBy: { approvedAt: 'desc' },
    });
  }

  async findAll(status?: string) {
    const where: Prisma.FriendLinkWhereInput = Object.values(FriendLinkStatus).includes(status as FriendLinkStatus)
      ? { status: status as FriendLinkStatus } : {};
    return this.prisma.friendLink.findMany({ where, include: { checks: { orderBy: { checkedAt: 'desc' }, take: 1 } }, orderBy: { updatedAt: 'desc' } });
  }

  async update(id: string, dto: UpdateFriendLinkDto) {
    await this.require(id);
    if (dto.siteUrl) await this.assertSafeUrl(dto.siteUrl);
    if (dto.reciprocalUrl) await this.assertSafeUrl(dto.reciprocalUrl);
    const { siteUrl, reciprocalUrl, ...rest } = dto;
    return this.prisma.friendLink.update({ where: { id }, data: { ...rest, ...(siteUrl ? { siteUrl: this.normaliseUrl(siteUrl) } : {}), ...(reciprocalUrl ? { reciprocalUrl: this.normaliseUrl(reciprocalUrl) } : {}) } });
  }

  async approve(id: string, reviewNote?: string) {
    await this.require(id);
    return this.prisma.friendLink.update({ where: { id }, data: { status: FriendLinkStatus.APPROVED, reviewNote, approvedAt: new Date(), removedAt: null } });
  }

  async reject(id: string, reviewNote?: string) {
    await this.require(id);
    return this.prisma.friendLink.update({ where: { id }, data: { status: FriendLinkStatus.REJECTED, reviewNote } });
  }

  async remove(id: string) {
    await this.require(id);
    return this.prisma.friendLink.update({ where: { id }, data: { status: FriendLinkStatus.REMOVED, removedAt: new Date() } });
  }

  async restore(id: string) {
    await this.require(id);
    return this.prisma.friendLink.update({ where: { id }, data: { status: FriendLinkStatus.PENDING, removedAt: null, reviewNote: null, approvedAt: null } });
  }

  async checks(id: string) {
    await this.require(id);
    return this.prisma.friendLinkCheck.findMany({ where: { friendLinkId: id }, orderBy: { checkedAt: 'desc' }, take: 30 });
  }

  async check(id: string) { return this.checkLink(await this.require(id)); }

  private async runDailyCheck() {
    const cutoff = new Date(Date.now() - GRACE_PERIOD);
    const links = await this.prisma.friendLink.findMany({ where: { status: FriendLinkStatus.APPROVED, approvedAt: { lte: cutoff } } });
    for (const link of links) {
      const result = await this.checkLink(link);
      if (!result.passed) await this.prisma.friendLink.update({ where: { id: link.id }, data: { status: FriendLinkStatus.REMOVED, removedAt: new Date() } });
    }
  }

  private async checkLink(link: FriendLink) {
    let passed = false; let statusCode: number | undefined; let message = ''; let foundUrl: string | undefined;
    try {
      let url = link.reciprocalUrl;
      for (let redirects = 0; redirects <= 3; redirects += 1) {
        await this.assertSafeUrl(url);
        const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'ByteBeyond-FriendLink-Checker/1.0 (+https://www.new-universe.cn/links)' } });
        statusCode = response.status;
        if (response.status >= 300 && response.status < 400 && response.headers.get('location')) { url = new URL(response.headers.get('location')!, url).toString(); continue; }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = (await response.text()).slice(0, 1_000_000);
        const hrefs = html.matchAll(/<a\\b[^>]*\\bhref\\s*=\\s*["']([^"']+)["'][^>]*>/gi);
        for (const match of hrefs) {
          const candidate = new URL(match[1], url);
          if (OUR_HOSTS.has(candidate.hostname.toLowerCase())) { passed = true; foundUrl = candidate.toString(); break; }
        }
        message = passed ? 'Reciprocal link found.' : 'No link to new-universe.cn was found on the submitted page.';
        break;
      }
    } catch (error) { message = error instanceof Error ? error.message : 'Request failed'; }
    const checkedAt = new Date();
    await this.prisma.$transaction([
      this.prisma.friendLinkCheck.create({ data: { friendLinkId: link.id, passed, statusCode, message, foundUrl } }),
      this.prisma.friendLink.update({ where: { id: link.id }, data: { lastCheckedAt: checkedAt, lastCheckPassed: passed } }),
    ]);
    return { passed, statusCode, message, foundUrl, checkedAt };
  }

  private async require(id: string) { const link = await this.prisma.friendLink.findUnique({ where: { id } }); if (!link) throw new NotFoundException('Friend link not found.'); return link; }
  private normaliseUrl(value: string) { const url = new URL(value); url.hash = ''; return url.toString(); }
  private async assertSafeUrl(value: string) {
    let url: URL; try { url = new URL(value); } catch { throw new BadRequestException('Invalid URL.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new BadRequestException('Only public HTTP(S) URLs are allowed.');
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local')) throw new BadRequestException('Private addresses are not allowed.');
    const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
    if (addresses.some(({ address }) => this.isPrivateIp(address))) throw new BadRequestException('Private addresses are not allowed.');
  }
  private isPrivateIp(ip: string) {
    if (ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:')) return true;
    if (isIP(ip) !== 4) return false;
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
}
