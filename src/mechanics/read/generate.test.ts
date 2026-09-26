// Tests du générateur « Lis et montre ». Un petit évaluateur de vérité (texte → scène) reconstitue
// indépendamment ce que chaque phrase affirme, pour vérifier que le générateur ne se trompe jamais, et
// une stratégie « heuristique visuelle » vérifie qu'aucune image ne se repère sans lire.
import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import { ANCHOR_RELATIONS } from '../../engine/types';
import type { AnchorId, ReadParams, Relation, Round } from '../../engine/types';
import { ANCHOR_IDS, SUBJECTS, SUBJECT_IDS, anchorPhrase, capitalize, subjectPhrase } from './catalog';
import { generateRounds } from './generate';
import type { Placement, ReadRoundData, Scene } from './types';

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);

// ---------- Évaluateur de vérité : texte → fait affirmé, indépendant du générateur ----------

interface ParsedStatement {
  subjectId: string;
  count: 1 | 3;
  anchor: AnchorId;
  relation: Relation;
  negated: boolean;
}

function parseSentence(sentence: string): ParsedStatement {
  let subject: { id: string; count: 1 | 3 } | undefined;
  for (const id of SUBJECT_IDS) {
    const entry = SUBJECTS[id];
    if (sentence.startsWith(capitalize(entry.singular) + ' ')) {
      subject = { id, count: 1 };
      break;
    }
    if (sentence.startsWith(capitalize(entry.plural) + ' ')) {
      subject = { id, count: 3 };
      break;
    }
  }
  if (!subject) throw new Error(`sujet introuvable dans "${sentence}"`);

  const negated = /n'est pas|ne sont pas/.test(sentence);

  let anchorRelation: { anchor: AnchorId; relation: Relation } | undefined;
  for (const anchor of ANCHOR_IDS) {
    for (const relation of ANCHOR_RELATIONS[anchor] as readonly Relation[]) {
      if (sentence.includes(anchorPhrase(anchor, relation))) {
        anchorRelation = { anchor, relation };
        break;
      }
    }
    if (anchorRelation) break;
  }
  if (!anchorRelation) throw new Error(`support introuvable dans "${sentence}"`);

  return { subjectId: subject.id, count: subject.count, ...anchorRelation, negated };
}

function parseText(text: string): ParsedStatement[] {
  return text
    .split(/(?<=\.)\s+/)
    .filter(Boolean)
    .map(parseSentence);
}

function placementSatisfies(p: Placement, st: ParsedStatement): boolean {
  const emoji = SUBJECTS[st.subjectId as keyof typeof SUBJECTS].emoji;
  if (p.emoji !== emoji || p.count !== st.count || p.anchor !== st.anchor) return false;
  return st.negated ? p.relation !== st.relation : p.relation === st.relation;
}

function sceneIsTrue(scene: Scene, statements: ParsedStatement[]): boolean {
  if (scene.placements.length !== statements.length) return false;
  return statements.every((st, i) => placementSatisfies(scene.placements[i] as Placement, st));
}

function sceneKey(scene: Scene): string {
  return scene.placements.map((p) => `${p.emoji}|${p.count}|${p.relation}|${p.anchor}`).join('+');
}

// ---------- Stratégie « heuristique visuelle », sans lire le texte ----------

const PLACEMENT_FIELDS = ['emoji', 'count', 'relation', 'anchor'] as const;

/** Score de chaque image = nombre de fois où chacun de ses champs apparaît chez les AUTRES images. */
function similarityScores(choices: { scene: Scene }[]): number[] {
  const placementCount = choices[0]?.scene.placements.length ?? 0;
  // fieldCounts[i][field] : combien de fois chaque valeur apparaît, pour la case i, tous choix confondus.
  const fieldCounts: Map<string, number>[][] = [];
  for (let i = 0; i < placementCount; i += 1) {
    fieldCounts.push(
      PLACEMENT_FIELDS.map((field) => {
        const counts = new Map<string, number>();
        for (const { scene } of choices) {
          const value = String(scene.placements[i]?.[field]);
          counts.set(value, (counts.get(value) ?? 0) + 1);
        }
        return counts;
      }),
    );
  }

  return choices.map(({ scene }) => {
    let score = 0;
    for (let i = 0; i < placementCount; i += 1) {
      PLACEMENT_FIELDS.forEach((field, fieldIndex) => {
        const counts = (fieldCounts[i] as Map<string, number>[])[fieldIndex] as Map<string, number>;
        const value = String(scene.placements[i]?.[field]);
        score += (counts.get(value) ?? 0) - 1; // -1 : ne compte pas sa propre occurrence
      });
    }
    return score;
  });
}

function argExtreme(scores: number[], pick: 'max' | 'min'): number {
  let best = 0;
  for (let i = 1; i < scores.length; i += 1) {
    if (pick === 'max' ? (scores[i] as number) > (scores[best] as number) : (scores[i] as number) < (scores[best] as number)) {
      best = i;
    }
  }
  return best;
}

// ---------- Comparaison de scènes ----------

function placementDiffCount(a: Placement, b: Placement): number {
  let n = 0;
  if (a.emoji !== b.emoji) n += 1;
  if (a.count !== b.count) n += 1;
  if (a.relation !== b.relation) n += 1;
  if (a.anchor !== b.anchor) n += 1;
  return n;
}

// ---------- Les 7 niveaux ce1-lire-01..07 (paramètres annoncés par le coordinateur) ----------

const CASES: { name: string; params: ReadParams }[] = [
  { name: 'ce1-lire-01 noun/on, 3 choix', params: { traps: ['noun'], relations: ['on'], sentences: 1, choices: 3 } },
  {
    name: 'ce1-lire-02 number+noun, on/beside, 4 choix',
    params: { traps: ['number', 'noun'], relations: ['on', 'beside'], sentences: 1, choices: 4 },
  },
  {
    name: 'ce1-lire-03 position, on/under/beside, 3 choix',
    params: { traps: ['position'], relations: ['on', 'under', 'beside'], sentences: 1, choices: 3 },
  },
  {
    name: 'ce1-lire-04 position, on/beside/in-front, 3 choix',
    params: { traps: ['position'], relations: ['on', 'beside', 'in-front'], sentences: 1, choices: 3 },
  },
  {
    name: 'ce1-lire-05 negation+number+position, on/under/beside, 3 choix',
    params: { traps: ['negation', 'number', 'position'], relations: ['on', 'under', 'beside'], sentences: 1, choices: 3 },
  },
  {
    name: 'ce1-lire-06 tous les pièges, 4 relations, 3 choix',
    params: {
      traps: ['noun', 'number', 'position', 'negation'],
      relations: ['on', 'under', 'beside', 'in-front'],
      sentences: 1,
      choices: 3,
    },
  },
  {
    name: 'ce1-lire-07 noun+number+position, 2 phrases, 4 choix',
    params: { traps: ['noun', 'number', 'position'], relations: ['on', 'under', 'beside'], sentences: 2, choices: 4 },
  },
];

// Vérification de forme, avant reconstruction précise (round-trip) : majuscule, ponctuation, verbe.
const SENTENCE_SHAPE_RE = /^[A-ZÀ-Ü].+ (est|sont|n'est pas|ne sont pas) .+\.$/;

/** Reconstruit la phrase attendue à partir du fait analysé : round-trip de grammaire. */
function reconstructSentence(st: ParsedStatement): string {
  const subject = capitalize(subjectPhrase(st.subjectId as Parameters<typeof subjectPhrase>[0], st.count));
  const verb = st.count === 1 ? (st.negated ? "n'est pas" : 'est') : st.negated ? 'ne sont pas' : 'sont';
  return `${subject} ${verb} ${anchorPhrase(st.anchor, st.relation)}.`;
}

describe('read/generateRounds', () => {
  for (const { name, params } of CASES) {
    it(`${name} : une seule image vraie, images distinctes, ${params.choices} images (200 graines)`, () => {
      for (const seed of SEEDS) {
        const rng = createRng(seed);
        const rounds = generateRounds(params, 8, rng);
        expect(rounds).toHaveLength(8);

        for (const round of rounds) {
          expect(round.data.choices).toHaveLength(params.choices);
          const statements = parseText(round.data.text);
          expect(statements).toHaveLength(params.sentences);

          const trueChoices = round.data.choices.filter((c) => sceneIsTrue(c.scene, statements));
          expect(trueChoices).toHaveLength(1);
          expect(trueChoices[0]?.id).toBe(round.answer);

          const keys = round.data.choices.map((c) => sceneKey(c.scene));
          expect(new Set(keys).size).toBe(keys.length); // toutes les images distinctes
        }
      }
    });

    it(`${name} : grammaire correcte (forme + round-trip, 200 graines)`, () => {
      for (const seed of SEEDS) {
        const rng = createRng(seed);
        const rounds = generateRounds(params, 5, rng);
        for (const round of rounds) {
          const sentences = round.data.text.split(/(?<=\.)\s+/).filter(Boolean);
          expect(sentences).toHaveLength(params.sentences);
          for (const sentence of sentences) {
            expect(sentence).toMatch(SENTENCE_SHAPE_RE);
            const parsed = parseSentence(sentence);
            expect(reconstructSentence(parsed)).toBe(sentence);
          }
        }
      }
    });

    it(`${name} : anti-heuristique (« le plus/moins de traits en commun » ne bat pas 1/choices + 0.1)`, () => {
      let maxHits = 0;
      let minHits = 0;
      let total = 0;
      for (const seed of SEEDS) {
        const rng = createRng(seed);
        const rounds = generateRounds(params, 6, rng);
        for (const round of rounds) {
          const scores = similarityScores(round.data.choices);
          const maxGuess = round.data.choices[argExtreme(scores, 'max')];
          const minGuess = round.data.choices[argExtreme(scores, 'min')];
          if (maxGuess?.id === round.answer) maxHits += 1;
          if (minGuess?.id === round.answer) minHits += 1;
          total += 1;
        }
      }
      const threshold = 1 / params.choices + 0.1;
      expect(maxHits / total).toBeLessThanOrEqual(threshold);
      expect(minHits / total).toBeLessThanOrEqual(threshold);
    });

    if (params.sentences === 2) {
      it(`${name} : les 2 phrases sont nécessaires (aucune ne suffit seule à écarter toutes les fausses)`, () => {
        for (const seed of SEEDS.slice(0, 50)) {
          const rng = createRng(seed);
          const rounds = generateRounds(params, 4, rng);
          for (const round of rounds) {
            const statements = parseText(round.data.text);
            // Ne garder que la phrase i : combien d'images restent compatibles avec elle seule ?
            for (let i = 0; i < statements.length; i += 1) {
              const compatible = round.data.choices.filter((c) =>
                placementSatisfies(c.scene.placements[i] as Placement, statements[i] as ParsedStatement),
              );
              expect(compatible.length).toBeGreaterThan(1); // il en resterait plus d'une : il faut lire l'autre phrase aussi
            }
          }
        }
      });
    }
  }

  it('couverture : chaque position de `relations` sort au moins une fois quand rounds ≥ |relations|', () => {
    const params: ReadParams = {
      traps: ['noun', 'number', 'position', 'negation'],
      relations: ['on', 'under', 'beside', 'in-front'],
      sentences: 1,
      choices: 3,
    };
    for (const seed of SEEDS) {
      const rng = createRng(seed);
      const rounds = generateRounds(params, params.relations.length, rng);
      const cited = new Set<Relation>();
      for (const round of rounds) {
        const [st] = parseText(round.data.text) as [ParsedStatement];
        cited.add(st.relation);
      }
      expect(cited.size).toBe(params.relations.length);
    }
  });

  it('déterminisme : même graine → mêmes manches', () => {
    const params = CASES[5]?.params as ReadParams;
    const rounds1 = generateRounds(params, 10, createRng(42));
    const rounds2 = generateRounds(params, 10, createRng(42));
    expect(JSON.stringify(rounds1)).toBe(JSON.stringify(rounds2));
  });

  it('images fausses : chaque image ne diffère de la bonne que sur les traits attendus (jamais de fantaisie)', () => {
    for (const { params } of CASES) {
      for (const seed of SEEDS.slice(0, 30)) {
        const rng = createRng(seed);
        const rounds = generateRounds(params, 4, rng);
        for (const round of rounds) {
          const correct = round.data.choices.find((c) => c.id === round.answer) as (typeof round.data.choices)[number];
          for (const choice of round.data.choices) {
            if (choice.id === round.answer) continue;
            let diff = 0;
            for (let i = 0; i < correct.scene.placements.length; i += 1) {
              diff += placementDiffCount(correct.scene.placements[i] as Placement, choice.scene.placements[i] as Placement);
            }
            expect(diff).toBeGreaterThan(0); // sinon ce serait une image dupliquée de la bonne
            expect(diff).toBeLessThanOrEqual(2); // jamais plus de 2 traits changés (nos plans max = negation3)
          }
        }
      }
    }
  });

  it('affiche 8 manches générées pour relecture humaine (phrase + images)', () => {
    const params: ReadParams = {
      traps: ['noun', 'number', 'position', 'negation'],
      relations: ['on', 'under', 'beside', 'in-front'],
      sentences: 1,
      choices: 4,
    };
    const rng = createRng(7);
    const rounds: Round<ReadRoundData>[] = generateRounds(params, 8, rng);
    // eslint-disable-next-line no-console
    console.log('\n--- 8 manches « Lis et montre » (relecture humaine) ---');
    for (const round of rounds) {
      const lines = round.data.choices.map((c) => {
        const mark = c.id === round.answer ? '✔' : '✗';
        const desc = c.scene.placements.map((p) => `${p.emoji}×${p.count} ${p.relation}/${p.anchor}`).join(' | ');
        return `    ${mark} ${c.id}: ${desc}`;
      });
      // eslint-disable-next-line no-console
      console.log(`${round.data.text}\n${lines.join('\n')}`);
    }
    expect(rounds).toHaveLength(8);
  });
});
