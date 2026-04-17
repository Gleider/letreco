import { WordService } from '../word.service';
import wordsJson = require('../../seed/words.json');

const words: string[] = Array.isArray(wordsJson)
  ? wordsJson
  : (wordsJson as any).default ?? Object.values(wordsJson);

describe('Word validation', () => {
  describe('isKeyboardCompatible', () => {
    it('should accept words with only a-z letters', () => {
      expect(WordService.isKeyboardCompatible('mundo')).toBe(true);
      expect(WordService.isKeyboardCompatible('cravo')).toBe(true);
      expect(WordService.isKeyboardCompatible('plano')).toBe(true);
    });

    it('should reject words with accented characters', () => {
      expect(WordService.isKeyboardCompatible('ações')).toBe(false);
      expect(WordService.isKeyboardCompatible('maçãs')).toBe(false);
      expect(WordService.isKeyboardCompatible('avião')).toBe(false);
      expect(WordService.isKeyboardCompatible('café!')).toBe(false);
      expect(WordService.isKeyboardCompatible('ababá')).toBe(false);
      expect(WordService.isKeyboardCompatible('úmido')).toBe(false);
    });

    it('should reject words with wrong length', () => {
      expect(WordService.isKeyboardCompatible('casa')).toBe(false);
      expect(WordService.isKeyboardCompatible('casaco')).toBe(false);
    });

    it('should reject words with numbers or symbols', () => {
      expect(WordService.isKeyboardCompatible('abc12')).toBe(false);
      expect(WordService.isKeyboardCompatible('ab-cd')).toBe(false);
    });
  });

  describe('words.json seed file', () => {
    it('should contain only keyboard-compatible words', () => {
      const invalid = words.filter(
        (w: string) => !WordService.isKeyboardCompatible(w),
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
