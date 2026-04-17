'use client';

import { LetterStatus } from '@letreco/shared';
import { GameRow } from './game-row';

interface Attempt {
  guess: string;
  results: LetterStatus[];
}

interface GameBoardProps {
  attempts: Attempt[];
  currentGuess: string;
  currentRow: number;
  revealingRow?: number;
}

export function GameBoard({ attempts, currentGuess, currentRow, revealingRow }: GameBoardProps) {
  const rows = [];

  for (let i = 0; i < 6; i++) {
    if (i < attempts.length) {
      rows.push(
        <GameRow
          key={i}
          guess={attempts[i].guess}
          results={attempts[i].results}
          isRevealing={i === revealingRow}
        />,
      );
    } else if (i === currentRow) {
      rows.push(
        <GameRow key={i} guess={currentGuess} isCurrentRow />,
      );
    } else {
      rows.push(<GameRow key={i} guess="" />);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2 py-8 sm:py-10">
      {rows}
    </div>
  );
}
