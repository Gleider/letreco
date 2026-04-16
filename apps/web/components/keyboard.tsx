'use client';

import { LetterStatus } from '@letreco/shared';

const ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace'],
];

const statusColors: Record<string, string> = {
  [LetterStatus.CORRECT]: 'bg-[#059669] text-gray-50',
  [LetterStatus.PRESENT]: 'bg-[#d97706] text-gray-50',
  [LetterStatus.ABSENT]: 'bg-[#374151] text-gray-500',
};

interface KeyboardProps {
  letterStatuses: Record<string, LetterStatus>;
  onKey: (key: string) => void;
  disabled?: boolean;
}

export function Keyboard({ letterStatuses, onKey, disabled }: KeyboardProps) {
  return (
    <div className="flex flex-col items-center gap-2 sm:gap-2.5 px-2 w-full max-w-[540px]">
      {ROWS.map((row, rowIdx) => (
        <div key={rowIdx} className="flex gap-[5px] sm:gap-1.5 justify-center w-full">
          {row.map((key) => {
            const isSpecial = key === 'enter' || key === 'backspace';
            const status = letterStatuses[key];
            const colorClass = status
              ? statusColors[status]
              : 'bg-[#1f2937] text-gray-50';

            return (
              <button
                key={key}
                onClick={() => onKey(key)}
                disabled={disabled}
                className={`flex items-center justify-center rounded-md sm:rounded-lg font-semibold select-none
                  ${isSpecial ? 'w-[52px] sm:w-[72px]' : 'w-[33px] sm:w-12'}
                  h-[50px] sm:h-14
                  text-[15px] sm:text-base
                  ${colorClass}
                  transition-colors active:brightness-110
                  disabled:opacity-60
                `}
              >
                {key === 'enter' ? (
                  <span className="text-xs sm:text-sm font-bold">ENTER</span>
                ) : key === 'backspace' ? (
                  <svg width="22" height="18" viewBox="0 0 24 20" fill="none" className="sm:w-6 sm:h-5">
                    <path d="M22 3H7l-5 7 5 7h15a2 2 0 002-2V5a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18 8l-5 5M13 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  key.toUpperCase()
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
