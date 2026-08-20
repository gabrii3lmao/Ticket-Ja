jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

const mockUserService = {
  findByEmail: jest.fn(),
  create: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;
  let userService: typeof mockUserService;
  let jwtService: typeof mockJwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);
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

    it('should return null when user is not found', async () => {
      userService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser(
        'nonexistent@mail.com',
        '123456',
      );

      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
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

      const result = await service.validateUser('john@mail.com', 'wrong');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return an access token', () => {
      const token = 'jwt-token';
      jwtService.sign.mockReturnValue(token);

      const result = service.login({
        id: 'user-id',
        email: 'john@mail.com',
        role: 'BUYER',
      });

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-id',
        email: 'john@mail.com',
        role: 'BUYER',
      });
      expect(result).toEqual({ accessToken: token });
    });
  });

  describe('register', () => {
    it('should create user and return access token', async () => {
      const dto = { name: 'John', email: 'john@mail.com', password: '123456' };
      const createdUser = {
        id: 'user-id',
        name: 'John',
        email: 'john@mail.com',
        role: 'BUYER',
      };
      const token = 'jwt-token';

      userService.create.mockResolvedValue(createdUser);
      jwtService.sign.mockReturnValue(token);

      const result = await service.register(dto);

      expect(userService.create).toHaveBeenCalledWith(dto, undefined);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-id',
        email: 'john@mail.com',
        role: 'BUYER',
      });
      expect(result).toEqual({ accessToken: token });
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
      const token = 'jwt-token';

      userService.create.mockResolvedValue(createdUser);
      jwtService.sign.mockReturnValue(token);

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
});
