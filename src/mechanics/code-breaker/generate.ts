// Génération pure des manches du Code secret. Aucun DOM, aucun stockage.
import type { CodeBreakerParams, Color, Rng, Round } from '../../engine/types';
import type { CodeBreakerRoundData } from './types';

function drawCode(params: CodeBreakerParams, rng: Rng): Color[] {
  if (!params.repeats) return rng.shuffle(params.colors).slice(0, params.length);
  return Array.from({ length: params.length }, () => rng.pick(params.colors));
}

export function generateRounds(params: CodeBreakerParams, count: number, rng: Rng): Round<CodeBreakerRoundData>[] {
  const seen = new Set<string>();
  const rounds: Round<CodeBreakerRoundData>[] = [];
  for (let i = 0; i < count; i += 1) {
    let code = drawCode(params, rng);
    // Codes distincts tant que possible ; l'espace est petit (3² = 9), on borne les tentatives.
    for (let tries = 0; tries < 50 && seen.has(code.join('-')); tries += 1) code = drawCode(params, rng);
    seen.add(code.join('-'));
    rounds.push({
      data: { code, colors: [...params.colors], feedback: params.feedback, maxGuesses: params.maxGuesses },
      answer: code.join('-'),
    });
  }
  return rounds;
}
