import { Module } from '@nestjs/common';
import { AdminTagController, TagController } from './tag.controller';
import { TagService } from './tag.service';

@Module({
  controllers: [AdminTagController, TagController],
  providers: [TagService],
  exports: [TagService],
})
export class TagModule {}
