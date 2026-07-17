import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Delete,
  Param,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('/')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() data: CreateUserDto) {
    return this.userService.create(data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }
}
