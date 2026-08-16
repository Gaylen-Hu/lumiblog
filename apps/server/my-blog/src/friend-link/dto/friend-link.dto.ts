import { PartialType } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { FriendLinkStatus } from '@prisma/client';

export class CreateFriendLinkDto {
  @IsString() @IsNotEmpty() @MaxLength(120) siteName: string;
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }) @MaxLength(500) siteUrl: string;
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }) @MaxLength(500) reciprocalUrl: string;
  @IsString() @IsNotEmpty() @MaxLength(500) description: string;
  @IsOptional() @IsEmail() @MaxLength(254) contactEmail?: string;
}

export class UpdateFriendLinkDto extends PartialType(CreateFriendLinkDto) {
  @IsOptional() @IsEnum(FriendLinkStatus) status?: FriendLinkStatus;
  @IsOptional() @IsString() @MaxLength(500) reviewNote?: string;
}

export class ReviewFriendLinkDto {
  @IsOptional() @IsString() @MaxLength(500) reviewNote?: string;
}
