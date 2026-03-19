import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { SiteConfigModule } from '../site-config/site-config.module';
import { TimelineModule } from '../timeline/timeline.module';

@Module({
  imports: [SiteConfigModule, TimelineModule],
  controllers: [PublicController],
  providers: [PublicService],
  exports: [PublicService],
})
export class PublicModule {}
