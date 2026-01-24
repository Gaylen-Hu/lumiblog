import {
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OssService } from './oss.service';
import {
  GetOssSignatureDto,
  OssSignatureResponseDto,
  OssCallbackDto,
  OssCallbackResponseDto,
} from './dto';

@ApiTags('OSS')
@Controller({ path: 'oss', version: '1' })
export class OssController {
  constructor(private readonly ossService: OssService) {}

  @ApiOperation({ summary: '获取 OSS 直传签名', description: '获取阿里云 OSS 直传签名，用于前端直接上传文件到 OSS' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 200, description: '获取成功', type: OssSignatureResponseDto })
  @ApiResponse({ status: 400, description: '参数错误' })
  @Post('signature')
  @UseGuards(JwtAuthGuard)
  async getSignature(
    @Body() dto: GetOssSignatureDto,
  ): Promise<OssSignatureResponseDto> {
    return this.ossService.getSignature(dto);
  }

  @ApiOperation({ summary: '批量获取 OSS 签名', description: '批量获取多个文件的 OSS 直传签名' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 200, description: '获取成功', type: [OssSignatureResponseDto] })
  @ApiResponse({ status: 400, description: '参数错误' })
  @Post('signatures')
  @UseGuards(JwtAuthGuard)
  async getBatchSignatures(
    @Body() files: GetOssSignatureDto[],
  ): Promise<OssSignatureResponseDto[]> {
    return this.ossService.getBatchSignatures(files);
  }

  @ApiOperation({ summary: 'OSS 上传回调', description: 'OSS 上传完成后的回调接口（由 OSS 服务器调用，无需登录）' })
  @ApiResponse({ status: 200, description: '回调处理成功', type: OssCallbackResponseDto })
  @Post('callback')
  async handleCallback(
    @Body() dto: OssCallbackDto,
  ): Promise<OssCallbackResponseDto> {
    return this.ossService.handleCallback(dto);
  }
}
