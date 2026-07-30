import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { UserModule } from 'src/user/user.module';

@Module({
  controllers: [CategoryController],
  providers: [CategoryService],
  imports: [UserModule],
})
export class CategoryModule {}
