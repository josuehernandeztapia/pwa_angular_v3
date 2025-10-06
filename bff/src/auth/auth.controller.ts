import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
  Headers,
  UnauthorizedException
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Headers('authorization') authorization: string): Promise<AuthResponseDto> {
    if (!authorization) {
      throw new UnauthorizedException('Token de refresh requerido');
    }

    const token = authorization.replace('Bearer ', '');
    return this.authService.refreshToken(token);
  }

  @Get('demo-users')
  async getDemoUsers() {
    return {
      users: this.authService.getDemoUsers(),
      message: 'Usuarios demo disponibles para testing'
    };
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateToken(@Headers('authorization') authorization: string) {
    if (!authorization) {
      throw new UnauthorizedException('Token requerido');
    }

    const token = authorization.replace('Bearer ', '');
    const payload = await this.authService.validateToken(token);

    return {
      valid: true,
      payload
    };
  }
}