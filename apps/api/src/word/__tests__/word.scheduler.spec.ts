import { WordScheduler } from '../word.scheduler';

function makePrisma() {
  return {
    dailyWord: {
      findUnique: jest.fn(),
    },
  };
}

function makeWordService(todayOverride?: Date) {
  return {
    getTodayDate: jest.fn().mockReturnValue(todayOverride ?? new Date('2026-04-20T00:00:00.000Z')),
    rotateDailyWord: jest.fn().mockResolvedValue({}),
    activatePendingDailyWord: jest.fn().mockResolvedValue({}),
  };
}

describe('WordScheduler', () => {
  let scheduler: WordScheduler;
  let wordService: ReturnType<typeof makeWordService>;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    wordService = makeWordService();
    prisma = makePrisma();
    scheduler = new WordScheduler(wordService as never, prisma as never);
  });

  it('happy path: sem DailyWord hoje → chama rotateDailyWord', async () => {
    prisma.dailyWord.findUnique.mockResolvedValue(null);
    await scheduler.handleDailyRotation();
    expect(wordService.rotateDailyWord).toHaveBeenCalled();
    expect(wordService.activatePendingDailyWord).not.toHaveBeenCalled();
  });

  it('happy path: DailyWord pré-agendada (gameNumber=null) → chama activatePendingDailyWord', async () => {
    prisma.dailyWord.findUnique.mockResolvedValue({ id: 1, gameNumber: null });
    await scheduler.handleDailyRotation();
    expect(wordService.activatePendingDailyWord).toHaveBeenCalled();
    expect(wordService.rotateDailyWord).not.toHaveBeenCalled();
  });

  it('happy path: DailyWord já ativa (gameNumber definido) → no-op', async () => {
    prisma.dailyWord.findUnique.mockResolvedValue({ id: 1, gameNumber: 42 });
    await scheduler.handleDailyRotation();
    expect(wordService.rotateDailyWord).not.toHaveBeenCalled();
    expect(wordService.activatePendingDailyWord).not.toHaveBeenCalled();
  });

  it('edge: cron rodando 2x no mesmo dia é no-op na segunda execução', async () => {
    // Primeira execução: rotação
    prisma.dailyWord.findUnique.mockResolvedValueOnce(null);
    await scheduler.handleDailyRotation();
    expect(wordService.rotateDailyWord).toHaveBeenCalledTimes(1);

    // Segunda execução: já tem gameNumber
    prisma.dailyWord.findUnique.mockResolvedValueOnce({ id: 1, gameNumber: 5 });
    await scheduler.handleDailyRotation();
    expect(wordService.rotateDailyWord).toHaveBeenCalledTimes(1);
  });
});
