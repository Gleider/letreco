import { Module } from '@nestjs/common';
import { WordService } from './word.service';
import { WordScheduler } from './word.scheduler';

@Module({
  providers: [WordService, WordScheduler],
  exports: [WordService],
})
export class WordModule {}
