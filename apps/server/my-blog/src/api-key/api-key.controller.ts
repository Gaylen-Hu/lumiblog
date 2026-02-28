import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyDto, ApiKeyResponseDto, CreateApiKeyResponseDto } from './dto/api-key.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest {
  user: { userId: string; email: string };
}

@ApiTags('API Key 管理')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'api-keys', version: '1' })
@UseGuards(JwtAuthGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @ApiOperation({ summary: '生成 API Key', description: '生成一个永久有效的 API Key，完整 Key 仅返回一次' })
  @ApiResponse({ status: 201, description: '创建成功', type: CreateApiKeyResponseDto })
  @Post()
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateApiKeyDto,
  ): Promise<CreateApiKeyResponseDto> {
    return this.apiKeyService.create(req.user.userId, dto);
  }

  @ApiOperation({ summary: '获取 API Key 列表', description: '获取当前用户的所有 API Key' })
  @ApiResponse({ status: 200, description: '获取成功', type: [ApiKeyResponseDto] })
  @Get()
  async findAll(@Request() req: AuthenticatedRequest): Promise<ApiKeyResponseDto[]> {
    return this.apiKeyService.findAllByUser(req.user.userId);
  }

  @ApiOperation({ summary: '撤销 API Key', description: '撤销指定的 API Key，撤销后不可恢复' })
  @ApiParam({ name: 'id', description: 'API Key ID' })
  @ApiResponse({ status: 200, description: '撤销成功', type: ApiKeyResponseDto })
  @ApiResponse({ status: 404, description: 'API Key 不存在' })
  @Patch(':id/revoke')
  async revoke(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<ApiKeyResponseDto> {
    return this.apiKeyService.revoke(req.user.userId, id);
  }

  @ApiOperation({ summary: '删除 API Key', description: '永久删除指定的 API Key' })
  @ApiParam({ name: 'id', description: 'API Key ID' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 404, description: 'API Key 不存在' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    await this.apiKeyService.delete(req.user.userId, id);
  }
}
