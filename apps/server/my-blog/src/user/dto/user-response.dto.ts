import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

/**
 * 用户响应 DTO
 */
export class UserResponseDto {
  @ApiProperty({ description: '用户 ID', example: 'clxxx...' })
  id: string;

  @ApiProperty({ description: '用户邮箱', example: 'admin@example.com' })
  email: string;

  @ApiProperty({ description: '用户名', example: 'Admin' })
  name: string;

  @ApiProperty({ description: '用户角色', enum: UserRole, example: 'ADMIN' })
  role: UserRole;

  @ApiPropertyOptional({ description: '用户头像', example: 'https://example.com/avatar.jpg' })
  avatar: string | null;

  @ApiProperty({ description: '创建时间', example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间', example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
