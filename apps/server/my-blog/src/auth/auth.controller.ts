import {
  Controller,
  Post,
  UseGuards,
  Request,
  Body,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto, LoginResponseDto, ProfileResponseDto } from './dto/login.dto';

@ApiTags('认证')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: '用户登录', description: '使用邮箱和密码登录，返回 JWT Token' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: '登录成功', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: '邮箱或密码错误' })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async login(@Request() req, @Body() _loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(req.user);
  }

  @ApiOperation({ summary: '获取当前用户信息', description: '获取当前登录用户的基本信息' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 200, description: '获取成功', type: ProfileResponseDto })
  @ApiResponse({ status: 401, description: '未授权' })
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req): ProfileResponseDto {
    return req.user;
  }
}
