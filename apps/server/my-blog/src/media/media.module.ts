import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { OssModule } from '../oss/oss.module';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
    }),
    OssModule,
  ],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
