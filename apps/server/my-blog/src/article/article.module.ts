import { Module, forwardRef } from '@nestjs/common';
import { AdminArticleController, ArticleController } from './article.controller';
import { ArticleService } from './article.service';
import { AiModule } from '../ai/ai.module';
import { WechatModule } from '../wechat/wechat.module';

@Module({
  imports: [AiModule, forwardRef(() => WechatModule)],
  controllers: [AdminArticleController, ArticleController],
  providers: [ArticleService],
  exports: [ArticleService],
})
export class ArticleModule {}
