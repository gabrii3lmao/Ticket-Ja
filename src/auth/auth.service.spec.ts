jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenService } from './refresh-token.service';
import { PrismaService } from 'src/prisma.service';
import * as bcrypt from 'bcrypt';

const mockUserService = {
  findByEmail: jest.fn(),
  create: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
};

const mockRefreshTokenService = {
  generateRefreshToken: jest.fn(),
  validateRefreshToken: jest.fn(),
  revokeRefreshToken: jest.fn(),
};

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
  },
};

describe('AuthService', () => {
  let service: AuthService;
  let userService: typeof mockUserService;
  let jwtService: typeof mockJwtService;
  let refreshTokenService: typeof mockRefreshTokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RefreshTokenService, useValue: mockRefreshTokenService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);
    refreshTokenService = module.get(RefreshTokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const user = {
        id: '1',
        name: 'John',
        email: 'john@mail.com',
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      userService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('john@mail.com', '123456');

      expect(userService.findByEmail).toHaveBeenCalledWith('john@mail.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('123456', 'hashed');
      expect(result).toEqual(user);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateUser('nonexistent@mail.com', '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      const user = {
        id: '1',
        name: 'John',
        email: 'john@mail.com',
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      userService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser('john@mail.com', 'wrong'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should return access token, refresh token and user', async () => {
      const user = {
        id: 'user-id',
        name: 'John',
        email: 'john@mail.com',
        passwordHash: 'hashed',
        role: 'BUYER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const accessToken = 'jwt-token';
      const refreshToken = 'refresh-token';

      userService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue(accessToken);
      refreshTokenService.generateRefreshToken.mockResolvedValue(refreshToken);

      const result = await service.login({
        email: 'john@mail.com',
        password: '123456',
      });

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-id',
        email: 'john@mail.com',
        role: 'BUYER',
      });
      expect(refreshTokenService.generateRefreshToken).toHaveBeenCalledWith(
        'user-id',
      );
      expect(result).toEqual({
        accessToken,
        refreshToken,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        user: expect.objectContaining({
          id: 'user-id',
          email: 'john@mail.com',
          role: 'BUYER',
        }),
      });
      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('register', () => {
    it('should create user and return tokens', async () => {
      const dto = { name: 'John', email: 'john@mail.com', password: '123456' };
      const createdUser = {
        id: 'user-id',
        name: 'John',
        email: 'john@mail.com',
        role: 'BUYER',
      };
      const userWithPassword = {
        ...createdUser,
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const accessToken = 'jwt-token';
      const refreshToken = 'refresh-token';

      userService.create.mockResolvedValue(createdUser);
      userService.findByEmail.mockResolvedValue(userWithPassword);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue(accessToken);
      refreshTokenService.generateRefreshToken.mockResolvedValue(refreshToken);

      const result = await service.register(dto);

      expect(userService.create).toHaveBeenCalledWith(dto, undefined);
      expect(result).toEqual({
        accessToken,
        refreshToken,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        user: expect.objectContaining({
          id: 'user-id',
          email: 'john@mail.com',
          role: 'BUYER',
        }),
      });
    });

    it('should forward organizer data when role is ORGANIZER', async () => {
      const dto = {
        name: 'John Corp',
        email: 'john@corp.com',
        password: '123456',
        role: 'ORGANIZER' as const,
        organizer: {
          legalName: 'John Corp LTDA',
          document: '12345678000190',
        },
      };
      const createdUser = {
        id: 'user-id',
        name: 'John Corp',
        email: 'john@corp.com',
        role: 'BUYER',
      };
      const accessToken = 'jwt-token';
      const refreshToken = 'refresh-token';

      userService.create.mockResolvedValue(createdUser);
      jwtService.sign.mockReturnValue(accessToken);
      refreshTokenService.generateRefreshToken.mockResolvedValue(refreshToken);

      await service.register(dto);

      expect(userService.create).toHaveBeenCalledWith(dto, dto.organizer);
    });

    it('should throw BadRequestException when ORGANIZER has no organizer data', async () => {
      const dto = {
        name: 'John',
        email: 'john@mail.com',
        password: '123456',
        role: 'ORGANIZER' as const,
      };

      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
      expect(userService.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when BUYER sends organizer data', async () => {
      const dto = {
        name: 'John',
        email: 'john@mail.com',
        password: '123456',
        role: 'BUYER' as const,
        organizer: {
          legalName: 'John Corp LTDA',
          document: '12345678000190',
        },
      };

      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
      expect(userService.create).not.toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    it('should return new token pair', async () => {
      const oldRefreshToken = 'old-refresh-token';
      const user = {
        id: 'user-id',
        email: 'john@mail.com',
        role: 'BUYER',
      };
      const newAccessToken = 'new-access-token';
      const newRefreshToken = 'new-refresh-token';

      refreshTokenService.validateRefreshToken.mockResolvedValue({
        userId: 'user-id',
      });
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      refreshTokenService.revokeRefreshToken.mockResolvedValue(undefined);
      jwtService.sign.mockReturnValue(newAccessToken);
      refreshTokenService.generateRefreshToken.mockResolvedValue(
        newRefreshToken,
      );

      const result = await service.refreshTokens(oldRefreshToken);

      expect(refreshTokenService.validateRefreshToken).toHaveBeenCalledWith(
        oldRefreshToken,
      );
      expect(refreshTokenService.revokeRefreshToken).toHaveBeenCalledWith(
        oldRefreshToken,
      );
      expect(result).toEqual({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      refreshTokenService.validateRefreshToken.mockResolvedValue({
        userId: 'nonexistent-id',
      });
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should revoke refresh token', async () => {
      refreshTokenService.revokeRefreshToken.mockResolvedValue(undefined);

      await service.logout('refresh-token');

      expect(refreshTokenService.revokeRefreshToken).toHaveBeenCalledWith(
        'refresh-token',
      );
    });
  });
});
