import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AdminWordsController } from '../admin-words.controller';
import { AdminWordsService } from '../admin-words.service';

function makeService(): jest.Mocked<AdminWordsService> {
  return {
    list: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
  } as unknown as jest.Mocked<AdminWordsService>;
}

describe('AdminWordsController', () => {
  let controller: AdminWordsController;
  let service: jest.Mocked<AdminWordsService>;

  beforeEach(() => {
    service = makeService();
    controller = new AdminWordsController(service);
  });

  describe('GET /admin/words', () => {
    it('happy path: retorna palavras paginadas sem filtro', async () => {
      const mockResult = { words: [{ id: 1, text: 'gatos', usedAt: null }], total: 1, page: 1, pageSize: 50 };
      service.list.mockResolvedValue(mockResult);

      const result = await controller.list(undefined, '1', '50');
      expect(service.list).toHaveBeenCalledWith(undefined, 1, 50);
      expect(result).toEqual(mockResult);
    });

    it('happy path: filtra com q=ga', async () => {
      service.list.mockResolvedValue({ words: [], total: 0, page: 1, pageSize: 50 });
      await controller.list('ga', '1', '50');
      expect(service.list).toHaveBeenCalledWith('ga', 1, 50);
    });

    it('edge: pageSize > 200 é passado ao service (que trunca internamente)', async () => {
      service.list.mockResolvedValue({ words: [], total: 0, page: 1, pageSize: 200 });
      await controller.list(undefined, '1', '999');
      expect(service.list).toHaveBeenCalledWith(undefined, 1, 999);
    });
  });

  describe('POST /admin/words', () => {
    it('happy path: cria palavra válida normalizada para minúscula', async () => {
      const created = { id: 1, text: 'gatos', usedAt: null };
      service.add.mockResolvedValue(created as never);

      const result = await controller.add('gatos');
      expect(service.add).toHaveBeenCalledWith('gatos');
      expect(result).toEqual(created);
    });

    it('error: text ausente lança BadRequestException', async () => {
      expect(() => controller.add(undefined as unknown as string)).toThrow(BadRequestException);
    });

    it('error: palavra com 4 letras lança BadRequestException', () => {
      expect(() => controller.add('gato')).toThrow(BadRequestException);
    });

    it('error: palavra com acento lança BadRequestException', () => {
      expect(() => controller.add('café!')).toThrow(BadRequestException);
    });

    it('error: palavra duplicada (409 da service) propaga ConflictException', async () => {
      service.add.mockRejectedValue(new ConflictException('Palavra já existe no catálogo'));
      await expect(controller.add('gatos')).rejects.toThrow(ConflictException);
    });
  });

  describe('DELETE /admin/words/:id', () => {
    it('happy path: deleta palavra não referenciada', async () => {
      service.remove.mockResolvedValue(undefined);
      await expect(controller.remove(1)).resolves.toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(1);
    });

    it('error: palavra referenciada por DailyWord retorna 409', async () => {
      service.remove.mockRejectedValue(
        new ConflictException('Não é possível remover: palavra está vinculada a um jogo ativo ou agendado'),
      );
      await expect(controller.remove(1)).rejects.toThrow(ConflictException);
    });

    it('error: palavra não encontrada retorna 404', async () => {
      service.remove.mockRejectedValue(new NotFoundException('Palavra não encontrada'));
      await expect(controller.remove(99)).rejects.toThrow(NotFoundException);
    });
  });
});
