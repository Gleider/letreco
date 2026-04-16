'use client';

import { LetterStatus } from '@letreco/shared';

interface GameTileProps {
  letter: string;
  status?: LetterStatus;
  isCurrentRow?: boolean;
}

const statusStyles: Record<string, string> = {
  [LetterStatus.CORRECT]: 'bg-[#059669] border-[#059669]',
  [LetterStatus.PRESENT]: 'bg-[#d97706] border-[#d97706]',
  [LetterStatus.ABSENT]: 'bg-[#374151] border-[#374151]',
};

export function GameTile({ letter, status, isCurrentRow }: GameTileProps) {
  let style = 'border-2 border-[#1f2937]';

  if (status) {
    style = `border-2 ${statusStyles[status]}`;
  } else if (letter && isCurrentRow) {
    style = 'border-2 border-white';
  }

  return (
    <div
      className={`flex items-center justify-center w-[58px] h-[58px] rounded sm:w-16 sm:h-16 sm:rounded-md ${style}`}
    >
      <span className="font-mono text-[26px] sm:text-[30px] font-extrabold text-gray-50 select-none">
        {letter.toUpperCase()}
      </span>
    </div>
  );
}
