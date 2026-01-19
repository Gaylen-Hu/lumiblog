import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

/**
 * 请求上下文数据
 */
export interface RequestContextData {
  readonly requestId: string;
  readonly userId?: string;
  readonly ip: string;
  readonly userAgent: string;
  readonly path: string;
  readonly method: string;
}

/**
 * 请求上下文服务
 * 提供当前请求的上下文信息
 */
@Injectable({ scope: Scope.REQUEST })
export class RequestContextService {
  private readonly contextData: RequestContextData;

  constructor(@Inject(REQUEST) request: Request) {
    this.contextData = {
      requestId: this.generateRequestId(),
      userId: this.extractUserId(request),
      ip: this.extractIp(request),
      userAgent: request.headers['user-agent'] || '',
      path: request.path,
      method: request.method,
    };
  }

  /**
   * 获取请求 ID
   */
  getRequestId(): string {
    return this.contextData.requestId;
  }

  /**
   * 获取用户 ID
   */
  getUserId(): string | undefined {
    return this.contextData.userId;
  }

  /**
   * 获取客户端 IP
   */
  getIp(): string {
    return this.contextData.ip;
  }

  /**
   * 获取完整上下文数据
   */
  getContext(): RequestContextData {
    return this.contextData;
  }

  /**
   * 生成请求 ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 提取用户 ID
   */
  private extractUserId(request: Request): string | undefined {
    const user = request.user as { id?: string } | undefined;
    return user?.id;
  }

  /**
   * 提取客户端 IP
   */
  private extractIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || '';
  }
}
