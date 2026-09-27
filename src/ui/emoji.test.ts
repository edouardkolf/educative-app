import { describe, expect, it } from 'vitest';
import { emojiUrl, notoFileName } from './emoji';

describe('notoFileName', () => {
  it('un seul codepoint', () => {
    expect(notoFileName('🍎')).toBe('emoji_u1f34e');
  });

  it('retire le sélecteur de variation U+FE0F', () => {
    expect(notoFileName('☀️')).toBe('emoji_u2600');
    expect(notoFileName('🛏️')).toBe('emoji_u1f6cf');
  });

  it('plusieurs codepoints (multi-caractères)', () => {
    // ⛸️ = U+26F8 U+FE0F → un seul codepoint significatif après filtrage du sélecteur.
    expect(notoFileName('⛸️')).toBe('emoji_u26f8');
  });
});

describe('emojiUrl', () => {
  it('préfixe avec BASE_URL et pointe vers public/emoji/<nom>.svg', () => {
    expect(emojiUrl('🍎')).toBe(`${import.meta.env.BASE_URL}emoji/emoji_u1f34e.svg`);
  });
});
