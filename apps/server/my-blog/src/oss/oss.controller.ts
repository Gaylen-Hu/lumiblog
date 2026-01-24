import {
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OssService } from './oss.service';
import {
  GetOssSignatureDto,
  OssSignatureResponseDto,
  OssCallbackDto,
  OssCallbackResponseDto,
} from './dto';

@Controller({ path: 'oss', version: '1' })
export class OssController {
  constructor(private readonly ossService: OssService) {}

  /**
   * 获取 OSS 直传签名（需要登录）
   */
  @Post('signature')
  @UseGuards(JwtAuthGuard)
  async getSignature(
    @Body() dto: GetOssSignatureDto,
  ): Promise<OssSignatureResponseDto> {
    return this.ossService.getSignature(dto);
  }

  /**
   * 批量获取签名（需要登录）
   */
  @Post('signatures')
  @UseGuards(JwtAuthGuard)
  async getBatchSignatures(
    @Body() files: GetOssSignatureDto[],
  ): Promise<OssSignatureResponseDto[]> {
    return this.ossService.getBatchSignatures(files);
  }

  /**
   * OSS 上传回调（无需登录，由 OSS 服务器调用）
   */
  @Post('callback')
  async handleCallback(
    @Body() dto: OssCallbackDto,
  ): Promise<OssCallbackResponseDto> {
    return this.ossService.handleCallback(dto);
  }
}
