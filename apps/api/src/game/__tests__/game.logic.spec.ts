import { evaluateGuess } from '../game.logic';
import { LetterStatus } from '@letreco/shared';

const { CORRECT, PRESENT, ABSENT } = LetterStatus;

describe('evaluateGuess', () => {
  it('should return all correct for exact match', () => {
    expect(evaluateGuess('cravo', 'cravo')).toEqual([
      CORRECT, CORRECT, CORRECT, CORRECT, CORRECT,
    ]);
  });

  it('should mark absent letters and correct in same guess', () => {
    // 'o' is at position 5 in both → correct, rest absent
    expect(evaluateGuess('mundo', 'cravo')).toEqual([
      ABSENT, ABSENT, ABSENT, ABSENT, CORRECT,
    ]);
  });

  it('should mark present letters in wrong position', () => {
    expect(evaluateGuess('vapor', 'cravo')).toEqual([
      PRESENT, PRESENT, ABSENT, PRESENT, PRESENT,
    ]);
  });

  it('should handle repeated letter: 1 correct + 1 absent', () => {
    // answer has one 'a', guess has two 'a's — first in correct position
    expect(evaluateGuess('abaca', 'amigo')).toEqual([
      CORRECT, ABSENT, ABSENT, ABSENT, ABSENT,
    ]);
  });

  it('should handle repeated letter: 1 present + 1 absent', () => {
    // answer: "pedra", guess: "prado" — two letters not in right spots
    const result = evaluateGuess('prado', 'pedra');
    expect(result[0]).toBe(CORRECT); // p
    expect(result[1]).toBe(PRESENT); // r (exists in pedra)
    expect(result[2]).toBe(PRESENT); // a (exists in pedra)
    expect(result[3]).toBe(PRESENT); // d (exists in pedra)
    expect(result[4]).toBe(ABSENT);  // o (not in pedra)
  });

  it('should handle two same letters in answer and guess', () => {
    // answer: "letal", guess: "letal" — both l's correct
    expect(evaluateGuess('letal', 'letal')).toEqual([
      CORRECT, CORRECT, CORRECT, CORRECT, CORRECT,
    ]);
  });

  it('should prioritize correct over present for repeated letters', () => {
    // answer: "balao", guess: "abalo" — a appears twice in guess and answer
    const result = evaluateGuess('abalo', 'balao');
    // a: pos 0 — not at pos 0 in answer, but 'a' is at pos 1 and 3 → present
    // b: pos 1 — b is at pos 0 in answer → present
    // a: pos 2 — a is at pos 3 in answer (remaining) → present
    // l: pos 3 — l is at pos 2 in answer → present
    // o: pos 4 — o is at pos 4 in answer → correct
    expect(result[4]).toBe(CORRECT);
  });

  it('should return all absent for completely wrong guess', () => {
    expect(evaluateGuess('fuzil', 'pedra')).toEqual([
      ABSENT, ABSENT, ABSENT, ABSENT, ABSENT,
    ]);
  });

  it('should handle guess with 3 repeated letters, answer has 1', () => {
    // guess "aabaa" has 4 a's, answer "xaxxx" has 1 a at pos 1
    // pos 0: a — not correct, but a exists → present (consumes the one 'a')
    // pos 1: a — a is at pos 1 → correct (wait, pass 1 runs first)
    // Actually pass 1: pos 1 a===a → correct, remaining[1]=null
    // pass 2: pos 0 a → no remaining a → absent
    // pos 2: b → absent, pos 3: a → absent, pos 4: a → absent
    expect(evaluateGuess('aabaa', 'xaxxx')).toEqual([
      ABSENT, CORRECT, ABSENT, ABSENT, ABSENT,
    ]);
  });

  it('should handle guess with 2 of same letter, answer has 2 in different positions', () => {
    // guess "aalxx", answer "xxaal"
    // pass 1: no exact matches
    // pass 2: pos 0 a → found at pos 2 → present, pos 1 a → found at pos 3 → present
    // pos 2 l → found at pos 4 → present, pos 3 x → found at pos 0 → present
    // pos 4 x → found at pos 1 → present
    expect(evaluateGuess('aalxx', 'xxaal')).toEqual([
      PRESENT, PRESENT, PRESENT, PRESENT, PRESENT,
    ]);
  });

  it('should mark only first occurrence as present when answer has 1 of that letter', () => {
    // guess "aaxxx", answer "xxxxa"
    // pass 1: pos 2 x===x correct, pos 3 x===x correct
    // remaining: [x,x,null,null,a]
    // pass 2: pos 0 a → found at pos 4 → present
    // pos 1 a → no remaining a → absent
    // pos 2 already correct
    // pos 3 already correct
    // pos 4 x → found at pos 0 → present
    expect(evaluateGuess('aaxxx', 'xxxxa')).toEqual([
      PRESENT, ABSENT, CORRECT, CORRECT, PRESENT,
    ]);
  });

  it('should handle correct letter consuming it before present check', () => {
    // guess "abcba", answer "axxxb"
    // pass 1: pos 0 a===a → correct
    // remaining: [null,x,x,x,b]
    // pass 2: pos 1 b → found at pos 4 → present
    // pos 2 c → not found → absent
    // pos 3 b → no more b → absent
    // pos 4 a → no more a → absent
    expect(evaluateGuess('abcba', 'axxxb')).toEqual([
      CORRECT, PRESENT, ABSENT, ABSENT, ABSENT,
    ]);
  });

  it('should handle all letters the same in guess and answer', () => {
    expect(evaluateGuess('aaaaa', 'aaaaa')).toEqual([
      CORRECT, CORRECT, CORRECT, CORRECT, CORRECT,
    ]);
  });

  it('should handle all same letter in guess but only some in answer', () => {
    // guess "aaaaa", answer "aaxxx"
    // pass 1: pos 0 correct, pos 1 correct
    // remaining: [null,null,x,x,x]
    // pass 2: pos 2,3,4 a → no remaining a → absent
    expect(evaluateGuess('aaaaa', 'aaxxx')).toEqual([
      CORRECT, CORRECT, ABSENT, ABSENT, ABSENT,
    ]);
  });

  it('should handle swapped pair', () => {
    // guess "abxxx", answer "baxxx"
    // pass 1: pos 2,3,4 correct
    // pass 2: pos 0 a → found at pos 1 → present, pos 1 b → found at pos 0 → present
    expect(evaluateGuess('abxxx', 'baxxx')).toEqual([
      PRESENT, PRESENT, CORRECT, CORRECT, CORRECT,
    ]);
  });
});
