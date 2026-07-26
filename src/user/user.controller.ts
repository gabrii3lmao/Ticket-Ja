import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Delete,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('/')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() data: CreateUserDto) {
    return this.userService.create(data);
  }

  @Delete('/')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@CurrentUser() userId: string) {
    return this.userService.deleteUser(userId);
  }
}
