import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WordService } from '../word/word.service';

const LIMIT_MAX = 365;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

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

  async forceRotation() {
    return this.wordService.rotateDailyWord();
  }

  async schedule(dateStr: string, wordId: number) {
    const date = this.parseUTCDate(dateStr);
    if (!date) {
      throw new BadRequestException('Data inválida. Use o formato YYYY-MM-DD');
    }

    const today = this.wordService.getTodayDate();
    if (date <= today) {
      throw new BadRequestException(
        'Data deve ser futura. Use POST /admin/daily-words/today para alterar a palavra de hoje',
      );
    }

    const word = await this.prisma.word.findUnique({ where: { id: wordId } });
    if (!word) {
      throw new NotFoundException('Palavra não encontrada');
    }

    const oneYearAgo = new Date(today.getTime() - ONE_YEAR_MS);
    if (word.usedAt && word.usedAt > oneYearAgo) {
      throw new ConflictException('Palavra usada recentemente e indisponível para agendamento');
    }

    const existing = await this.prisma.dailyWord.findUnique({ where: { date } });
    if (existing) {
      throw new ConflictException('Já existe uma palavra agendada para essa data');
    }

    const [dailyWord] = await this.prisma.$transaction([
      this.prisma.dailyWord.create({
        data: { date, wordId, gameNumber: null },
        include: { word: { select: { id: true, text: true } } },
      }),
      this.prisma.word.update({
        where: { id: wordId },
        data: { usedAt: new Date() },
      }),
    ]);

    return dailyWord;
  }

  async unschedule(dateStr: string) {
    const date = this.parseUTCDate(dateStr);
    if (!date) {
      throw new BadRequestException('Data inválida. Use o formato YYYY-MM-DD');
    }

    const today = this.wordService.getTodayDate();
    if (date <= today) {
      throw new BadRequestException(
        'Não é possível desagendar datas passadas ou o dia de hoje',
      );
    }

    const scheduled = await this.prisma.dailyWord.findUnique({ where: { date } });
    if (!scheduled) {
      throw new NotFoundException('Nenhum agendamento encontrado para essa data');
    }
    if (scheduled.gameNumber !== null) {
      throw new BadRequestException(
        'Esta data já foi ativada e não pode ser desagendada',
      );
    }

    await this.prisma.dailyWord.delete({ where: { date } });

    // Restore Word.usedAt to the most recent remaining DailyWord for this wordId
    const mostRecent = await this.prisma.dailyWord.findFirst({
      where: { wordId: scheduled.wordId },
      orderBy: { date: 'desc' },
    });
    await this.prisma.word.update({
      where: { id: scheduled.wordId },
      data: { usedAt: mostRecent ? mostRecent.date : null },
    });
  }

  private parseUTCDate(dateStr: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return new Date(Date.UTC(year, month - 1, day));
  }
}
