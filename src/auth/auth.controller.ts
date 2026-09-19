import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { Role } from 'generated/prisma/enums';
import { RegisterDto } from './dto/register.dto';
import { SubmitOrganizerApplicationDto } from './dto/organizer-application.dto';
import { SignInDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  CurrentUser,
  type UserPayload,
} from './decorators/current-user.decorator';
import { ActiveUserPipe } from './pipes/active-user.pipe';
import { Throttle } from '@nestjs/throttler';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @Throttle({ short: { limit: 3, ttl: 1000 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  register(@Body() data: RegisterDto) {
    return this.authService.register(data);
  }

  @Public()
  @Post('signin')
  @Throttle({ short: { limit: 3, ttl: 1000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiResponse({ status: 200, description: 'Returns JWT access token' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async signIn(@Body() data: SignInDto) {
    return this.authService.login(data);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Returns new token pair' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  refresh(@Body() data: RefreshTokenDto) {
    return this.authService.refreshTokens(data.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke refresh token (logout)' })
  @ApiResponse({ status: 204, description: 'Refresh token revoked' })
  async logout(@Body() data: RefreshTokenDto) {
    await this.authService.logout(data.refreshToken);
  }

  @Delete('account')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete own account' })
  @ApiResponse({ status: 204, description: 'Account deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  delete(@CurrentUser(ActiveUserPipe) user: UserPayload) {
    return this.authService.delete(user.id);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user' })
  @ApiResponse({ status: 200, description: 'Returns the current user' })
  me(@CurrentUser(ActiveUserPipe) user: UserPayload) {
    return this.authService.me(user.id);
  }

  @Get('organizer-application')
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get the authenticated user's organizer application",
  })
  @ApiResponse({ status: 200, description: 'Returns the application or null' })
  getMyOrganizerApplication(@CurrentUser(ActiveUserPipe) user: UserPayload) {
    return this.authService.getMyOrganizerApplication(user.id);
  }

  @Post('organizer-application')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(Role.BUYER)
  @ApiOperation({ summary: 'Submit or resubmit an organizer application' })
  @ApiResponse({ status: 200, description: 'Application submitted' })
  @ApiResponse({ status: 409, description: 'Application already exists' })
  submitOrganizerApplication(
    @Body() data: SubmitOrganizerApplicationDto,
    @CurrentUser(ActiveUserPipe) user: UserPayload,
  ) {
    return this.authService.submitOrganizerApplication(user, data);
  }
}
