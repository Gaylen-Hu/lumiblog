import { PartialType } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { FriendLinkStatus } from '@prisma/client';

export class CreateFriendLinkDto {
  @IsString() @IsNotEmpty() @MaxLength(120) siteName: string;
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }) @MaxLength(500) siteUrl: string;
  @Transform(({ value }) => typeof value === 'string' && !value.trim() ? undefined : value) @IsOptional() @IsUrl({ protocols: ['http', 'https'], require_protocol: true }) @MaxLength(500) logoUrl?: string;
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }) @MaxLength(500) reciprocalUrl: string;
  @Transform(({ value }) => typeof value === 'string' && !value.trim() ? undefined : value) @IsOptional() @IsUrl({ protocols: ['http', 'https'], require_protocol: true }) @MaxLength(500) rssUrl?: string;
  @IsString() @IsNotEmpty() @MaxLength(500) description: string;
  @Transform(({ value }) => typeof value === 'string' && !value.trim() ? undefined : value) @IsOptional() @IsEmail() @MaxLength(254) contactEmail?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(5) @IsString({ each: true }) @MaxLength(32, { each: true }) tags?: string[];
  @Transform(({ value }) => typeof value === 'string' && !value.trim() ? undefined : value) @IsOptional() @IsString() @MaxLength(32) language?: string;
  @Transform(({ value }) => typeof value === 'string' && !value.trim() ? undefined : value) @IsOptional() @IsUrl({ protocols: ['http', 'https'], require_protocol: true }) @MaxLength(500) githubUrl?: string;
  @Transform(({ value }) => typeof value === 'string' && !value.trim() ? undefined : value) @IsOptional() @IsUrl({ protocols: ['http', 'https'], require_protocol: true }) @MaxLength(500) socialUrl?: string;
}

export class UpdateFriendLinkDto extends PartialType(CreateFriendLinkDto) {
  @IsOptional() @IsEnum(FriendLinkStatus) status?: FriendLinkStatus;
  @IsOptional() @IsString() @MaxLength(500) reviewNote?: string;
}

export class ReviewFriendLinkDto {
  @IsOptional() @IsString() @MaxLength(500) reviewNote?: string;
}
