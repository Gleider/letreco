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

  getTodayDate(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  async getDailyWord() {
    const today = this.getTodayDate();
    let daily = await this.prisma.dailyWord.findUnique({
      where: { date: today },
      include: { word: true },
    });
    if (!daily) {
      return this.rotateDailyWord();
    }
    // Defense in depth: activate pre-scheduled word if gameNumber is null
    if (daily.gameNumber === null) {
      daily = (await this.activatePendingDailyWord(today)) ?? daily;
    }
    return daily;
  }

  async isValidWord(text: string): Promise<boolean> {
    const word = await this.prisma.word.findUnique({ where: { text: text.toLowerCase() } });
    return !!word;
  }

  async pickRandomAvailableWord(): Promise<{ id: number; text: string }> {
    const today = this.getTodayDate();
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

    return word;
  }

  async getNextGameNumber(): Promise<number> {
    // Exclude rows with gameNumber = null (pre-scheduled, not yet activated)
    const lastGame = await this.prisma.dailyWord.findFirst({
      where: { gameNumber: { not: null } },
      orderBy: { gameNumber: 'desc' },
    });
    return (lastGame?.gameNumber ?? 0) + 1;
  }

  async setDailyWord(
    wordId: number,
    opts: { date?: Date; invalidateSessions: boolean },
  ) {
    const date = opts.date ?? this.getTodayDate();
    const nextGameNumber = await this.getNextGameNumber();

    if (opts.invalidateSessions) {
      const existingDaily = await this.prisma.dailyWord.findUnique({ where: { date } });
      if (existingDaily) {
        await this.prisma.gameSession.deleteMany({
          where: { dailyWordId: existingDaily.id },
        });
      }
    }

    const daily = await this.prisma.dailyWord.upsert({
      where: { date },
      update: { wordId, gameNumber: nextGameNumber },
      create: { date, wordId, gameNumber: nextGameNumber },
      include: { word: true },
    });

    await this.prisma.word.update({
      where: { id: wordId },
      data: { usedAt: new Date() },
    });

    return daily;
  }

  async activatePendingDailyWord(date: Date) {
    const pending = await this.prisma.dailyWord.findUnique({
      where: { date },
      include: { word: true },
    });

    if (!pending || pending.gameNumber !== null) {
      return pending ?? null;
    }

    const nextGameNumber = await this.getNextGameNumber();

    const activated = await this.prisma.dailyWord.update({
      where: { id: pending.id },
      data: { gameNumber: nextGameNumber },
      include: { word: true },
    });

    await this.prisma.word.update({
      where: { id: pending.wordId },
      data: { usedAt: new Date() },
    });

    this.logger.log(
      `Pre-scheduled word activated for ${date.toISOString().slice(0, 10)}: game #${nextGameNumber}`,
    );
    return activated;
  }

  async rotateDailyWord() {
    const word = await this.pickRandomAvailableWord();
    const daily = await this.setDailyWord(word.id, { invalidateSessions: true });
    this.logger.log(`Daily word rotated: game #${daily.gameNumber}`);
    return daily;
  }

  private async ensureDailyWord() {
    const today = this.getTodayDate();
    const existing = await this.prisma.dailyWord.findUnique({ where: { date: today } });
    if (!existing) {
      this.logger.log('No daily word for today, creating one...');
      await this.rotateDailyWord();
    } else if (existing.gameNumber === null) {
      await this.activatePendingDailyWord(today);
    }
  }
}
