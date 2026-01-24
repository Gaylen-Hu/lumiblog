import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { UserRole } from './create-user.dto';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: '用户邮箱',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email?: string;

  @ApiPropertyOptional({
    description: '用户密码',
    example: 'newpassword123',
    minLength: 6,
    maxLength: 32,
  })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: '密码长度至少为6位' })
  @MaxLength(32, { message: '密码长度不能超过32位' })
  password?: string;

  @ApiPropertyOptional({
    description: '用户名',
    example: '李四',
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: '用户名长度至少为2位' })
  @MaxLength(50, { message: '用户名长度不能超过50位' })
  name?: string;

  @ApiPropertyOptional({
    description: '用户角色',
    enum: UserRole,
    example: 'EDITOR',
  })
  @IsOptional()
  @IsEnum(UserRole, { message: '角色必须是 admin、editor 或 viewer' })
  role?: UserRole;

  @ApiPropertyOptional({
    description: '用户头像 URL',
    example: 'https://example.com/avatar.jpg',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '头像URL长度不能超过200位' })
  avatar?: string;
}
