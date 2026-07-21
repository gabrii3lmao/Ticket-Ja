import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { UserService } from 'src/user/user.service';

@Injectable()
export class ActiveUserPipe implements PipeTransform<string, Promise<string>> {
  constructor(private userService: UserService) {}

  async transform(userId: string) {
    const user = await this.userService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return userId;
  }
}
