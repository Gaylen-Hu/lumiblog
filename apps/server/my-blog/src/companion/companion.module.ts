import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { COMPANION_ENGINE } from './companion.constants';
import { CompanionController } from './companion.controller';
import { loadCompanionEngine } from './companion.engine';
import { CompanionService } from './companion.service';
import { PublicModule } from '../public/public.module';

@Module({
  imports: [ConfigModule, PublicModule],
  controllers: [CompanionController],
  providers: [
    CompanionService,
    { provide: COMPANION_ENGINE, useValue: loadCompanionEngine },
  ],
})
export class CompanionModule {}
