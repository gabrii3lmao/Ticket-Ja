import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('/')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data) {
    return await this.userService.create(data);
  }
}
