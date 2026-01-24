import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from './create-user.dto';
import { UserResponseDto } from './user-response.dto';

export class QueryUserDto {
  @ApiPropertyOptional({
    description: '搜索关键词（用户名或邮箱）',
    example: 'admin',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: '用户角色筛选',
    enum: UserRole,
    example: 'ADMIN',
  })
  @IsOptional()
  @IsEnum(UserRole, { message: '角色必须是 admin、editor 或 viewer' })
  role?: UserRole;

  @ApiPropertyOptional({
    description: '页码',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class PaginatedUserListDto {
  @ApiProperty({ description: '用户列表', type: [UserResponseDto] })
  data: UserResponseDto[];

  @ApiProperty({ description: '总数', example: 100 })
  total: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页数量', example: 10 })
  limit: number;
}
