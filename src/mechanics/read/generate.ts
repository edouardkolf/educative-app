// Génération pure des manches de la mécanique « Lis et montre ». Aucun DOM, aucun stockage.
//
// Contre l'heuristique « taper l'image qui ressemble le plus aux autres » : on ne construit plus une
// bonne image puis N images fausses à un trait chacune (la bonne porte alors la valeur majoritaire de
// chaque trait, ce qui se repère sans lire). Chaque manche suit un des plans ci-dessous, tous symétriques
// (chaque valeur de chaque trait apparaît sur le même nombre d'images) :
//   - 3 images, UN trait : noun (sujet + 2 sosies) ou position (3 positions), même valeur pour les autres
//     traits partout ;
//   - 3 images, négation : {vraie position ✔}, {position citée, même nombre ✗}, {position citée, nombre
//     inversé ✗} ;
//   - 4 images, DEUX traits croisés (plan 2×2 ab / a'b / ab' / a'b'), sur une phrase ou, avec 2 phrases,
//     un trait par phrase (il faut alors lire les deux).
import { ANCHOR_RELATIONS } from '../../engine/types';
import type { AnchorId, ChoiceId, ReadParams, Relation, Rng, Round } from '../../engine/types';
import { ANCHOR_IDS, SUBJECTS, SUBJECT_IDS, anchorPhrase, capitalize, subjectPhrase, usableRelations } from './catalog';
import type { SubjectId } from './catalog';
import type { Placement, ReadRoundData, Scene } from './types';

/** Toutes les positions que ce support sait montrer (répertoire complet, indépendant de `relations`). */
function fullRelations(anchor: AnchorId): readonly Relation[] {
  return ANCHOR_RELATIONS[anchor] as readonly Relation[];
}

// ---------- Traits et faisabilité structurelle (ne dépend que du catalogue et des paramètres) ----------

export type TraitKind = 'noun' | 'number' | 'position';

function hasTrioSubject(): boolean {
  return SUBJECT_IDS.some((id) => SUBJECTS[id].lookAlikes.length >= 2);
}

function hasLookAlikeSubject(): boolean {
  return SUBJECT_IDS.some((id) => SUBJECTS[id].lookAlikes.length >= 1);
}

/** Supports dont l'intersection avec `relations` (les positions lisibles) atteint `min` éléments. */
function anchorsWithIntersect(relations: readonly Relation[], min: number): AnchorId[] {
  return ANCHOR_IDS.filter((a) => usableRelations(a, relations).length >= min);
}

/** Traits individuellement exploitables (indépendamment les uns des autres) avec ces paramètres. */
function availableTraits(params: ReadParams): TraitKind[] {
  const traits: TraitKind[] = [];
  if (params.traps.includes('noun') && hasLookAlikeSubject()) traits.push('noun');
  if (params.traps.includes('number')) traits.push('number');
  if (params.traps.includes('position') && anchorsWithIntersect(params.relations, 2).length > 0) traits.push('position');
  return traits;
}

export type RoundKind =
  | { type: 'noun3' }
  | { type: 'position3' }
  | { type: 'negation3' }
  | { type: 'cross4'; pair: [TraitKind, TraitKind] }
  | { type: 'twoSentenceCross4' };

/** Description FR d'un type de manche, pour l'espace parent / les rapports (hors contrat). */
export function describeRoundKind(kind: RoundKind): string {
  switch (kind.type) {
    case 'noun3':
      return 'noun3 : 3 images, un sujet et ses 2 sosies, même position';
    case 'position3':
      return 'position3 : 3 images, 3 positions différentes, même sujet';
    case 'negation3':
      return 'negation3 : 3 images (une phrase niée), position vraie / affirmation / nombre inversé';
    case 'cross4':
      return `cross4(${kind.pair[0]}×${kind.pair[1]}) : 4 images, 2 traits croisés sur une phrase`;
    case 'twoSentenceCross4':
      return 'twoSentenceCross4 : 4 images, 2 phrases, un trait par phrase (il faut lire les deux)';
  }
}

/**
 * Types de manche réalisables avec ces paramètres (structurel, ne dépend pas du hasard). Utilisé par le
 * générateur (tirage du type de manche) et par validateParams (une liste vide = niveau irréalisable).
 */
export function computeFeasibleKinds(params: ReadParams): RoundKind[] {
  const sentences = params.sentences >= 2 ? 2 : 1;
  const choices = params.choices === 4 ? 4 : 3;
  const kinds: RoundKind[] = [];

  if (sentences === 1 && choices === 3) {
    if (params.traps.includes('noun') && hasTrioSubject()) kinds.push({ type: 'noun3' });
    if (params.traps.includes('position') && anchorsWithIntersect(params.relations, 3).length > 0) {
      kinds.push({ type: 'position3' });
    }
    if (
      params.traps.includes('negation') &&
      params.traps.includes('number') &&
      ANCHOR_IDS.some((a) => usableRelations(a, params.relations).length >= 1 && fullRelations(a).length >= 2)
    ) {
      kinds.push({ type: 'negation3' });
    }
  } else if (sentences === 1 && choices === 4) {
    const traits = availableTraits(params);
    for (let i = 0; i < traits.length; i += 1) {
      for (let j = i + 1; j < traits.length; j += 1) {
        kinds.push({ type: 'cross4', pair: [traits[i] as TraitKind, traits[j] as TraitKind] });
      }
    }
  } else if (sentences === 2 && choices === 4) {
    if (availableTraits(params).length > 0) kinds.push({ type: 'twoSentenceCross4' });
  }

  return kinds;
}

// ---------- Couverture des positions : chaque relation de `relations` sort au moins une fois ----------

interface Coverage {
  /** Renvoie une relation de `usable` à privilégier (couverture), ou undefined si `usable` est vide. */
  prefer(usable: ReadonlySet<Relation>, rng: Rng): Relation | undefined;
  mark(r: Relation): void;
}

function createCoverage(relations: readonly Relation[]): Coverage {
  let remaining = new Set(relations);
  return {
    prefer(usable, rng) {
      const notYetSeen = [...remaining].filter((r) => usable.has(r));
      const pool = notYetSeen.length > 0 ? notYetSeen : [...usable];
      if (pool.length === 0) return undefined;
      return rng.pick(pool);
    },
    mark(r) {
      remaining.delete(r);
      if (remaining.size === 0) remaining = new Set(relations);
    },
  };
}

function unionCitable(anchors: readonly AnchorId[], relations: readonly Relation[]): Set<Relation> {
  const s = new Set<Relation>();
  for (const a of anchors) for (const r of usableRelations(a, relations)) s.add(r);
  return s;
}

/** Pioche un support parmi ceux qui savent montrer `relation`, en préférant varier par rapport à `avoid`. */
function pickAnchorFor(candidates: readonly AnchorId[], relation: Relation, avoid: AnchorId | undefined, rng: Rng): AnchorId {
  const withRelation = candidates.filter((a) => usableRelations(a, [relation]).length > 0);
  const varied = avoid ? withRelation.filter((a) => a !== avoid) : withRelation;
  const pool = varied.length > 0 ? varied : withRelation;
  return rng.pick(pool.length > 0 ? pool : candidates);
}

// ---------- Sujets ----------

function pickSubject(rng: Rng, pool: readonly SubjectId[], exclude: readonly SubjectId[]): SubjectId {
  const candidates = pool.filter((id) => !exclude.includes(id));
  return rng.pick(candidates.length > 0 ? candidates : pool);
}

function subjectsWithLookAlikes(min: number): SubjectId[] {
  return SUBJECT_IDS.filter((id) => SUBJECTS[id].lookAlikes.length >= min);
}

// ---------- Phrases et placements ----------

interface Fact {
  subjectId: SubjectId;
  count: 1 | 3;
  anchor: AnchorId;
  relation: Relation;
}

function placementOf(f: Fact): Placement {
  return { emoji: SUBJECTS[f.subjectId].emoji, count: f.count, relation: f.relation, anchor: f.anchor };
}

function factText(f: Fact, negated: boolean): string {
  const subject = capitalize(subjectPhrase(f.subjectId, f.count));
  const verb = f.count === 1 ? (negated ? "n'est pas" : 'est') : negated ? 'ne sont pas' : 'sont';
  return `${subject} ${verb} ${anchorPhrase(f.anchor, f.relation)}.`;
}

/** La valeur "primée" (a') d'un trait pour ce fait : un seul champ du placement change. */
function traitOverride(rng: Rng, trait: TraitKind, fact: Fact, relations: readonly Relation[]): Partial<Placement> {
  if (trait === 'noun') {
    const lookAlike = rng.pick(SUBJECTS[fact.subjectId].lookAlikes);
    return { emoji: SUBJECTS[lookAlike].emoji };
  }
  if (trait === 'number') {
    return { count: fact.count === 1 ? 3 : 1 };
  }
  const alt = usableRelations(fact.anchor, relations).filter((r) => r !== fact.relation);
  return { relation: rng.pick(alt) };
}

// ---------- Contexte de génération (état qui varie manche après manche) ----------

interface GenContext {
  rng: Rng;
  params: ReadParams;
  coverage: Coverage;
  subjectPool: readonly SubjectId[];
  lastAnchor: AnchorId | undefined;
  lastFirstSubject: SubjectId | undefined;
}

/** Choisit citedRelation + support pour un rôle qui a besoin d'au moins `minIntersect` positions utilisables. */
function pickCitedAndAnchor(
  ctx: GenContext,
  minIntersect: number,
  avoidAnchor?: AnchorId,
): { relation: Relation; anchor: AnchorId } {
  const qualifying = anchorsWithIntersect(ctx.params.relations, minIntersect).filter((a) => a !== avoidAnchor);
  const pool = qualifying.length > 0 ? qualifying : anchorsWithIntersect(ctx.params.relations, minIntersect);
  const usable = unionCitable(pool, ctx.params.relations);
  const relation = ctx.coverage.prefer(usable, ctx.rng) ?? ctx.rng.pick(ctx.params.relations);
  ctx.coverage.mark(relation);
  const anchor = pickAnchorFor(pool, relation, ctx.lastAnchor, ctx.rng);
  return { relation, anchor };
}

// ---------- Constructeurs de manche (un par plan) ----------

interface Built {
  text: string;
  scenes: Scene[];
  correctIndex: number;
  firstSubjectId: SubjectId;
}

function buildNoun3(ctx: GenContext): Built {
  const subjectId = pickSubject(ctx.rng, subjectsWithLookAlikes(2), ctx.lastFirstSubject ? [ctx.lastFirstSubject] : []);
  const { relation, anchor } = pickCitedAndAnchor(ctx, 1);
  const count = ctx.rng.pick([1, 3] as const);
  const fact: Fact = { subjectId, count, anchor, relation };
  const correct = placementOf(fact);

  const [alike1, alike2] = ctx.rng.shuffle(SUBJECTS[subjectId].lookAlikes) as [SubjectId, SubjectId];
  const scenes: Scene[] = [
    { placements: [correct] },
    { placements: [{ ...correct, emoji: SUBJECTS[alike1].emoji }] },
    { placements: [{ ...correct, emoji: SUBJECTS[alike2].emoji }] },
  ];
  return { text: factText(fact, false), scenes, correctIndex: 0, firstSubjectId: subjectId };
}

function buildPosition3(ctx: GenContext): Built {
  const { relation, anchor } = pickCitedAndAnchor(ctx, 3);
  const subjectId = pickSubject(ctx.rng, ctx.subjectPool, ctx.lastFirstSubject ? [ctx.lastFirstSubject] : []);
  const count = ctx.rng.pick([1, 3] as const);
  const fact: Fact = { subjectId, count, anchor, relation };
  const correct = placementOf(fact);

  const others = usableRelations(anchor, ctx.params.relations).filter((r) => r !== relation);
  const [other1, other2] = ctx.rng.shuffle(others) as [Relation, Relation];
  const scenes: Scene[] = [
    { placements: [correct] },
    { placements: [{ ...correct, relation: other1 }] },
    { placements: [{ ...correct, relation: other2 }] },
  ];
  return { text: factText(fact, false), scenes, correctIndex: 0, firstSubjectId: subjectId };
}

function buildNegation3(ctx: GenContext): Built {
  const { relation: cited, anchor } = pickCitedAndAnchor(ctx, 1);
  const subjectId = pickSubject(ctx.rng, ctx.subjectPool, ctx.lastFirstSubject ? [ctx.lastFirstSubject] : []);
  const n = ctx.rng.pick([1, 3] as const);
  const nPrime = n === 1 ? 3 : 1;

  // La bonne image se pose sur une AUTRE position que celle citée : en priorité dans `relations`, sinon
  // n'importe où ailleurs sur ce support (une image n'a pas besoin d'être une phrase lisible pour être vraie).
  const withinRelations = usableRelations(anchor, ctx.params.relations).filter((r) => r !== cited);
  const anyOther = fullRelations(anchor).filter((r) => r !== cited);
  const truePosition = ctx.rng.pick(withinRelations.length > 0 ? withinRelations : anyOther);

  const correct: Placement = { emoji: SUBJECTS[subjectId].emoji, count: n, relation: truePosition, anchor };
  const affirmation: Placement = { ...correct, relation: cited };
  const numberFlipAtCited: Placement = { ...affirmation, count: nPrime };

  const scenes: Scene[] = [{ placements: [correct] }, { placements: [affirmation] }, { placements: [numberFlipAtCited] }];
  const fact: Fact = { subjectId, count: n, anchor, relation: cited };
  return { text: factText(fact, true), scenes, correctIndex: 0, firstSubjectId: subjectId };
}

function buildCross4(ctx: GenContext, pair: [TraitKind, TraitKind]): Built {
  const minIntersect = pair.includes('position') ? 2 : 1;
  const { relation, anchor } = pickCitedAndAnchor(ctx, minIntersect);
  const needsLookAlike = pair.includes('noun');
  const subjectId = pickSubject(
    ctx.rng,
    needsLookAlike ? subjectsWithLookAlikes(1) : ctx.subjectPool,
    ctx.lastFirstSubject ? [ctx.lastFirstSubject] : [],
  );
  const count = ctx.rng.pick([1, 3] as const);
  const fact: Fact = { subjectId, count, anchor, relation };
  const correct = placementOf(fact);

  const ov1 = traitOverride(ctx.rng, pair[0], fact, ctx.params.relations);
  const ov2 = traitOverride(ctx.rng, pair[1], fact, ctx.params.relations);
  const scenes: Scene[] = [
    { placements: [correct] }, // ab (vrai)
    { placements: [{ ...correct, ...ov1 }] }, // a'b
    { placements: [{ ...correct, ...ov2 }] }, // ab'
    { placements: [{ ...correct, ...ov1, ...ov2 }] }, // a'b'
  ];
  return { text: factText(fact, false), scenes, correctIndex: 0, firstSubjectId: subjectId };
}

function buildTwoSentenceCross4(ctx: GenContext): Built {
  const traits = availableTraits(ctx.params);
  const t1 = ctx.rng.pick(traits) as TraitKind;
  const t2 = ctx.rng.pick(traits) as TraitKind;

  const min1 = t1 === 'position' ? 2 : 1;
  const { relation: rel1, anchor: anchor1 } = pickCitedAndAnchor(ctx, min1);
  const subject1 = pickSubject(
    ctx.rng,
    t1 === 'noun' ? subjectsWithLookAlikes(1) : ctx.subjectPool,
    ctx.lastFirstSubject ? [ctx.lastFirstSubject] : [],
  );
  const count1 = ctx.rng.pick([1, 3] as const);
  const fact1: Fact = { subjectId: subject1, count: count1, anchor: anchor1, relation: rel1 };

  const min2 = t2 === 'position' ? 2 : 1;
  const { relation: rel2, anchor: anchor2 } = pickCitedAndAnchor(ctx, min2, anchor1);
  const subject2 = pickSubject(ctx.rng, t2 === 'noun' ? subjectsWithLookAlikes(1) : ctx.subjectPool, [subject1]);
  const count2 = ctx.rng.pick([1, 3] as const);
  const fact2: Fact = { subjectId: subject2, count: count2, anchor: anchor2, relation: rel2 };

  const correct1 = placementOf(fact1);
  const correct2 = placementOf(fact2);
  const ov1 = traitOverride(ctx.rng, t1, fact1, ctx.params.relations);
  const ov2 = traitOverride(ctx.rng, t2, fact2, ctx.params.relations);

  const scenes: Scene[] = [
    { placements: [correct1, correct2] }, // ab (les 2 phrases vraies)
    { placements: [{ ...correct1, ...ov1 }, correct2] }, // a'b : phrase 1 fausse
    { placements: [correct1, { ...correct2, ...ov2 }] }, // ab' : phrase 2 fausse
    { placements: [{ ...correct1, ...ov1 }, { ...correct2, ...ov2 }] }, // a'b' : les 2 fausses
  ];
  const text = `${factText(fact1, false)} ${factText(fact2, false)}`;
  return { text, scenes, correctIndex: 0, firstSubjectId: subject1 };
}

function build(ctx: GenContext, kind: RoundKind): Built {
  switch (kind.type) {
    case 'noun3':
      return buildNoun3(ctx);
    case 'position3':
      return buildPosition3(ctx);
    case 'negation3':
      return buildNegation3(ctx);
    case 'cross4':
      return buildCross4(ctx, kind.pair);
    case 'twoSentenceCross4':
      return buildTwoSentenceCross4(ctx);
  }
}

// ---------- Orchestration ----------

export function generateRounds(params: ReadParams, count: number, rng: Rng): Round<ReadRoundData>[] {
  const kinds = computeFeasibleKinds(params);
  if (kinds.length === 0) {
    // Configuration irréalisable (validateParams doit normalement l'avoir déjà refusée) : rien à générer.
    return [];
  }

  const ctx: GenContext = {
    rng,
    params,
    coverage: createCoverage(params.relations),
    subjectPool: SUBJECT_IDS,
    lastAnchor: undefined,
    lastFirstSubject: undefined,
  };

  const rounds: Round<ReadRoundData>[] = [];
  const seenTexts = new Set<string>();

  for (let i = 0; i < count; i += 1) {
    let built: Built | null = null;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const kind = rng.pick(kinds);
      const candidate = build(ctx, kind);
      if (seenTexts.has(candidate.text) && attempt < 11) continue; // évite une manche identique
      built = candidate;
      break;
    }
    if (!built) built = build(ctx, rng.pick(kinds));

    seenTexts.add(built.text);

    const order = rng.shuffle(built.scenes.map((_, idx) => idx));
    const choices = order.map((sceneIndex, position) => ({
      id: `img-${position}` as ChoiceId,
      scene: built.scenes[sceneIndex] as Scene,
    }));
    const answerPosition = order.indexOf(built.correctIndex);
    const answer = (choices[answerPosition] as (typeof choices)[number]).id;

    rounds.push({ data: { text: built.text, choices }, answer });

    ctx.lastFirstSubject = built.firstSubjectId;
    const lastPlacement = built.scenes[built.correctIndex]?.placements.slice(-1)[0];
    if (lastPlacement) ctx.lastAnchor = lastPlacement.anchor;
  }

  return rounds;
}
