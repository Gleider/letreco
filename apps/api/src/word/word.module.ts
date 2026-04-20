import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WordService } from './word.service';
import { WordScheduler } from './word.scheduler';

@Module({
  imports: [PrismaModule],
  providers: [WordService, WordScheduler],
  exports: [WordService],
})
export class WordModule {}
