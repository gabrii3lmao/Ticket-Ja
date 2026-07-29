import { Injectable } from '@nestjs/common';
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

  login(user: { id: string; email: string }) {
    return {
      accessToken: this.jwtService.sign({ sub: user.id, email: user.email }),
    };
  }

  async register(data: RegisterDto) {
    const user = await this.userService.create(data);
    return this.login(user);
  }

  async delete(userId: string) {
    return this.userService.deleteUser(userId);
  }
}
