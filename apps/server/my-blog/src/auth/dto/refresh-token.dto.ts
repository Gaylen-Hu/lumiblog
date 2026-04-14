import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: '刷新令牌' })
  @IsString()
  @IsNotEmpty({ message: 'refresh_token 不能为空' })
  refresh_token: string;
}

export class UserInfoDto {
  @ApiProperty({ description: '用户 ID', example: 'clxxx...' })
  id: string;

  @ApiProperty({ description: '用户邮箱', example: 'admin@example.com' })
  email: string;

  @ApiProperty({ description: '用户名', example: 'Admin' })
  name: string;
}

export class TokenPairResponseDto {
  @ApiProperty({
    description: 'JWT 访问令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({ description: '刷新令牌' })
  refresh_token: string;

  @ApiProperty({ description: '用户信息', type: UserInfoDto })
  user: UserInfoDto;
}
