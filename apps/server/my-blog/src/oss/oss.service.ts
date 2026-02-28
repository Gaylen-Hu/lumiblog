import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import {
  GetOssSignatureDto,
  OssSignatureResponseDto,
  OssCallbackDto,
  OssCallbackResponseDto,
  FileCategory,
} from './dto';
import {
  OSS_SIGNATURE_EXPIRE,
  ALLOWED_FILE_TYPES,
  FILE_SIZE_LIMITS,
  UPLOAD_DIR_PREFIX,
} from './oss.constants';

@Injectable()
export class OssService {
  private readonly logger = new Logger(OssService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * 获取 OSS 直传签名
   */
  async getSignature(params: GetOssSignatureDto): Promise<OssSignatureResponseDto> {
    this.validateConfig();
    this.validateFile(params);

    const accessKeyId = this.configService.get<string>('OSS_ACCESS_KEY_ID')!;
    const accessKeySecret = this.configService.get<string>('OSS_ACCESS_KEY_SECRET')!;
    const bucket = this.configService.get<string>('OSS_BUCKET')!;
    const region = this.configService.get<string>('OSS_REGION')!;
    const endpoint = this.configService.get<string>(
      'OSS_ENDPOINT',
      `https://${bucket}.${region}.aliyuncs.com`,
    );
    const callbackUrl = this.configService.get<string>('OSS_CALLBACK_URL');

    const key = this.generateKey(params);
    const expire = Math.floor(Date.now() / 1000) + OSS_SIGNATURE_EXPIRE;
    const expireDate = new Date(expire * 1000).toISOString();

    // 构建 Policy
    const policy = {
      expiration: expireDate,
      conditions: [
        { bucket },
        ['eq', '$key', key],
        ['content-length-range', 0, this.getFileSizeLimit(params.category)],
      ],
    };

    const policyBase64 = Buffer.from(JSON.stringify(policy)).toString('base64');
    const signature = this.sign(policyBase64, accessKeySecret);

    const response: OssSignatureResponseDto = new OssSignatureResponseDto({
      host: endpoint,
      key,
      policy: policyBase64,
      signature,
      accessKeyId,
      expire,
      url: `${endpoint}/${key}`,
    });

    // 如果配置了回调 URL，添加回调参数
    if (callbackUrl) {
      const callback = {
        callbackUrl,
        callbackBody:
          'bucket=${bucket}&object=${object}&etag=${etag}&size=${size}&mimeType=${mimeType}',
        callbackBodyType: 'application/x-www-form-urlencoded',
      };
      response.callback = Buffer.from(JSON.stringify(callback)).toString('base64');
    }

    this.logger.log(`生成 OSS 签名成功: ${key}`);
    return response;
  }

  /**
   * 处理 OSS 上传回调
   */
  async handleCallback(params: OssCallbackDto): Promise<OssCallbackResponseDto> {
    const bucket = this.configService.get<string>('OSS_BUCKET')!;
    const region = this.configService.get<string>('OSS_REGION')!;
    const endpoint = this.configService.get<string>(
      'OSS_ENDPOINT',
      `https://${bucket}.${region}.aliyuncs.com`,
    );

    const url = `${endpoint}/${params.object}`;
    const filename = params.object.split('/').pop() ?? params.object;

    this.logger.log(`OSS 上传回调: ${params.object}, 大小: ${params.size}`);

    return new OssCallbackResponseDto({
      success: true,
      url,
      filename,
      size: params.size,
      mimeType: params.mimeType,
    });
  }

  /**
   * 批量获取签名
   */
  async getBatchSignatures(
    files: GetOssSignatureDto[],
  ): Promise<OssSignatureResponseDto[]> {
    return Promise.all(files.map((file) => this.getSignature(file)));
  }

  /**
   * 删除 OSS 对象
   */
  async deleteObject(objectKey: string): Promise<void> {
    this.validateConfig();

    const bucket = this.configService.get<string>('OSS_BUCKET')!;
    const region = this.configService.get<string>('OSS_REGION')!;
    const accessKeyId = this.configService.get<string>('OSS_ACCESS_KEY_ID')!;
    const accessKeySecret = this.configService.get<string>('OSS_ACCESS_KEY_SECRET')!;
    const endpoint = this.configService.get<string>(
      'OSS_ENDPOINT',
      `https://${bucket}.${region}.aliyuncs.com`,
    );

    const date = new Date().toUTCString();
    const canonicalResource = `/${bucket}/${objectKey}`;
    const stringToSign = `DELETE\n\n\n${date}\n${canonicalResource}`;
    const signature = this.sign(stringToSign, accessKeySecret);

    const url = `${endpoint}/${objectKey}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Date: date,
        Authorization: `OSS ${accessKeyId}:${signature}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(
        `OSS 对象删除失败: ${response.status} ${response.statusText}`,
      );
    }

    this.logger.log(`OSS 对象删除成功: ${objectKey}`);
  }

  /**
   * 验证 OSS 配置
   */
  private validateConfig(): void {
    const requiredKeys = [
      'OSS_ACCESS_KEY_ID',
      'OSS_ACCESS_KEY_SECRET',
      'OSS_BUCKET',
      'OSS_REGION',
    ];

    const missing = requiredKeys.filter(
      (key) => !this.configService.get<string>(key),
    );

    if (missing.length > 0) {
      throw new ServiceUnavailableException(
        `OSS 配置缺失: ${missing.join(', ')}`,
      );
    }
  }

  /**
   * 验证文件
   */
  private validateFile(params: GetOssSignatureDto): void {
    const category = this.detectCategory(params.mimeType, params.category);
    const allowedTypes = ALLOWED_FILE_TYPES[category];
    const sizeLimit = FILE_SIZE_LIMITS[category];

    if (!allowedTypes.includes(params.mimeType)) {
      throw new BadRequestException(
        `不支持的文件类型: ${params.mimeType}`,
      );
    }

    if (params.size > sizeLimit) {
      const limitMB = sizeLimit / (1024 * 1024);
      throw new BadRequestException(
        `文件大小超过限制，最大允许 ${limitMB}MB`,
      );
    }
  }

  /**
   * 检测文件类别
   */
  private detectCategory(
    mimeType: string,
    category?: FileCategory,
  ): keyof typeof ALLOWED_FILE_TYPES {
    if (category) return category;

    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  }

  /**
   * 生成文件存储路径
   */
  private generateKey(params: GetOssSignatureDto): string {
    const category = this.detectCategory(params.mimeType, params.category);
    const dirPrefix = params.directory ?? UPLOAD_DIR_PREFIX[category];

    const date = new Date();
    const datePath = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;

    const ext = this.getExtension(params.filename);
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const filename = `${uniqueId}${ext}`;

    return `${dirPrefix}/${datePath}/${filename}`;
  }

  /**
   * 获取文件扩展名
   */
  private getExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.slice(lastDot) : '';
  }

  /**
   * 获取文件大小限制
   */
  private getFileSizeLimit(category?: FileCategory): number {
    if (category) return FILE_SIZE_LIMITS[category];
    return Math.max(...Object.values(FILE_SIZE_LIMITS));
  }

  /**
   * 生成签名
   */
  private sign(content: string, secret: string): string {
    return createHmac('sha1', secret).update(content).digest('base64');
  }
}
