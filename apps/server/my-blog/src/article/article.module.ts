import { Module } from '@nestjs/common';
import { AdminArticleController, ArticleController } from './article.controller';
import { ArticleService } from './article.service';

@Module({
  controllers: [AdminArticleController, ArticleController],
  providers: [ArticleService],
  exports: [ArticleService],
})
export class ArticleModule {}
