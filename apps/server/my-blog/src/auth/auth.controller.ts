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
import { LoginDto, ProfileResponseDto } from './dto/login.dto';
import { RefreshTokenDto, TokenPairResponseDto } from './dto/refresh-token.dto';

@ApiTags('认证')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: '用户登录', description: '使用邮箱和密码登录，返回令牌对（access_token + refresh_token）' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: '登录成功', type: TokenPairResponseDto })
  @ApiResponse({ status: 401, description: '邮箱或密码错误' })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async login(@Request() req, @Body() _loginDto: LoginDto): Promise<TokenPairResponseDto> {
    return this.authService.login(req.user);
  }

  @ApiOperation({ summary: '刷新令牌', description: '使用 refresh_token 换取新的令牌对' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: '刷新成功', type: TokenPairResponseDto })
  @ApiResponse({ status: 401, description: 'refresh_token 无效、过期或已被使用' })
  @ApiResponse({ status: 429, description: '请求过于频繁' })
  @Post('refresh')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto): Promise<TokenPairResponseDto> {
    return this.authService.refreshTokens(dto.refresh_token);
  }

  @ApiOperation({ summary: '用户登出', description: '撤销当前用户的所有 refresh_token' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 200, description: '登出成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req): Promise<{ message: string }> {
    await this.authService.logout(req.user.userId);
    return { message: '登出成功' };
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
