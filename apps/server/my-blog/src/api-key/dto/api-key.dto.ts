import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ description: 'API Key 名称', example: 'My Integration' })
  @IsString()
  @IsNotEmpty({ message: 'API Key 名称不能为空' })
  @MaxLength(100, { message: '名称长度不能超过 100 个字符' })
  name: string;
}

export class ApiKeyResponseDto {
  @ApiProperty({ description: 'API Key ID' })
  id: string;

  @ApiProperty({ description: 'API Key 名称' })
  name: string;

  @ApiProperty({ description: 'Key 前缀（用于识别）', example: 'sk-abc1****' })
  keyPrefix: string;

  @ApiProperty({ description: '所属用户 ID' })
  userId: string;

  @ApiPropertyOptional({ description: '最后使用时间' })
  lastUsedAt: Date | null;

  @ApiProperty({ description: '是否已撤销' })
  isRevoked: boolean;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;
}

export class CreateApiKeyResponseDto extends ApiKeyResponseDto {
  @ApiProperty({
    description: '完整的 API Key（仅在创建时返回一次）',
    example: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  })
  key: string;
}
