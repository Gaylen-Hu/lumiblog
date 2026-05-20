import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { SiteConfigModule } from '../site-config/site-config.module';
import { TimelineModule } from '../timeline/timeline.module';
import { ColumnModule } from '../column/column.module';

@Module({
  imports: [SiteConfigModule, TimelineModule, ColumnModule],
  controllers: [PublicController],
  providers: [PublicService],
  exports: [PublicService],
})
export class PublicModule {}
