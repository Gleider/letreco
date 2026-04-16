'use client';

import { useEffect, useState } from 'react';
import type { GameStats, LetterStatus } from '@letreco/shared';

interface StatsModalProps {
  stats: GameStats;
  gameNumber: number;
  attempts: { guess: string; results: LetterStatus[] }[];
  won: boolean;
  onClose: () => void;
}

export function StatsModal({ stats, gameNumber, attempts, won, onClose }: StatsModalProps) {
  const [countdown, setCountdown] = useState('');
  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;

  const maxDist = Math.max(...Object.values(stats.distribution), 1);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const noon = new Date(now);
      noon.setHours(12, 0, 0, 0);
      if (now >= noon) noon.setDate(noon.getDate() + 1);

      const diff = noon.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleShare = async () => {
    const emojiMap: Record<string, string> = {
      correct: '🟩',
      present: '🟨',
      absent: '⬛',
    };
    const grid = attempts
      .map((a) => a.results.map((r) => emojiMap[r]).join(''))
      .join('\n');
    const text = `Letreco #${gameNumber} ${won ? attempts.length : 'X'}/6\n\n${grid}`;

    try {
      await navigator.clipboard.writeText(text);
      alert('Resultado copiado!');
    } catch {
      prompt('Copie o resultado:', text);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-[340px] rounded-2xl bg-[#111827] p-7 flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Estatísticas</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1f2937] text-gray-400 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="flex justify-between">
          <StatItem value={stats.gamesPlayed} label="Jogos" />
          <StatItem value={`${winRate}%`} label="Vitórias" />
          <StatItem value={stats.currentStreak} label="Sequência" />
          <StatItem value={stats.maxStreak} label="Melhor" />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wider text-gray-400 mb-2">
            DISTRIBUIÇÃO DE TENTATIVAS
          </span>
          {[1, 2, 3, 4, 5, 6].map((n) => {
            const count = stats.distribution[n] || 0;
            const width = Math.max(count / maxDist * 100, 8);
            const isWinRow = won && n === attempts.length;

            return (
              <div key={n} className="flex items-center gap-2">
                <span className={`text-sm font-semibold w-3 shrink-0 ${isWinRow ? 'text-gray-50' : 'text-gray-400'}`}>
                  {n}
                </span>
                <div
                  className={`h-6 rounded px-2 flex items-center justify-end ${isWinRow ? 'bg-[#059669]' : 'bg-[#374151]'}`}
                  style={{ width: `${width}%` }}
                >
                  <span className="text-xs font-semibold text-gray-50">{count}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#1f2937]">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-gray-500">PRÓXIMA PALAVRA</span>
            <span className="font-mono text-[22px] font-bold">{countdown}</span>
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 h-11 px-5 bg-[#059669] rounded-lg font-bold text-sm hover:brightness-110 transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Compartilhar
          </button>
        </div>
      </div>
    </div>
  );
}

function StatItem({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[28px] font-bold">{value}</span>
      <span className="text-[11px] font-medium text-gray-500">{label}</span>
    </div>
  );
}
