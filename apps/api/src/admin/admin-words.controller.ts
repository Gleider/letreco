import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  BadRequestException,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AdminWordsService } from './admin-words.service';
import { WordService } from '../word/word.service';

@Controller('admin/words')
@UseGuards(AdminGuard)
export class AdminWordsController {
  constructor(private adminWordsService: AdminWordsService) {}

  @Get()
  list(
    @Query('q') q: string | undefined,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '50',
  ) {
    return this.adminWordsService.list(q, Number(page) || 1, Number(pageSize) || 50);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  add(@Body('text') text: string) {
    if (!text) {
      throw new BadRequestException('Campo "text" é obrigatório');
    }
    const normalized = text.toLowerCase();
    if (!WordService.isKeyboardCompatible(normalized)) {
      throw new BadRequestException(
        'Palavra deve ter exatamente 5 letras minúsculas (a-z), sem acentos ou caracteres especiais',
      );
    }
    return this.adminWordsService.add(normalized);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.adminWordsService.remove(id);
  }
}
