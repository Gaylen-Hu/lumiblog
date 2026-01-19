import { Module } from '@nestjs/common';
import { AdminCategoryController, CategoryController } from './category.controller';
import { CategoryService } from './category.service';

@Module({
  controllers: [AdminCategoryController, CategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
