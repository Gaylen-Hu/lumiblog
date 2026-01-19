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
  @IsOptional()
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: '密码长度至少为6位' })
  @MaxLength(32, { message: '密码长度不能超过32位' })
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: '用户名长度至少为2位' })
  @MaxLength(50, { message: '用户名长度不能超过50位' })
  name?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: '角色必须是 admin、editor 或 viewer' })
  role?: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '头像URL长度不能超过200位' })
  avatar?: string;
}
