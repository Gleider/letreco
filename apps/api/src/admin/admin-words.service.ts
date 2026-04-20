import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PAGE_SIZE_MAX = 200;

@Injectable()
export class AdminWordsService {
  constructor(private prisma: PrismaService) {}

  async list(q: string | undefined, page: number, pageSize: number) {
    const clampedSize = Math.min(pageSize, PAGE_SIZE_MAX);
    const skip = (page - 1) * clampedSize;

    const where = q
      ? { text: { contains: q.toLowerCase() } }
      : undefined;

    const [words, total] = await Promise.all([
      this.prisma.word.findMany({
        where,
        select: { id: true, text: true, usedAt: true },
        orderBy: { text: 'asc' },
        skip,
        take: clampedSize,
      }),
      this.prisma.word.count({ where }),
    ]);

    return { words, total, page, pageSize: clampedSize };
  }

  async add(text: string) {
    try {
      return await this.prisma.word.create({
        data: { text: text.toLowerCase() },
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictException('Palavra já existe no catálogo');
      }
      throw err;
    }
  }

  async remove(id: number) {
    const referenced = await this.prisma.dailyWord.findFirst({
      where: { wordId: id },
    });
    if (referenced) {
      throw new ConflictException(
        'Não é possível remover: palavra está vinculada a um jogo ativo ou agendado',
      );
    }

    const word = await this.prisma.word.findUnique({ where: { id } });
    if (!word) {
      throw new NotFoundException('Palavra não encontrada');
    }

    await this.prisma.word.delete({ where: { id } });
  }
}
