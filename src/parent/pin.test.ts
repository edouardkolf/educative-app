import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  checkRecoveryAnswer,
  createRecoveryChallenge,
  generateSalt,
  hashPin,
  isValidPin,
  verifyPin,
} from './pin';

describe('hashPin', () => {
  it('est déterministe pour un sel donné et vaut SHA-256(sel + code)', async () => {
    const salt = 'abcd1234abcd1234abcd1234abcd1234';
    const pin = '4271';
    const expected = createHash('sha256').update(salt + pin).digest('hex');

    const hash1 = await hashPin(pin, salt);
    const hash2 = await hashPin(pin, salt);

    expect(hash1).toBe(expected);
    expect(hash2).toBe(hash1);
  });

  it('change si le sel change', async () => {
    const a = await hashPin('1234', 'sel-a');
    const b = await hashPin('1234', 'sel-b');
    expect(a).not.toBe(b);
  });
});

describe('verifyPin', () => {
  it('accepte le bon code', async () => {
    const salt = generateSalt();
    const hash = await hashPin('5678', salt);
    await expect(verifyPin('5678', salt, hash)).resolves.toBe(true);
  });

  it('rejette un mauvais code', async () => {
    const salt = generateSalt();
    const hash = await hashPin('5678', salt);
    await expect(verifyPin('0000', salt, hash)).resolves.toBe(false);
  });
});

describe('generateSalt', () => {
  it('produit 32 caractères hexadécimaux', () => {
    expect(generateSalt()).toMatch(/^[0-9a-f]{32}$/);
  });

  it('est aléatoire (deux sels différents)', () => {
    expect(generateSalt()).not.toBe(generateSalt());
  });
});

describe('isValidPin', () => {
  it('accepte exactement 4 chiffres', () => {
    expect(isValidPin('0000')).toBe(true);
    expect(isValidPin('1234')).toBe(true);
  });

  it('refuse tout le reste', () => {
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('12345')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
    expect(isValidPin('')).toBe(false);
  });
});

describe('code oublié (multiplication)', () => {
  it('tire a et b entre 12 et 29 inclus', () => {
    for (let i = 0; i < 50; i++) {
      const { a, b } = createRecoveryChallenge();
      expect(a).toBeGreaterThanOrEqual(12);
      expect(a).toBeLessThanOrEqual(29);
      expect(b).toBeGreaterThanOrEqual(12);
      expect(b).toBeLessThanOrEqual(29);
    }
  });

  it('ne valide que le bon produit', () => {
    const challenge = { a: 13, b: 17 };
    expect(checkRecoveryAnswer(challenge, 221)).toBe(true);
    expect(checkRecoveryAnswer(challenge, 220)).toBe(false);
  });
});
