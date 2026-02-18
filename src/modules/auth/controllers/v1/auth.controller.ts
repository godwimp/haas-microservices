import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from '../../auth.service';
import { LoginDto } from '../../core/dto/login.dto';
import { RegisterDto } from '../../core/dto/register.dto';
import { AuthResponseDto } from '../../core/dto/auth-response.dto';
import { Public } from '@common/decorators/public.decorator';
import { ApiSuccessResponse } from '@common/decorators/api-response.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';

@ApiTags('Authentication')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'auth', version: '1' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiSuccessResponse(AuthResponseDto)
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'User registration' })
  @ApiSuccessResponse(AuthResponseDto)
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }
}
