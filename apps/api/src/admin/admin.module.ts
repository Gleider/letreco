import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WordModule } from '../word/word.module';
import { AdminWordsController } from './admin-words.controller';
import { AdminWordsService } from './admin-words.service';

@Module({
  imports: [PrismaModule, WordModule],
  controllers: [AdminWordsController],
  providers: [AdminWordsService],
})
export class AdminModule {}
