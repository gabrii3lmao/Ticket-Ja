import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class RefreshTokenService {
  private readonly DAY = 24 * 60 * 60 * 1000;
  private readonly HOUR = 60 * 60 * 1000;
  private readonly MINUTE = 60 * 1000;
  private readonly SECOND = 1000;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async generateRefreshToken(userId: string): Promise<string> {
    const expiresIn = this.configService.get<JwtSignOptions['expiresIn']>(
      'JWT_REFRESH_EXPIRATION',
      '7d',
    );
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');

    const token = this.jwtService.sign({ sub: userId }, { secret, expiresIn });

    const expiresAt = this.calculateExpiration(expiresIn as string);

    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });

    return token;
  }

  async validateRefreshToken(token: string): Promise<{ userId: string }> {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');

    try {
      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret,
      });
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Refresh token not found');
      }

      if (storedToken.expiresAt < new Date()) {
        await this.prisma.refreshToken.delete({
          where: { id: storedToken.id },
        });
        throw new UnauthorizedException('Refresh token expired');
      }

      return { userId: payload.sub };
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { token },
    });
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  private calculateExpiration(expiresIn: string): Date {
    const now = new Date();
    const match = expiresIn.match(/^(\d+)([smhd])$/);

    if (!match) {
      return new Date(now.getTime() + 7 * this.DAY); // seven days
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return new Date(now.getTime() + value * this.SECOND);
      case 'm':
        return new Date(now.getTime() + value * this.MINUTE);
      case 'h':
        return new Date(now.getTime() + value * this.HOUR);
      case 'd':
        return new Date(now.getTime() + value * this.DAY);
      default:
        return new Date(now.getTime() + 7 * this.DAY);
    }
  }
}
