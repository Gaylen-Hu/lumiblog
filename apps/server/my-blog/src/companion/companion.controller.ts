import { Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CompanionService } from './companion.service';

@ApiTags('猫咪陪伴')
@Controller({ path: 'public/companion', version: '1' })
export class CompanionController {
  constructor(private readonly companion: CompanionService) {}

  @Get('status')
  @ApiOperation({ summary: '猫咪聊天可用状态（不创建访客会话）' })
  status(@Req() req: Request, @Res() res: Response) {
    return this.companion.handle(req, res);
  }

  @Post('sessions')
  @HttpCode(200)
  @ApiOperation({ summary: '建立当前访客的猫咪会话' })
  @ApiConsumes('application/json')
  @ApiBody({ schema: { type: 'object', additionalProperties: false } })
  sessions(@Req() req: Request, @Res() res: Response) {
    return this.companion.handle(req, res);
  }

  @Post('chat')
  @HttpCode(200)
  @ApiOperation({ summary: '流式聊天与受限动作计划（NDJSON）' })
  @ApiConsumes('application/json')
  @ApiProduces('application/x-ndjson')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['sessionId', 'turnId', 'message'],
      properties: {
        sessionId: { type: 'string', format: 'uuid' },
        turnId: { type: 'string', format: 'uuid' },
        message: { type: 'string', maxLength: 2000 },
        state: { type: 'object' },
        capabilities: { type: 'object' },
        context: {
          type: 'object',
          additionalProperties: false,
          description:
            '公开文章标识及选文、当前访客房间状态；不接受文章正文或 URL',
          properties: {
            article: {
              type: 'object',
              additionalProperties: false,
              required: ['slug', 'locale'],
              properties: {
                slug: { type: 'string', maxLength: 220 },
                locale: { type: 'string', enum: ['zh', 'en'] },
                title: { type: 'string', maxLength: 240 },
                selection: { type: 'string', maxLength: 1000 },
                selectionHeading: { type: 'string', maxLength: 240 },
              },
            },
            room: {
              type: 'object',
              additionalProperties: false,
              required: ['ceilingOn', 'lampOn', 'curtainsClosed'],
              properties: {
                ceilingOn: { type: 'boolean' },
                lampOn: { type: 'boolean' },
                curtainsClosed: { type: 'boolean' },
              },
            },
          },
        },
        lastAction: { type: 'object', nullable: true },
      },
    },
  })
  chat(@Req() req: Request, @Res() res: Response) {
    return this.companion.handle(req, res);
  }

  @Post('result')
  @HttpCode(200)
  @ApiOperation({ summary: '确认真实执行结果，不重新执行动作' })
  @ApiConsumes('application/json')
  result(@Req() req: Request, @Res() res: Response) {
    return this.companion.handle(req, res);
  }

  @Post('cancel')
  @HttpCode(200)
  @ApiOperation({ summary: '取消当前访客的在途回复或动作计划' })
  @ApiConsumes('application/json')
  cancel(@Req() req: Request, @Res() res: Response) {
    return this.companion.handle(req, res);
  }

  @Post('clear')
  @HttpCode(200)
  @ApiOperation({ summary: '清空当前会话，保留调用额度' })
  @ApiConsumes('application/json')
  clear(@Req() req: Request, @Res() res: Response) {
    return this.companion.handle(req, res);
  }
}
