jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: typeof mockAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
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
    it('should call authService.login with req.user', async () => {
      const req = { user: { id: 'user-id', email: 'john@mail.com' } };
      const result = { accessToken: 'token' };

      mockAuthService.login.mockReturnValue(result);

      const response = await controller.signIn(req as any);

      expect(authService.login).toHaveBeenCalledWith(req.user);
      expect(response).toEqual(result);
    });
  });
});
