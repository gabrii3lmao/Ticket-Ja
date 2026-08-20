import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { User } from 'generated/prisma/client';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return null;
    }
    return user;
  }

  login(user: { id: string; email: string; role: string }) {
    return {
      accessToken: this.jwtService.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      }),
    };
  }

  async register(data: RegisterDto) {
    this.validateUserRole(data);
    const user = await this.userService.create(data, data.organizer);
    return this.login(user);
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
}
