import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AdminDailyWordsService } from './admin-daily-words.service';

@Controller('admin/daily-words')
@UseGuards(AdminGuard)
export class AdminDailyWordsController {
  constructor(private adminDailyWordsService: AdminDailyWordsService) {}

  @Get()
  list(@Query('limit') limit = '30') {
    return this.adminDailyWordsService.list(Number(limit) || 30);
  }

  @Get('today')
  getToday() {
    return this.adminDailyWordsService.getToday();
  }

  @Post('today')
  setToday(@Body('wordId') wordId: number) {
    if (!wordId) {
      throw new BadRequestException('Campo "wordId" é obrigatório');
    }
    return this.adminDailyWordsService.setToday(Number(wordId));
  }

  @Post('rotate')
  forceRotation() {
    return this.adminDailyWordsService.forceRotation();
  }

  @Post('schedule')
  schedule(@Body('date') date: string, @Body('wordId') wordId: number) {
    if (!date) throw new BadRequestException('Campo "date" é obrigatório');
    if (!wordId) throw new BadRequestException('Campo "wordId" é obrigatório');
    return this.adminDailyWordsService.schedule(date, Number(wordId));
  }

  @Delete('schedule/:date')
  unschedule(@Param('date') date: string) {
    return this.adminDailyWordsService.unschedule(date);
  }
}
