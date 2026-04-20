import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AdminDailyWordsController } from '../admin-daily-words.controller';
import { AdminDailyWordsService } from '../admin-daily-words.service';

function makeService(): jest.Mocked<AdminDailyWordsService> {
  return {
    list: jest.fn(),
    getToday: jest.fn(),
    setToday: jest.fn(),
    forceRotation: jest.fn(),
    schedule: jest.fn(),
    unschedule: jest.fn(),
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

  describe('POST /admin/daily-words/rotate', () => {
    it('happy path: força rotação aleatória e retorna novo DailyWord', async () => {
      service.forceRotation.mockResolvedValue(FAKE_DAILY as never);
      const result = await controller.forceRotation();
      expect(service.forceRotation).toHaveBeenCalled();
      expect(result).toEqual(FAKE_DAILY);
    });
  });

  describe('POST /admin/daily-words/schedule', () => {
    it('happy path: agenda palavra para data futura', async () => {
      const scheduled = { ...FAKE_DAILY, gameNumber: null };
      service.schedule.mockResolvedValue(scheduled as never);
      const result = await controller.schedule('2026-04-25', 1);
      expect(service.schedule).toHaveBeenCalledWith('2026-04-25', 1);
      expect(result).toEqual(scheduled);
    });

    it('error: date ausente lança BadRequestException', () => {
      expect(() => controller.schedule(undefined as unknown as string, 1)).toThrow(BadRequestException);
    });

    it('error: wordId ausente lança BadRequestException', () => {
      expect(() => controller.schedule('2026-04-25', undefined as unknown as number)).toThrow(BadRequestException);
    });

    it('error: data passada propaga BadRequestException da service', async () => {
      service.schedule.mockRejectedValue(new BadRequestException('Data deve ser futura'));
      await expect(controller.schedule('2026-04-01', 1)).rejects.toThrow(BadRequestException);
    });

    it('error: conflito de agendamento propaga ConflictException', async () => {
      service.schedule.mockRejectedValue(new ConflictException('Já existe uma palavra agendada'));
      await expect(controller.schedule('2026-04-25', 1)).rejects.toThrow(ConflictException);
    });
  });

  describe('DELETE /admin/daily-words/schedule/:date', () => {
    it('happy path: desfaz agendamento pendente', async () => {
      service.unschedule.mockResolvedValue(undefined);
      await expect(controller.unschedule('2026-04-25')).resolves.toBeUndefined();
      expect(service.unschedule).toHaveBeenCalledWith('2026-04-25');
    });

    it('error: tentar desagendar data passada propaga BadRequestException', async () => {
      service.unschedule.mockRejectedValue(new BadRequestException('Não é possível desagendar datas passadas'));
      await expect(controller.unschedule('2026-04-01')).rejects.toThrow(BadRequestException);
    });

    it('error: tentar desagendar DailyWord já ativada propaga BadRequestException', async () => {
      service.unschedule.mockRejectedValue(new BadRequestException('Esta data já foi ativada'));
      await expect(controller.unschedule('2026-04-25')).rejects.toThrow(BadRequestException);
    });
  });
});
