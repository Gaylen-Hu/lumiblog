import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export { UserRole };

export class CreateUserDto {
  @ApiProperty({
    description: '用户邮箱',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @ApiProperty({
    description: '用户密码',
    example: 'password123',
    minLength: 6,
    maxLength: 32,
  })
  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度至少为6位' })
  @MaxLength(32, { message: '密码长度不能超过32位' })
  password: string;

  @ApiProperty({
    description: '用户名',
    example: '张三',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  @MinLength(2, { message: '用户名长度至少为2位' })
  @MaxLength(50, { message: '用户名长度不能超过50位' })
  name: string;

  @ApiPropertyOptional({
    description: '用户角色',
    enum: UserRole,
    example: 'EDITOR',
  })
  @IsOptional()
  @IsEnum(UserRole, { message: '角色必须是 ADMIN、EDITOR 或 VIEWER' })
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
