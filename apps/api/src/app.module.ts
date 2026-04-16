import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { WordModule } from './word/word.module';
import { GameModule } from './game/game.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    WordModule,
    GameModule,
  ],
})
export class AppModule {}
