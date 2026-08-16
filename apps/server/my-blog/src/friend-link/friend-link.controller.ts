import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateFriendLinkDto, ReviewFriendLinkDto, UpdateFriendLinkDto } from './dto';
import { FriendLinkService } from './friend-link.service';

@Controller({ path: 'public/friend-links', version: '1' })
export class PublicFriendLinkController {
  constructor(private readonly service: FriendLinkService) {}
  @Get() findApproved() { return this.service.findApproved(); }
  @Post('applications') @Throttle({ short: { limit: 3, ttl: 600000 } })
  apply(@Body() dto: CreateFriendLinkDto) { return this.service.apply(dto); }
}

@Controller({ path: 'admin/friend-links', version: '1' })
@UseGuards(JwtAuthGuard)
export class FriendLinkController {
  constructor(private readonly service: FriendLinkService) {}
  @Get() findAll(@Query('status') status?: string) { return this.service.findAll(status); }
  @Post() create(@Body() dto: CreateFriendLinkDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateFriendLinkDto) { return this.service.update(id, dto); }
  @Post(':id/approve') approve(@Param('id') id: string, @Body() dto: ReviewFriendLinkDto) { return this.service.approve(id, dto.reviewNote); }
  @Post(':id/reject') reject(@Param('id') id: string, @Body() dto: ReviewFriendLinkDto) { return this.service.reject(id, dto.reviewNote); }
  @Post(':id/restore') restore(@Param('id') id: string) { return this.service.restore(id); }
  @Post(':id/check') check(@Param('id') id: string) { return this.service.check(id); }
  @Get(':id/checks') checks(@Param('id') id: string) { return this.service.checks(id); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
