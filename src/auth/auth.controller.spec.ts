jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ActiveUserPipe } from './pipes/active-user.pipe';
import { UserService } from 'src/user/user.service';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  validateUser: jest.fn(),
};

const mockUserService = {
  findById: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: typeof mockAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserService, useValue: mockUserService },
        ActiveUserPipe,
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should call authService.register with the DTO', async () => {
      const dto = { name: 'John', email: 'john@mail.com', password: '123456' };
      const result = { accessToken: 'token' };

      mockAuthService.register.mockResolvedValue(result);

      const response = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(response).toEqual(result);
    });
  });

  describe('signIn', () => {
    it('should call authService.login when credentials are valid', async () => {
      const dto = { email: 'john@mail.com', password: '123456' };
      const user = { id: 'user-id', email: 'john@mail.com' };
      const result = { accessToken: 'token' };

      mockAuthService.validateUser.mockResolvedValue(user);
      mockAuthService.login.mockReturnValue(result);

      const response = await controller.signIn(dto);

      expect(authService.validateUser).toHaveBeenCalledWith(
        dto.email,
        dto.password,
      );
      expect(authService.login).toHaveBeenCalledWith(user);
      expect(response).toEqual(result);
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      const dto = { email: 'wrong@mail.com', password: 'wrong' };

      mockAuthService.validateUser.mockResolvedValue(null);

      await expect(controller.signIn(dto as any)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authService.login).not.toHaveBeenCalled();
    });
  });
});
