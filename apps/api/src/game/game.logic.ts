import { LetterStatus } from '@letreco/shared';

export function evaluateGuess(guess: string, answer: string): LetterStatus[] {
  const result: LetterStatus[] = new Array(5).fill(LetterStatus.ABSENT);
  const answerChars = answer.split('');
  const remaining: (string | null)[] = [...answerChars];

  // Pass 1: mark correct positions (green)
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) {
      result[i] = LetterStatus.CORRECT;
      remaining[i] = null;
    }
  }

  // Pass 2: mark present letters (yellow)
  for (let i = 0; i < 5; i++) {
    if (result[i] === LetterStatus.CORRECT) continue;

    const idx = remaining.indexOf(guess[i]);
    if (idx !== -1) {
      result[i] = LetterStatus.PRESENT;
      remaining[idx] = null;
    }
  }

  return result;
}
