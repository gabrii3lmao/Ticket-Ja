jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ActiveUserPipe } from './pipes/active-user.pipe';
import { UserService } from 'src/user/user.service';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refreshTokens: jest.fn(),
  logout: jest.fn(),
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
      const result = { accessToken: 'token', refreshToken: 'refresh' };

      mockAuthService.register.mockResolvedValue(result);

      const response = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(response).toEqual(result);
    });
  });

  describe('signIn', () => {
    it('should call authService.login with the DTO', async () => {
      const dto = { email: 'john@mail.com', password: '123456' };
      const result = {
        accessToken: 'token',
        refreshToken: 'refresh',
        user: { id: 'user-id', email: 'john@mail.com' },
      };

      mockAuthService.login.mockResolvedValue(result);

      const response = await controller.signIn(dto);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(response).toEqual(result);
    });
  });

  describe('refresh', () => {
    it('should call authService.refreshTokens with the refresh token', async () => {
      const dto = { refreshToken: 'old-refresh-token' };
      const result = {
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
      };

      mockAuthService.refreshTokens.mockResolvedValue(result);

      const response = await controller.refresh(dto);

      expect(authService.refreshTokens).toHaveBeenCalledWith(
        'old-refresh-token',
      );
      expect(response).toEqual(result);
    });
  });

  describe('logout', () => {
    it('should call authService.logout with the refresh token', async () => {
      const dto = { refreshToken: 'refresh-token' };

      mockAuthService.logout.mockResolvedValue(undefined);

      await controller.logout(dto);

      expect(authService.logout).toHaveBeenCalledWith('refresh-token');
    });
  });
});
