import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const KEYBOARD_LETTERS = /^[a-z]{5}$/;

@Injectable()
export class WordService implements OnModuleInit {
  private readonly logger = new Logger(WordService.name);

  constructor(private prisma: PrismaService) {}

  static isKeyboardCompatible(word: string): boolean {
    return KEYBOARD_LETTERS.test(word.toLowerCase());
  }

  async onModuleInit() {
    await this.ensureDailyWord();
  }

  async getDailyWord() {
    const today = this.todayDate();
    const daily = await this.prisma.dailyWord.findUnique({
      where: { date: today },
      include: { word: true },
    });
    if (!daily) {
      return this.rotateDailyWord();
    }
    return daily;
  }

  async isValidWord(text: string): Promise<boolean> {
    const word = await this.prisma.word.findUnique({ where: { text: text.toLowerCase() } });
    return !!word;
  }

  async rotateDailyWord() {
    const today = this.todayDate();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const countResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT count(*) FROM "Word"
      WHERE ("usedAt" IS NULL OR "usedAt" < ${oneYearAgo})
      AND text ~ '^[a-z]{5}$'
    `;
    const availableCount = Number(countResult[0].count);

    if (availableCount === 0) {
      this.logger.error('No available words for rotation!');
      throw new Error('No available words');
    }

    const randomSkip = Math.floor(Math.random() * availableCount);

    const words = await this.prisma.$queryRaw<Array<{ id: number; text: string }>>`
      SELECT id, text FROM "Word"
      WHERE ("usedAt" IS NULL OR "usedAt" < ${oneYearAgo})
      AND text ~ '^[a-z]{5}$'
      OFFSET ${randomSkip}
      LIMIT 1
    `;

    const word = words[0];
    if (!word) {
      this.logger.error('No available words for rotation!');
      throw new Error('No available words');
    }

    const lastGame = await this.prisma.dailyWord.findFirst({
      orderBy: { gameNumber: 'desc' },
    });
    const nextGameNumber = (lastGame?.gameNumber ?? 0) + 1;

    // Invalidate existing sessions before changing the word
    const existingDaily = await this.prisma.dailyWord.findUnique({
      where: { date: today },
    });
    if (existingDaily) {
      await this.prisma.gameSession.deleteMany({
        where: { dailyWordId: existingDaily.id },
      });
    }

    const daily = await this.prisma.dailyWord.upsert({
      where: { date: today },
      update: { wordId: word.id, gameNumber: nextGameNumber },
      create: { date: today, wordId: word.id, gameNumber: nextGameNumber },
      include: { word: true },
    });

    await this.prisma.word.update({
      where: { id: word.id },
      data: { usedAt: new Date() },
    });

    this.logger.log(`Daily word rotated: game #${daily.gameNumber}`);
    return daily;
  }

  private async ensureDailyWord() {
    const today = this.todayDate();
    const existing = await this.prisma.dailyWord.findUnique({ where: { date: today } });
    if (!existing) {
      this.logger.log('No daily word for today, creating one...');
      await this.rotateDailyWord();
    }
  }

  private todayDate(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }
}
