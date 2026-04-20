import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WordService } from '../word/word.service';

const LIMIT_MAX = 365;

@Injectable()
export class AdminDailyWordsService {
  constructor(
    private prisma: PrismaService,
    private wordService: WordService,
  ) {}

  async list(limit: number) {
    const clampedLimit = Math.min(limit, LIMIT_MAX);
    return this.prisma.dailyWord.findMany({
      take: clampedLimit,
      orderBy: { date: 'desc' },
      include: { word: { select: { id: true, text: true } } },
    });
  }

  async getToday() {
    const daily = await this.wordService.getDailyWord();
    const activeSessions = await this.prisma.gameSession.count({
      where: { dailyWordId: daily.id },
    });
    return { ...daily, activeSessions };
  }

  async setToday(wordId: number) {
    const word = await this.prisma.word.findUnique({ where: { id: wordId } });
    if (!word) {
      throw new NotFoundException('Palavra não encontrada');
    }
    return this.wordService.setDailyWord(wordId, {
      date: this.wordService.getTodayDate(),
      invalidateSessions: true,
    });
  }
}
