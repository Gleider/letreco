'use client';

import { LetterStatus } from '@letreco/shared';

interface RulesModalProps {
  onClose: () => void;
}

function ExampleTile({ letter, status }: { letter: string; status?: LetterStatus }) {
  const styles: Record<string, string> = {
    [LetterStatus.CORRECT]: 'bg-[#059669] border-[#059669]',
    [LetterStatus.PRESENT]: 'bg-[#d97706] border-[#d97706]',
    [LetterStatus.ABSENT]: 'bg-[#374151] border-[#374151]',
  };

  const style = status ? `border-2 ${styles[status]}` : 'border-2 border-[#374151]';
  const textColor = status === LetterStatus.ABSENT ? 'text-gray-500' : 'text-gray-50';

  return (
    <div className={`flex items-center justify-center w-11 h-11 rounded ${style}`}>
      <span className={`font-mono text-[22px] font-extrabold ${textColor} select-none`}>
        {letter}
      </span>
    </div>
  );
}

function ExampleRow({ word, statuses, description }: {
  word: string;
  statuses: (LetterStatus | undefined)[];
  description: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-[5px]">
        {word.split('').map((letter, i) => (
          <ExampleTile key={i} letter={letter} status={statuses[i]} />
        ))}
      </div>
      <p className="text-[13px] text-gray-400">{description}</p>
    </div>
  );
}

export function RulesModal({ onClose }: RulesModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70" onClick={onClose}>
      <div
        className="w-[340px] rounded-2xl bg-[#111827] p-7 flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Como jogar</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1f2937] text-gray-400 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-300 leading-[22px]">
          Descubra a palavra do dia em 6 tentativas. Cada tentativa deve ser uma palavra válida de 5 letras.
        </p>

        <div className="flex flex-col gap-5">
          <ExampleRow
            word="CRAVO"
            statuses={[LetterStatus.CORRECT, undefined, undefined, undefined, undefined]}
            description={<>A letra <span className="font-semibold text-gray-50">C</span> está na posição correta.</>}
          />
          <ExampleRow
            word="MUNDO"
            statuses={[undefined, undefined, LetterStatus.PRESENT, undefined, undefined]}
            description={<>A letra <span className="font-semibold text-gray-50">N</span> está na palavra, mas em outra posição.</>}
          />
          <ExampleRow
            word="PLANO"
            statuses={[undefined, undefined, undefined, LetterStatus.ABSENT, undefined]}
            description={<>A letra <span className="font-semibold text-gray-50">N</span> não está na palavra.</>}
          />
        </div>

        <div className="w-full h-px bg-[#1f2937]" />

        <p className="text-sm text-gray-300 leading-[22px]">
          Uma nova palavra é disponibilizada todos os dias ao meio-dia. Todos os jogadores jogam a mesma palavra.
        </p>
      </div>
    </div>
  );
}
