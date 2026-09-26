// Tests du générateur « Lis et montre ». Un petit évaluateur de vérité (texte → scène) reconstitue
// indépendamment ce que chaque phrase affirme, pour vérifier que le générateur ne se trompe jamais.
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

// ---------- Comparaison de scènes : nombre de traits différents ----------

function placementDiffCount(a: Placement, b: Placement): number {
  let n = 0;
  if (a.emoji !== b.emoji) n += 1;
  if (a.count !== b.count) n += 1;
  if (a.relation !== b.relation) n += 1;
  if (a.anchor !== b.anchor) n += 1;
  return n;
}

function sceneDiffCount(a: Scene, b: Scene): number {
  let n = 0;
  for (let i = 0; i < a.placements.length; i += 1) {
    n += placementDiffCount(a.placements[i] as Placement, b.placements[i] as Placement);
  }
  return n;
}

function sceneKey(scene: Scene): string {
  return scene.placements.map((p) => `${p.emoji}|${p.count}|${p.relation}|${p.anchor}`).join('+');
}

// ---------- Cas de paramètres exercés ----------

const CASES: { name: string; params: ReadParams }[] = [
  { name: 'noun/on, 1 phrase, 3 choix', params: { traps: ['noun'], relations: ['on'], sentences: 1, choices: 3 } },
  {
    name: 'number+noun, on/under/beside, 3 choix',
    params: { traps: ['number', 'noun'], relations: ['on', 'under', 'beside'], sentences: 1, choices: 3 },
  },
  {
    name: 'position, on/under/beside',
    params: { traps: ['position'], relations: ['on', 'under', 'beside'], sentences: 1, choices: 3 },
  },
  {
    name: 'position, on/beside/in-front, 3 choix',
    params: { traps: ['position'], relations: ['on', 'beside', 'in-front'], sentences: 1, choices: 3 },
  },
  {
    name: 'negation+position, on/under/beside',
    params: { traps: ['negation', 'position', 'number'], relations: ['on', 'under', 'beside'], sentences: 1, choices: 3 },
  },
  {
    name: 'tous les pièges, toutes les relations, 4 choix',
    params: {
      traps: ['noun', 'number', 'position', 'negation'],
      relations: ['on', 'under', 'beside', 'in-front'],
      sentences: 1,
      choices: 4,
    },
  },
  {
    name: 'noun+position, 2 phrases, 3 choix',
    params: { traps: ['noun', 'position'], relations: ['on', 'under', 'beside'], sentences: 2, choices: 3 },
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
    it(`${name} : une seule image vraie, images distinctes, un seul trait différent (200 graines)`, () => {
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

          const correct = round.data.choices.find((c) => c.id === round.answer) as (typeof round.data.choices)[number];
          for (const choice of round.data.choices) {
            if (choice.id === round.answer) continue;
            expect(sceneDiffCount(correct.scene, choice.scene)).toBe(1);
          }
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
  }

  it('déterminisme : même graine → mêmes manches', () => {
    const params = CASES[5]?.params as ReadParams;
    const rounds1 = generateRounds(params, 10, createRng(42));
    const rounds2 = generateRounds(params, 10, createRng(42));
    expect(JSON.stringify(rounds1)).toBe(JSON.stringify(rounds2));
  });

  it('pas deux manches consécutives avec le même sujet en tête de phrase', () => {
    const params = CASES[5]?.params as ReadParams;
    for (const seed of SEEDS) {
      const rng = createRng(seed);
      const rounds = generateRounds(params, 10, rng);
      let previousFirstEmoji: string | undefined;
      for (const round of rounds) {
        const correct = round.data.choices.find((c) => c.id === round.answer) as (typeof round.data.choices)[number];
        const firstEmoji = correct.scene.placements[0]?.emoji;
        if (previousFirstEmoji) expect(firstEmoji).not.toBe(previousFirstEmoji);
        previousFirstEmoji = firstEmoji;
      }
    }
  });

  it('2 phrases : deux sujets différents et deux supports différents', () => {
    const params = CASES[6]?.params as ReadParams;
    for (const seed of SEEDS) {
      const rng = createRng(seed);
      const rounds = generateRounds(params, 6, rng);
      for (const round of rounds) {
        const correct = round.data.choices.find((c) => c.id === round.answer) as (typeof round.data.choices)[number];
        const [p1, p2] = correct.scene.placements as [Placement, Placement];
        expect(p1.emoji).not.toBe(p2.emoji);
        expect(p1.anchor).not.toBe(p2.anchor);
      }
    }
  });

  it('affiche 20 phrases générées pour relecture humaine', () => {
    const params: ReadParams = {
      traps: ['noun', 'number', 'position', 'negation'],
      relations: ['on', 'under', 'beside', 'in-front'],
      sentences: 1,
      choices: 4,
    };
    const rng = createRng(7);
    const rounds: Round<ReadRoundData>[] = generateRounds(params, 20, rng);
    // eslint-disable-next-line no-console
    console.log('\n--- 20 phrases « Lis et montre » (relecture humaine) ---');
    for (const round of rounds) {
      // eslint-disable-next-line no-console
      console.log(round.data.text);
    }
    expect(rounds).toHaveLength(20);
  });

  it("une phrase négative propose toujours l'image de l'affirmation (le piège de qui saute « ne… pas »)", () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const rounds = generateRounds(
        { traps: ['noun', 'number', 'position', 'negation'], relations: ['on', 'under', 'beside', 'in-front'], sentences: 1, choices: 4 },
        8,
        createRng(seed),
      );
      for (const round of rounds) {
        if (!round.data.text.includes(' pas ')) continue;
        const correct = round.data.choices.find((c) => c.id === round.answer)?.scene.placements[0];
        const affirmation = round.data.choices.some((c) => {
          const p = c.scene.placements[0];
          return c.id !== round.answer && p && correct && p.emoji === correct.emoji && p.count === correct.count && p.relation !== correct.relation;
        });
        expect(affirmation, round.data.text).toBe(true);
      }
    }
  });
});
