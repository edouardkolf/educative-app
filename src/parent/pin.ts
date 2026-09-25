// Code parent : hachage et vérification (logique pure, testée en isolation — voir pin.test.ts).
// Empreinte = SHA-256 hex de `sel + code`, calculée via crypto.subtle (ARCHITECTURE §8).

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Vrai si `value` est un code à 4 chiffres. */
export function isValidPin(value: string): boolean {
  return /^\d{4}$/.test(value);
}

/** Sel aléatoire de 16 octets, encodé en hexadécimal (32 caractères). */
export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

/** Empreinte SHA-256 (hex) de `sel + code`. */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(salt + pin);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(digest));
}

/** Compare un code saisi à l'empreinte stockée. */
export async function verifyPin(pin: string, salt: string, hash: string): Promise<boolean> {
  return (await hashPin(pin, salt)) === hash;
}

/** Calcul « code oublié » : un adulte multiplie deux nombres entre 12 et 29. */
export interface RecoveryChallenge {
  a: number;
  b: number;
}

function randomInt(min: number, max: number): number {
  // Borne max incluse.
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function createRecoveryChallenge(): RecoveryChallenge {
  return { a: randomInt(12, 29), b: randomInt(12, 29) };
}

export function checkRecoveryAnswer(challenge: RecoveryChallenge, answer: number): boolean {
  return answer === challenge.a * challenge.b;
}
