import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WordModule } from '../word/word.module';
import { AdminWordsController } from './admin-words.controller';
import { AdminWordsService } from './admin-words.service';
import { AdminDailyWordsController } from './admin-daily-words.controller';
import { AdminDailyWordsService } from './admin-daily-words.service';

@Module({
  imports: [PrismaModule, WordModule],
  controllers: [AdminWordsController, AdminDailyWordsController],
  providers: [AdminWordsService, AdminDailyWordsService],
})
export class AdminModule {}
