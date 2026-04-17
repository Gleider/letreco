'use client';

import { LetterStatus } from '@letreco/shared';
import { GameTile } from './game-tile';

interface GameRowProps {
  guess: string;
  results?: LetterStatus[];
  isCurrentRow?: boolean;
  isRevealing?: boolean;
}

const REVEAL_DELAY_PER_TILE = 300;

export const REVEAL_TOTAL_MS = REVEAL_DELAY_PER_TILE * 4 + 500;

export function GameRow({ guess, results, isCurrentRow, isRevealing }: GameRowProps) {
  const letters = guess.padEnd(5, ' ').split('').slice(0, 5);

  return (
    <div className="flex gap-1.5 sm:gap-2">
      {letters.map((letter, i) => (
        <GameTile
          key={i}
          letter={letter === ' ' ? '' : letter}
          status={results?.[i]}
          isCurrentRow={isCurrentRow}
          revealDelay={isRevealing ? i * REVEAL_DELAY_PER_TILE : undefined}
        />
      ))}
    </div>
  );
}
