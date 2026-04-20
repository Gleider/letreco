import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AdminDailyWordsController } from '../admin-daily-words.controller';
import { AdminDailyWordsService } from '../admin-daily-words.service';

function makeService(): jest.Mocked<AdminDailyWordsService> {
  return {
    list: jest.fn(),
    getToday: jest.fn(),
    setToday: jest.fn(),
  } as unknown as jest.Mocked<AdminDailyWordsService>;
}

const TODAY = new Date('2026-04-20T00:00:00.000Z');
const FAKE_WORD = { id: 1, text: 'gatos' };
const FAKE_DAILY = { id: 10, date: TODAY, gameNumber: 5, wordId: 1, word: FAKE_WORD };

describe('AdminDailyWordsController', () => {
  let controller: AdminDailyWordsController;
  let service: jest.Mocked<AdminDailyWordsService>;

  beforeEach(() => {
    service = makeService();
    controller = new AdminDailyWordsController(service);
  });

  describe('GET /admin/daily-words', () => {
    it('happy path: retorna últimas 30 DailyWords por padrão', async () => {
      service.list.mockResolvedValue([FAKE_DAILY] as never);
      const result = await controller.list('30');
      expect(service.list).toHaveBeenCalledWith(30);
      expect(result).toEqual([FAKE_DAILY]);
    });

    it('edge: limit > 365 é passado ao service (que trunca internamente)', async () => {
      service.list.mockResolvedValue([]);
      await controller.list('500');
      expect(service.list).toHaveBeenCalledWith(500);
    });
  });

  describe('GET /admin/daily-words/today', () => {
    it('happy path: retorna palavra de hoje com activeSessions', async () => {
      const todayWithSessions = { ...FAKE_DAILY, activeSessions: 42 };
      service.getToday.mockResolvedValue(todayWithSessions as never);
      const result = await controller.getToday();
      expect(result).toEqual(todayWithSessions);
    });
  });

  describe('POST /admin/daily-words/today', () => {
    it('happy path: troca palavra do dia com wordId válido', async () => {
      service.setToday.mockResolvedValue(FAKE_DAILY as never);
      const result = await controller.setToday(1);
      expect(service.setToday).toHaveBeenCalledWith(1);
      expect(result).toEqual(FAKE_DAILY);
    });

    it('error: wordId ausente lança BadRequestException', () => {
      expect(() => controller.setToday(undefined as unknown as number)).toThrow(BadRequestException);
    });

    it('error: wordId inexistente propaga NotFoundException', async () => {
      service.setToday.mockRejectedValue(new NotFoundException('Palavra não encontrada'));
      await expect(controller.setToday(99)).rejects.toThrow(NotFoundException);
    });
  });
});
