export const LetterStatus = {
  CORRECT: 'correct',
  PRESENT: 'present',
  ABSENT: 'absent',
} as const;

export type LetterStatus = (typeof LetterStatus)[keyof typeof LetterStatus];

export interface GuessResult {
  results: LetterStatus[];
  attempt: number;
  gameOver: boolean;
  won: boolean;
  revealedWord?: string;
  gameNumber: number;
}

export interface GameState {
  attempts: { guess: string; results: LetterStatus[] }[];
  status: 'playing' | 'won' | 'lost';
  gameNumber: number;
}

export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  distribution: Record<number, number>;
}
