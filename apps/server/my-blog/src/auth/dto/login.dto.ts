import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: '用户邮箱',
    example: 'admin@example.com',
  })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @ApiProperty({
    description: '用户密码',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度至少为6位' })
  password: string;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT 访问令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;
}

export class ProfileResponseDto {
  @ApiProperty({ description: '用户 ID', example: 'clxxx...' })
  userId: string;

  @ApiProperty({ description: '用户邮箱', example: 'admin@example.com' })
  email: string;

  @ApiProperty({ description: '用户名', example: 'Admin' })
  name: string;

  @ApiProperty({ description: '用户角色', example: 'ADMIN' })
  role: string;
}
