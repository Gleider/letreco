import { WordService } from '../word.service';

function makePrisma(overrides: Partial<ReturnType<typeof buildMockPrisma>> = {}) {
  return { ...buildMockPrisma(), ...overrides };
}

function buildMockPrisma() {
  return {
    $queryRaw: jest.fn(),
    dailyWord: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    word: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    gameSession: {
      deleteMany: jest.fn(),
    },
  };
}

const FAKE_WORD = { id: 1, text: 'gatos' };
const FAKE_DAILY = { id: 10, date: new Date(), wordId: 1, gameNumber: 5, word: FAKE_WORD };

describe('WordService — characterização e refator', () => {
  let service: WordService;
  let prisma: ReturnType<typeof buildMockPrisma>;

  beforeEach(() => {
    prisma = buildMockPrisma();
    service = new WordService(prisma as never);
  });

  describe('rotateDailyWord', () => {
    function setupHappyPath() {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(100) }])
        .mockResolvedValueOnce([FAKE_WORD]);
      prisma.dailyWord.findFirst.mockResolvedValue({ gameNumber: 10 });
      prisma.dailyWord.findUnique.mockResolvedValue(null);
      prisma.dailyWord.upsert.mockResolvedValue(FAKE_DAILY);
      prisma.word.update.mockResolvedValue(FAKE_WORD);
      prisma.gameSession.deleteMany.mockResolvedValue({ count: 0 });
    }

    it('happy path: cria DailyWord para hoje com gameNumber incrementado', async () => {
      setupHappyPath();
      const result = await service.rotateDailyWord();
      expect(prisma.dailyWord.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ gameNumber: 11 }) }),
      );
      expect(result).toEqual(FAKE_DAILY);
    });

    it('happy path: marca Word.usedAt após rotação', async () => {
      setupHappyPath();
      await service.rotateDailyWord();
      expect(prisma.word.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { usedAt: expect.any(Date) } }),
      );
    });

    it('happy path: invalida GameSessions quando DailyWord existente', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(100) }])
        .mockResolvedValueOnce([FAKE_WORD]);
      prisma.dailyWord.findFirst.mockResolvedValue({ gameNumber: 10 });
      prisma.dailyWord.findUnique.mockResolvedValue(FAKE_DAILY);
      prisma.dailyWord.upsert.mockResolvedValue(FAKE_DAILY);
      prisma.word.update.mockResolvedValue(FAKE_WORD);
      prisma.gameSession.deleteMany.mockResolvedValue({ count: 3 });

      await service.rotateDailyWord();
      expect(prisma.gameSession.deleteMany).toHaveBeenCalledWith({
        where: { dailyWordId: FAKE_DAILY.id },
      });
    });

    it('error: lança quando catálogo esgotado (count = 0)', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([{ count: BigInt(0) }]);
      await expect(service.rotateDailyWord()).rejects.toThrow('No available words');
    });

    it('edge: gameNumber começa em 1 quando não há DailyWord anterior', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(100) }])
        .mockResolvedValueOnce([FAKE_WORD]);
      prisma.dailyWord.findFirst.mockResolvedValue(null);
      prisma.dailyWord.findUnique.mockResolvedValue(null);
      prisma.dailyWord.upsert.mockResolvedValue({ ...FAKE_DAILY, gameNumber: 1 });
      prisma.word.update.mockResolvedValue(FAKE_WORD);
      prisma.gameSession.deleteMany.mockResolvedValue({ count: 0 });

      await service.rotateDailyWord();
      expect(prisma.dailyWord.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ gameNumber: 1 }) }),
      );
    });
  });

  describe('setDailyWord (refatorado)', () => {
    it('happy path: troca palavra e invalida sessions quando invalidateSessions=true', async () => {
      prisma.dailyWord.findFirst.mockResolvedValue({ gameNumber: 10 });
      prisma.dailyWord.findUnique.mockResolvedValue(FAKE_DAILY);
      prisma.dailyWord.upsert.mockResolvedValue(FAKE_DAILY);
      prisma.word.update.mockResolvedValue(FAKE_WORD);
      prisma.gameSession.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.setDailyWord(1, { invalidateSessions: true });
      expect(prisma.gameSession.deleteMany).toHaveBeenCalled();
      expect(result).toEqual(FAKE_DAILY);
    });

    it('happy path: não invalida sessions quando invalidateSessions=false', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      prisma.dailyWord.findFirst.mockResolvedValue({ gameNumber: 10 });
      prisma.dailyWord.findUnique.mockResolvedValue(null);
      prisma.dailyWord.upsert.mockResolvedValue({ ...FAKE_DAILY, date: futureDate, gameNumber: 11 });
      prisma.word.update.mockResolvedValue(FAKE_WORD);

      await service.setDailyWord(1, { date: futureDate, invalidateSessions: false });
      expect(prisma.gameSession.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('pickRandomAvailableWord (refatorado)', () => {
    it('happy path: retorna palavra disponível do catálogo', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(50) }])
        .mockResolvedValueOnce([FAKE_WORD]);
      const word = await service.pickRandomAvailableWord();
      expect(word).toEqual(FAKE_WORD);
    });

    it('error: lança quando nenhuma palavra disponível', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([{ count: BigInt(0) }]);
      await expect(service.pickRandomAvailableWord()).rejects.toThrow('No available words');
    });
  });

  describe('getNextGameNumber (refatorado)', () => {
    it('happy path: retorna MAX+1 quando há jogos', async () => {
      prisma.dailyWord.findFirst.mockResolvedValue({ gameNumber: 42 });
      const num = await service.getNextGameNumber();
      expect(num).toBe(43);
    });

    it('edge: retorna 1 quando não há DailyWords', async () => {
      prisma.dailyWord.findFirst.mockResolvedValue(null);
      const num = await service.getNextGameNumber();
      expect(num).toBe(1);
    });
  });

  describe('activatePendingDailyWord', () => {
    it('happy path: atribui gameNumber e marca usedAt para row pendente', async () => {
      const pendingDaily = { id: 20, date: new Date(), wordId: 2, gameNumber: null, word: FAKE_WORD };
      prisma.dailyWord.findUnique.mockResolvedValue(pendingDaily as never);
      prisma.dailyWord.findFirst.mockResolvedValue({ gameNumber: 10 });
      prisma.dailyWord.update.mockResolvedValue({ ...pendingDaily, gameNumber: 11 } as never);
      prisma.word.update.mockResolvedValue(FAKE_WORD);

      const result = await service.activatePendingDailyWord(new Date());
      expect(prisma.dailyWord.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { gameNumber: 11 } }),
      );
      expect(prisma.word.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { usedAt: expect.any(Date) } }),
      );
      expect((result as { gameNumber: number }).gameNumber).toBe(11);
    });

    it('edge: retorna null quando não há row pendente para a data', async () => {
      prisma.dailyWord.findUnique.mockResolvedValue(null);
      const result = await service.activatePendingDailyWord(new Date());
      expect(result).toBeNull();
      expect(prisma.dailyWord.update).not.toHaveBeenCalled();
    });

    it('edge: no-op idempotente quando gameNumber já está definido', async () => {
      prisma.dailyWord.findUnique.mockResolvedValue(FAKE_DAILY as never);
      const result = await service.activatePendingDailyWord(new Date());
      expect(prisma.dailyWord.update).not.toHaveBeenCalled();
      expect(result).toEqual(FAKE_DAILY);
    });
  });
});
