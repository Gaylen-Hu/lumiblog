import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Ip,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';
import {
  InboxQuery,
  LetterAction,
  LettersService,
  SendLetter,
} from './letters.service';
import { LetterKeys } from './letter-security';
import { LetterQuota } from './letter-quota';

@Controller({ path: 'public/letters', version: '1' })
class PublicLetters {
  constructor(private readonly letters: LettersService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Query('cursor') cursor?: string) {
    return this.letters.published(cursor);
  }
  @Post()
  @Header('Cache-Control', 'no-store')
  send(@Body() dto: SendLetter, @Ip() ip: string) {
    return this.letters.send(dto, ip);
  }
}
@Controller({ path: 'admin/letters', version: '1' })
@UseGuards(AuthGuard('jwt'), AdminRoleGuard)
class AdminLetters {
  constructor(private readonly letters: LettersService) {}
  // Search terms may contain contact details; keep them out of access-log URLs.
  @Post('search')
  @Header('Cache-Control', 'private, no-store')
  inbox(@Body() dto: InboxQuery) {
    return this.letters.inbox(dto);
  }
  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.letters.detail(id);
  }
  @Patch(':id') action(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LetterAction,
    @Req() req: { user: { userId: string } },
  ) {
    return this.letters.update(id, dto.action, req.user.userId);
  }
  @Delete(':id') remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.letters.update(id, 'delete', req.user.userId);
  }
}
@Module({
  controllers: [PublicLetters, AdminLetters],
  providers: [LettersService, LetterKeys, LetterQuota, AdminRoleGuard],
})
export class LettersModule {}
