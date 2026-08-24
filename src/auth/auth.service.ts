import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { User } from 'generated/prisma/client';
import { Role } from 'generated/prisma/enums';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenService } from './refresh-token.service';
import { SignInDto } from './dto/login.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private refreshTokenService: RefreshTokenService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async login(data: SignInDto) {
    const user = await this.validateUser(data.email, data.password);

    const accessToken = this.generateAccessToken({
      email: user.email,
      id: user.id,
      role: user.role,
    });

    const refreshToken = await this.refreshTokenService.generateRefreshToken(
      user.id,
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      accessToken,
      refreshToken,
      user: userWithoutPassword,
    };
  }

  async register(data: RegisterDto) {
    this.validateUserRole(data);
    await this.userService.create(data, data.organizer);
    return this.login({ email: data.email, password: data.password });
  }

  async delete(userId: string) {
    return this.userService.deleteUser(userId);
  }

  private validateUserRole(data: RegisterDto) {
    if (data.role === 'ORGANIZER' && !data.organizer) {
      throw new BadRequestException('Must have organizer data');
    }

    if (data.role === 'BUYER' && data.organizer) {
      throw new BadRequestException('Cannot be a organizer');
    }
  }

  async refreshTokens(refreshToken: string) {
    const { userId } =
      await this.refreshTokenService.validateRefreshToken(refreshToken);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    await this.refreshTokenService.revokeRefreshToken(refreshToken);

    const accessToken = this.generateAccessToken(user);
    const newRefreshToken = await this.refreshTokenService.generateRefreshToken(
      user.id,
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokenService.revokeRefreshToken(refreshToken);
  }

  private generateAccessToken(user: {
    id: string;
    email: string;
    role: Role;
  }): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }
}
