import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WordService } from './word.service';

@Injectable()
export class WordScheduler {
  private readonly logger = new Logger(WordScheduler.name);

  constructor(private wordService: WordService) {}

  @Cron('0 15 * * *', { name: 'rotate-daily-word' })
  async handleDailyRotation() {
    this.logger.log('Running daily word rotation (12:00 BRT / 15:00 UTC)...');
    await this.wordService.rotateDailyWord();
  }
}
