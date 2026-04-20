import { Injectable, BadRequestException } from '@nestjs/common';
import { LetterStatus } from '@letreco/shared';
import { PrismaService } from '../prisma/prisma.service';
import { WordService } from '../word/word.service';
import { evaluateGuess } from './game.logic';

const MAX_ATTEMPTS = 6;

@Injectable()
export class GameService {
  constructor(
    private prisma: PrismaService,
    private wordService: WordService,
  ) {}

  async submitGuess(playerId: string, guess: string) {
    const normalized = guess.toLowerCase().trim();

    if (!/^[a-z]{5}$/.test(normalized)) {
      throw new BadRequestException('A palavra deve ter exatamente 5 letras');
    }

    const isValid = await this.wordService.isValidWord(normalized);
    if (!isValid) {
      throw new BadRequestException('Palavra não encontrada no dicionário');
    }

    const daily = await this.wordService.getDailyWord();
    if (!daily) {
      throw new BadRequestException('Nenhuma palavra do dia configurada');
    }

    let session = await this.prisma.gameSession.findUnique({
      where: { playerId_dailyWordId: { playerId, dailyWordId: daily.id } },
    });

    if (!session) {
      session = await this.prisma.gameSession.create({
        data: { playerId, dailyWordId: daily.id, attempts: [], status: 'playing' },
      });
    }

    if (session.status !== 'playing') {
      throw new BadRequestException('O jogo de hoje já terminou');
    }

    const attempts = session.attempts as { guess: string; results: LetterStatus[] }[];
    if (attempts.length >= MAX_ATTEMPTS) {
      throw new BadRequestException('Todas as tentativas já foram usadas');
    }

    const answer = daily.word.text;
    const results = evaluateGuess(normalized, answer);
    const won = results.every((r) => r === LetterStatus.CORRECT);
    const attemptNumber = attempts.length + 1;
    const gameOver = won || attemptNumber >= MAX_ATTEMPTS;
    const newStatus = won ? 'won' : gameOver ? 'lost' : 'playing';

    const updatedAttempts = [...attempts, { guess: normalized, results }];

    await this.prisma.gameSession.update({
      where: { id: session.id },
      data: { attempts: updatedAttempts, status: newStatus },
    });

    return {
      results,
      attempt: attemptNumber,
      gameOver,
      won,
      gameNumber: daily.gameNumber ?? 0,
      ...(gameOver ? { revealedWord: answer } : {}),
    };
  }

  async getStatus(playerId: string) {
    const daily = await this.wordService.getDailyWord();
    if (!daily) return { status: 'playing' as const, attempts: [], gameNumber: 0 };

    const session = await this.prisma.gameSession.findUnique({
      where: { playerId_dailyWordId: { playerId, dailyWordId: daily.id } },
    });

    if (!session) {
      return { status: 'playing' as const, attempts: [], gameNumber: daily.gameNumber ?? 0 };
    }

    const attempts = session.attempts as { guess: string; results: LetterStatus[] }[];

    // If the word was rotated mid-day (upsert changed wordId but kept dailyWord.id),
    // old sessions may reference a stale word. Detect and discard them.
    if (attempts.length > 0) {
      const firstGuess = attempts[0].guess;
      const results = evaluateGuess(firstGuess, daily.word.text);
      const storedResults = attempts[0].results;
      const isStale = results.some((r, i) => r !== storedResults[i]);
      if (isStale) {
        await this.prisma.gameSession.delete({ where: { id: session.id } });
        return { status: 'playing' as const, attempts: [], gameNumber: daily.gameNumber ?? 0 };
      }
    }

    return {
      status: session.status as 'playing' | 'won' | 'lost',
      attempts,
      gameNumber: daily.gameNumber ?? 0,
      ...(session.status !== 'playing' ? { revealedWord: daily.word.text } : {}),
    };
  }
}
