import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { User } from 'generated/prisma/client';
import { Role } from 'generated/prisma/enums';
import { RegisterDto } from './dto/register.dto';
import { SubmitOrganizerApplicationDto } from './dto/organizer-application.dto';
import { RefreshTokenService } from './refresh-token.service';
import { SignInDto } from './dto/login.dto';
import { PrismaService } from 'src/prisma.service';
import type { UserPayload } from './decorators/current-user.decorator';

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

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getMyOrganizerApplication(userId: string) {
    return this.userService.findOrganizerApplicationByUserId(userId);
  }

  async submitOrganizerApplication(
    user: UserPayload,
    data: SubmitOrganizerApplicationDto,
  ) {
    if (user.role !== Role.BUYER) {
      throw new BadRequestException(
        'Only buyers can request to become an organizer',
      );
    }

    const profile = await this.prisma.organizerProfile.findUnique({
      where: { userId: user.id },
    });
    if (profile) {
      throw new ConflictException('This account is already an organizer');
    }

    const existing = await this.userService.findOrganizerApplicationByUserId(
      user.id,
    );

    if (existing?.status === 'PENDING') {
      throw new ConflictException(
        'You already have an organizer application under review',
      );
    }

    if (existing?.status === 'APPROVED') {
      throw new ConflictException(
        'Your organizer application was already approved',
      );
    }

    await this.userService.ensureDocumentIsUnique(data.document, user.id);

    if (existing) {
      return this.prisma.organizerAplication.update({
        where: { userId: user.id },
        data: {
          legalName: data.legalName,
          tradeName: data.tradeName,
          document: data.document,
          status: 'PENDING',
          rejectedReason: null,
        },
      });
    }

    return this.prisma.organizerAplication.create({
      data: {
        legalName: data.legalName,
        tradeName: data.tradeName,
        document: data.document,
        userId: user.id,
        status: 'PENDING',
      },
    });
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
