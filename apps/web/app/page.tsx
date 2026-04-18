'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LetterStatus } from '@letreco/shared';
import { GameBoard } from '@/components/game-board';
import { Keyboard } from '@/components/keyboard';
import { REVEAL_TOTAL_MS } from '@/components/game-row';
import { StatsModal } from '@/components/stats-modal';
import { RulesModal } from '@/components/rules-modal';
import { submitGuess, getGameStatus } from '@/lib/api-client';
import { getPlayerId, updateStatsAfterGame, getStats } from '@/lib/storage';

interface Attempt {
  guess: string;
  results: LetterStatus[];
}

function buildLetterStatuses(attempts: Attempt[]): Record<string, LetterStatus> {
  const statuses: Record<string, LetterStatus> = {};
  for (const a of attempts) {
    for (let i = 0; i < 5; i++) {
      const letter = a.guess[i];
      const current = statuses[letter];
      const next = a.results[i];
      if (!current || priority(next) > priority(current)) {
        statuses[letter] = next;
      }
    }
  }
  return statuses;
}

export default function Home() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [gameNumber, setGameNumber] = useState(0);
  const [revealedWord, setRevealedWord] = useState<string | undefined>();
  const [message, setMessage] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [letterStatuses, setLetterStatuses] = useState<Record<string, LetterStatus>>({});
  const [revealingRow, setRevealingRow] = useState<number | undefined>();
  const [isRevealing, setIsRevealing] = useState(false);
  const gameNumberRef = useRef(0);

  const loadGameState = useCallback(async () => {
    const playerId = getPlayerId();
    if (!playerId) return;

    try {
      const state = await getGameStatus(playerId);
      const serverGameNumber = state.gameNumber || 0;

      // New game detected — reset everything
      if (gameNumberRef.current > 0 && serverGameNumber !== gameNumberRef.current) {
        setAttempts(state.attempts || []);
        setCurrentGuess('');
        setGameStatus(state.status || 'playing');
        setGameNumber(serverGameNumber);
        setRevealedWord((state as any).revealedWord);
        setLetterStatuses(buildLetterStatuses(state.attempts || []));
        setRevealingRow(undefined);
        setIsRevealing(false);
        setShowStats(false);
        setMessage('');
        gameNumberRef.current = serverGameNumber;
        return;
      }

      // Initial load
      if (state.attempts) setAttempts(state.attempts);
      if (state.status) setGameStatus(state.status);
      setGameNumber(serverGameNumber);
      gameNumberRef.current = serverGameNumber;
      if ('revealedWord' in state) setRevealedWord((state as any).revealedWord);
      if (state.attempts) setLetterStatuses(buildLetterStatuses(state.attempts));
    } catch {
      // silently ignore
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadGameState();
  }, [loadGameState]);

  // Re-check when tab becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadGameState();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [loadGameState]);

  // Periodic check every 60s
  useEffect(() => {
    const interval = setInterval(loadGameState, 60_000);
    return () => clearInterval(interval);
  }, [loadGameState]);

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2000);
  }, []);

  const handleKey = useCallback(
    async (key: string) => {
      if (gameStatus !== 'playing' || isRevealing) return;

      if (key === 'backspace') {
        setCurrentGuess((g) => g.slice(0, -1));
        return;
      }

      if (key === 'enter') {
        if (currentGuess.length < 5) {
          showMessage('Complete a palavra (5 letras)');
          return;
        }

        try {
          const result = await submitGuess(currentGuess, getPlayerId());
          const newAttempt: Attempt = { guess: currentGuess, results: result.results };
          const newAttempts = [...attempts, newAttempt];
          const rowIndex = attempts.length;

          setAttempts(newAttempts);
          setCurrentGuess('');
          setGameNumber(result.gameNumber);
          gameNumberRef.current = result.gameNumber;
          setRevealingRow(rowIndex);
          setIsRevealing(true);

          // Update keyboard colors after reveal animation finishes
          setTimeout(() => {
            setLetterStatuses((prev) => {
              const updated = { ...prev };
              for (let i = 0; i < 5; i++) {
                const letter = newAttempt.guess[i];
                const current = updated[letter];
                const next = result.results[i];
                if (!current || priority(next) > priority(current)) {
                  updated[letter] = next;
                }
              }
              return updated;
            });
            setRevealingRow(undefined);
            setIsRevealing(false);

            if (result.gameOver) {
              setGameStatus(result.won ? 'won' : 'lost');
              setRevealedWord(result.revealedWord);
              updateStatsAfterGame(result.won, newAttempts.length);
              setTimeout(() => setShowStats(true), 1500);
            }
          }, REVEAL_TOTAL_MS);
        } catch (err: any) {
          showMessage(err.message || 'Erro ao enviar tentativa');
        }
        return;
      }

      if (/^[a-z]$/.test(key) && currentGuess.length < 5) {
        setCurrentGuess((g) => g + key);
      }
    },
    [currentGuess, attempts, gameStatus, isRevealing, showMessage],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter') handleKey('enter');
      else if (e.key === 'Backspace') handleKey('backspace');
      else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toLowerCase());
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey]);

  return (
    <main className="flex min-h-dvh flex-col items-center">
      <header className="flex w-full items-center justify-between border-b border-gray-800 px-5 py-4">
        <button
          onClick={() => setShowRules(true)}
          className="flex items-center justify-center w-10 h-10 rounded-[10px] bg-[#1f2937] text-gray-300 hover:text-white transition"
          aria-label="Regras"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="17" r="1" fill="currentColor"/>
          </svg>
        </button>
        <h1 className="font-sans text-[28px] sm:text-[32px] font-bold tracking-tight">
          LETRECO
        </h1>
        <button
          onClick={() => setShowStats(true)}
          className="flex items-center justify-center w-10 h-10 rounded-[10px] bg-[#1f2937] text-gray-300 hover:text-white transition"
          aria-label="Estatísticas"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </header>

      {message && (
        <div className="absolute top-20 z-50 rounded-lg bg-gray-800 px-6 py-3 text-sm font-medium text-gray-50 shadow-lg">
          {message}
        </div>
      )}

      {gameStatus === 'won' && (
        <div className="pt-4 text-center">
          <p className="text-2xl font-bold text-[#059669]">Parabéns!</p>
          <p className="text-sm text-gray-400">Você acertou em {attempts.length} tentativa{attempts.length > 1 ? 's' : ''}</p>
        </div>
      )}

      {gameStatus === 'lost' && revealedWord && (
        <div className="pt-4 text-center">
          <p className="text-2xl font-bold text-red-500">Não foi dessa vez!</p>
          <p className="text-sm text-gray-400">
            A palavra era <span className="font-mono font-bold text-gray-50">{revealedWord.toUpperCase()}</span>
          </p>
        </div>
      )}

      <GameBoard
        attempts={attempts}
        currentGuess={currentGuess}
        currentRow={attempts.length}
        revealingRow={revealingRow}
      />

      <div className="mt-auto pb-6 sm:pb-10 w-full flex justify-center">
        <Keyboard
          letterStatuses={letterStatuses}
          onKey={handleKey}
          disabled={gameStatus !== 'playing'}
        />
      </div>

      {showRules && (
        <RulesModal onClose={() => setShowRules(false)} />
      )}

      {showStats && (
        <StatsModal
          stats={getStats()}
          gameNumber={gameNumber}
          attempts={attempts}
          won={gameStatus === 'won'}
          onClose={() => setShowStats(false)}
        />
      )}
    </main>
  );
}

function priority(status: LetterStatus): number {
  if (status === LetterStatus.CORRECT) return 3;
  if (status === LetterStatus.PRESENT) return 2;
  return 1;
}
