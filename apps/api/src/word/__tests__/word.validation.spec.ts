import wordsJson = require('../../seed/words.json');

const words: string[] = Array.isArray(wordsJson)
  ? wordsJson
  : (wordsJson as any).default ?? Object.values(wordsJson);

const KEYBOARD_LETTERS = /^[a-z]{5}$/;

function isKeyboardCompatible(word: string): boolean {
  return KEYBOARD_LETTERS.test(word.toLowerCase());
}

describe('Word validation', () => {
  describe('isKeyboardCompatible', () => {
    it('should accept words with only a-z letters', () => {
      expect(isKeyboardCompatible('mundo')).toBe(true);
      expect(isKeyboardCompatible('cravo')).toBe(true);
      expect(isKeyboardCompatible('plano')).toBe(true);
    });

    it('should reject words with accented characters', () => {
      expect(isKeyboardCompatible('ações')).toBe(false);
      expect(isKeyboardCompatible('maçãs')).toBe(false);
      expect(isKeyboardCompatible('avião')).toBe(false);
      expect(isKeyboardCompatible('café!')).toBe(false);
      expect(isKeyboardCompatible('ababá')).toBe(false);
      expect(isKeyboardCompatible('úmido')).toBe(false);
    });

    it('should reject words with wrong length', () => {
      expect(isKeyboardCompatible('casa')).toBe(false);
      expect(isKeyboardCompatible('casaco')).toBe(false);
    });

    it('should reject words with numbers or symbols', () => {
      expect(isKeyboardCompatible('abc12')).toBe(false);
      expect(isKeyboardCompatible('ab-cd')).toBe(false);
    });
  });

  describe('words.json seed file', () => {
    it('should contain only keyboard-compatible words', () => {
      const invalid = words.filter(
        (w: string) => !isKeyboardCompatible(w),
      );
      expect(invalid).toEqual([]);
    });

    it('should contain only 5-letter words', () => {
      const wrongLength = words.filter((w: string) => w.length !== 5);
      expect(wrongLength).toEqual([]);
    });

    it('should have no duplicates', () => {
      const unique = new Set(words);
      expect(unique.size).toBe(words.length);
    });

    it('should have at least 5000 words', () => {
      expect(words.length).toBeGreaterThanOrEqual(5000);
    });
  });
});
