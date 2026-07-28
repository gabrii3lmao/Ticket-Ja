import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { ActiveUserPipe } from 'src/auth/pipes/active-user.pipe';
import { UserModule } from 'src/user/user.module';

@Module({
  controllers: [CategoryController],
  providers: [CategoryService],
  imports: [UserModule]
})
export class CategoryModule {}
