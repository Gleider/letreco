import { Controller, Post, Get, Body, Headers, Query, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { GameService } from './game.service';

@Controller('game')
export class GameController {
  constructor(private gameService: GameService) {}

  @Throttle({ default: { ttl: 60000, limit: 6 } })
  @Post('guess')
  async submitGuess(
    @Body('guess') guess: string,
    @Headers('x-player-id') playerId: string,
  ) {
    if (!playerId) throw new BadRequestException('X-Player-Id header is required');
    if (!guess) throw new BadRequestException('guess is required');
    return this.gameService.submitGuess(playerId, guess);
  }

  @Get('status')
  async getStatus(@Query('playerId') playerId: string) {
    if (!playerId) throw new BadRequestException('playerId query param is required');
    return this.gameService.getStatus(playerId);
  }
}
