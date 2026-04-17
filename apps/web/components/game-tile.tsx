'use client';

import { useEffect, useState } from 'react';
import { LetterStatus } from '@letreco/shared';

interface GameTileProps {
  letter: string;
  status?: LetterStatus;
  isCurrentRow?: boolean;
  revealDelay?: number;
}

const statusStyles: Record<string, string> = {
  [LetterStatus.CORRECT]: 'bg-[#059669] border-[#059669]',
  [LetterStatus.PRESENT]: 'bg-[#d97706] border-[#d97706]',
  [LetterStatus.ABSENT]: 'bg-[#374151] border-[#374151]',
};

export function GameTile({ letter, status, isCurrentRow, revealDelay }: GameTileProps) {
  const [revealed, setRevealed] = useState(revealDelay === undefined);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (revealDelay === undefined || revealed) return;
    const flipTimer = setTimeout(() => setFlipping(true), revealDelay);
    const revealTimer = setTimeout(() => {
      setRevealed(true);
      setFlipping(false);
    }, revealDelay + 250);
    return () => {
      clearTimeout(flipTimer);
      clearTimeout(revealTimer);
    };
  }, [revealDelay, revealed]);

  let style = 'border-2 border-[#1f2937]';
  if (revealed && status) {
    style = `border-2 ${statusStyles[status]}`;
  } else if (letter && isCurrentRow) {
    style = 'border-2 border-white';
  }

  const pop = letter && isCurrentRow ? 'animate-[pop_0.1s_ease-in-out]' : '';

  return (
    <div
      className={`flex items-center justify-center w-[58px] h-[58px] rounded sm:w-16 sm:h-16 sm:rounded-md transition-colors duration-200 ${style} ${pop}`}
      style={{
        transform: flipping ? 'scaleY(0)' : 'scaleY(1)',
        transition: 'transform 0.25s ease-in-out, background-color 0.1s, border-color 0.1s',
      }}
    >
      <span className="font-mono text-[26px] sm:text-[30px] font-extrabold text-gray-50 select-none">
        {letter.toUpperCase()}
      </span>
    </div>
  );
}
