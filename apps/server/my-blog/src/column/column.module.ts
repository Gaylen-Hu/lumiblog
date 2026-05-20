import { Module } from '@nestjs/common';
import { AdminColumnController } from './column.controller';
import { ColumnService } from './column.service';
import { ColumnPublicService } from './column-public.service';

@Module({
  controllers: [AdminColumnController],
  providers: [ColumnService, ColumnPublicService],
  exports: [ColumnService, ColumnPublicService],
})
export class ColumnModule {}
