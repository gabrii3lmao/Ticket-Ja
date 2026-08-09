import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { UserPayload } from '../decorators/current-user.decorator';

@Injectable()
export class ActiveUserPipe implements PipeTransform<
  UserPayload,
  Promise<UserPayload>
> {
  constructor(private userService: UserService) {}

  async transform(user: UserPayload): Promise<UserPayload> {
    const dbUser = await this.userService.findById(user.id);
    if (!dbUser) throw new NotFoundException('User not found');
    return { id: dbUser.id, role: dbUser.role };
  }
}
