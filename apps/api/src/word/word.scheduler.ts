import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WordService } from './word.service';

@Injectable()
export class WordScheduler {
  private readonly logger = new Logger(WordScheduler.name);

  constructor(
    private wordService: WordService,
    private prisma: PrismaService,
  ) {}

  @Cron('0 15 * * *', { name: 'rotate-daily-word' })
  async handleDailyRotation() {
    this.logger.log('Running daily word rotation (12:00 BRT / 15:00 UTC)...');

    const today = this.wordService.getTodayDate();
    const existing = await this.prisma.dailyWord.findUnique({ where: { date: today } });

    if (!existing) {
      await this.wordService.rotateDailyWord();
      return;
    }

    if (existing.gameNumber === null) {
      await this.wordService.activatePendingDailyWord(today);
      this.logger.log('Pre-scheduled word activated for today');
      return;
    }

    this.logger.log(`DailyWord for today already active (game #${existing.gameNumber}), skipping`);
  }
}
