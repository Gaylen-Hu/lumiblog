import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';

export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export class CreateUserDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度至少为6位' })
  @MaxLength(32, { message: '密码长度不能超过32位' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  @MinLength(2, { message: '用户名长度至少为2位' })
  @MaxLength(50, { message: '用户名长度不能超过50位' })
  name: string;

  @IsOptional()
  @IsEnum(UserRole, { message: '角色必须是 admin、editor 或 viewer' })
  role?: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '头像URL长度不能超过200位' })
  avatar?: string;
}
