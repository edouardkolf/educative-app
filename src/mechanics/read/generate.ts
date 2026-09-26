// Génération pure des manches de la mécanique « Lis et montre ». Aucun DOM, aucun stockage.
import { ANCHOR_RELATIONS } from '../../engine/types';
import type { AnchorId, ChoiceId, ReadParams, Relation, Rng, Round } from '../../engine/types';
import { ANCHOR_IDS, SUBJECTS, SUBJECT_IDS, anchorPhrase, capitalize, subjectPhrase, usableRelations } from './catalog';
import type { SubjectId } from './catalog';
import type { Placement, ReadRoundData, Scene } from './types';

const MIN_CHOICES = 3;
const MAX_CHOICES = 4;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Un fait affirmé ou nié dans une phrase : « le lapin est sur la chaise ». */
interface Statement {
  subjectId: SubjectId;
  count: 1 | 3;
  anchor: AnchorId;
  /** Relation citée dans la phrase. */
  statedRelation: Relation;
  /** Relation réellement vraie (= statedRelation si la phrase est affirmative). */
  trueRelation: Relation;
  negated: boolean;
}

function placementOf(s: Statement): Placement {
  return { emoji: SUBJECTS[s.subjectId].emoji, count: s.count, relation: s.trueRelation, anchor: s.anchor };
}

function statementText(s: Statement): string {
  const subject = capitalize(subjectPhrase(s.subjectId, s.count));
  const verb = s.count === 1 ? (s.negated ? "n'est pas" : 'est') : s.negated ? 'ne sont pas' : 'sont';
  return `${subject} ${verb} ${anchorPhrase(s.anchor, s.statedRelation)}.`;
}

/** Toutes les positions que ce support sait montrer (indépendamment des positions lues dans les phrases). */
function fullRelations(anchor: AnchorId): readonly Relation[] {
  return ANCHOR_RELATIONS[anchor] as readonly Relation[];
}

/** Supports dont l'intersection avec les relations autorisées (pour la phrase lue) a au moins 1 élément. */
function candidateAnchors(relations: readonly Relation[], exclude: AnchorId[]): AnchorId[] {
  return ANCHOR_IDS.filter((a) => !exclude.includes(a) && usableRelations(a, relations).length >= 1);
}

/**
 * Nombre exact d'images fausses que CE fait (affirmatif ou nié, sur ce support) peut fournir avec les
 * pièges actifs. Formule directe (pas d'énumération) : chaque piège ajoute un nombre fixe d'alternatives
 * distinctes (voir altPlacements, qui produit exactement ce compte). Négation coupe "position" (§ plus
 * bas : changer de position sur une phrase niée resterait vrai), donc les deux ne se cumulent jamais.
 */
function statementCapacity(params: ReadParams, subjectId: SubjectId, anchor: AnchorId, negated: boolean): number {
  let n = 0;
  if (params.traps.includes('noun')) n += SUBJECTS[subjectId].lookAlikes.length;
  if (params.traps.includes('number')) n += 1;
  if (!negated && params.traps.includes('position')) n += fullRelations(anchor).length - 1;
  if (negated && params.traps.includes('negation')) n += 1;
  return n;
}

/** Couples (support, polarité) que ce sujet peut utiliser sans exclusion, triés par capacité décroissante. */
function anchorNegationOptions(
  params: ReadParams,
  subjectId: SubjectId,
  anchors: readonly AnchorId[],
): { anchor: AnchorId; negated: boolean; capacity: number }[] {
  const options: { anchor: AnchorId; negated: boolean; capacity: number }[] = [];
  for (const anchor of anchors) {
    options.push({ anchor, negated: false, capacity: statementCapacity(params, subjectId, anchor, false) });
    if (params.traps.includes('negation') && fullRelations(anchor).length >= 2) {
      options.push({ anchor, negated: true, capacity: statementCapacity(params, subjectId, anchor, true) });
    }
  }
  return options;
}

/**
 * Construit un fait : `statedRelation` (ce qui est écrit) vient toujours de `params.relations` ; en cas de
 * négation, `trueRelation` (ce qui est vraiment sur l'image) peut être n'importe quelle autre position que
 * ce support sait montrer — une image n'a pas besoin d'être une phrase lisible pour être vraie.
 *
 * Le couple (support, affirmatif/négatif) est choisi parmi ceux qui peuvent à eux seuls fournir `minAlts`
 * images fausses : jamais une manche à court d'images. Si aucun couple ne le peut, on prend le meilleur
 * (retenu par validateParams comme un niveau à corriger).
 */
function buildStatement(
  params: ReadParams,
  rng: Rng,
  subjectId: SubjectId,
  excludeAnchors: AnchorId[],
  minAlts: number,
): Statement {
  let anchors = candidateAnchors(params.relations, excludeAnchors);
  if (anchors.length === 0) anchors = candidateAnchors(params.relations, []);

  const options = anchorNegationOptions(params, subjectId, anchors);
  const feasible = options.filter((o) => o.capacity >= minAlts);
  let picked: { anchor: AnchorId; negated: boolean };
  if (feasible.length > 0) {
    picked = rng.pick(feasible);
  } else {
    // Repli : aucun couple ne suffit (configuration à corriger côté validateParams) — on prend le mieux.
    const best = options.reduce((a, b) => (b.capacity > a.capacity ? b : a));
    picked = best;
  }

  const { anchor, negated } = picked;
  const rels = usableRelations(anchor, params.relations);
  const statedRelation = rng.pick(rels);

  let trueRelation = statedRelation;
  if (negated) {
    const others = fullRelations(anchor).filter((r) => r !== statedRelation);
    trueRelation = others.includes('beside') ? 'beside' : rng.pick(others);
  }

  const count = rng.pick([1, 3] as const);
  return { subjectId, count, anchor, statedRelation, trueRelation, negated };
}

/** Candidats d'image fausse pour la phrase `index` : un seul trait change par rapport à la vérité. */
function altPlacements(params: ReadParams, statement: Statement): Placement[] {
  const subject = SUBJECTS[statement.subjectId];
  const alts: Placement[] = [];

  if (params.traps.includes('noun')) {
    for (const lookAlikeId of subject.lookAlikes) {
      alts.push({
        emoji: SUBJECTS[lookAlikeId].emoji,
        count: statement.count,
        relation: statement.trueRelation,
        anchor: statement.anchor,
      });
    }
  }

  if (params.traps.includes('number')) {
    alts.push({
      emoji: subject.emoji,
      count: statement.count === 1 ? 3 : 1,
      relation: statement.trueRelation,
      anchor: statement.anchor,
    });
  }

  // Piège "position" : seulement pour une phrase affirmative. Pour une phrase négative, changer la
  // position vers n'importe quelle autre position que "statedRelation" resterait VRAI (la phrase dit
  // juste que ce n'est pas à tel endroit) : seul le piège "negation" (l'affirmation) y est une image fausse.
  if (params.traps.includes('position') && !statement.negated) {
    const otherRelations = fullRelations(statement.anchor).filter((r) => r !== statement.trueRelation);
    for (const r of otherRelations) {
      alts.push({ emoji: subject.emoji, count: statement.count, relation: r, anchor: statement.anchor });
    }
  }

  if (params.traps.includes('negation') && statement.negated) {
    // Ce qu'on aurait vu si la phrase (négative) était en fait vraie : l'affirmation.
    alts.push({
      emoji: subject.emoji,
      count: statement.count,
      relation: statement.statedRelation,
      anchor: statement.anchor,
    });
  }

  const seen = new Set<string>();
  return alts.filter((p) => {
    const key = `${p.emoji}|${p.count}|${p.relation}|${p.anchor}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sceneKey(scene: Scene): string {
  return scene.placements.map((p) => `${p.emoji}|${p.count}|${p.relation}|${p.anchor}`).join('+');
}

/** Pioche un sujet parmi `pool`, en évitant `exclude` si possible. */
function pickSubject(rng: Rng, pool: readonly SubjectId[], exclude: readonly SubjectId[]): SubjectId {
  const candidates = pool.filter((id) => !exclude.includes(id));
  return rng.pick(candidates.length > 0 ? candidates : pool);
}

interface BuiltRound {
  text: string;
  correct: Scene;
  wrongs: Scene[];
  firstSubjectId: SubjectId;
}

function buildOneRound(
  params: ReadParams,
  rng: Rng,
  subjectPool: readonly SubjectId[],
  avoidFirstSubject: SubjectId | undefined,
  wantedChoices: number,
): BuiltRound {
  const sentenceCount = params.sentences >= 2 ? 2 : 1;
  const statements: Statement[] = [];
  const usedSubjects: SubjectId[] = avoidFirstSubject ? [avoidFirstSubject] : [];
  const usedAnchors: AnchorId[] = [];

  // Chaque phrase doit, à elle seule, pouvoir fournir toutes les images fausses demandées : la manche
  // ne dépend jamais d'un heureux tirage combiné entre les deux phrases.
  const minAlts = wantedChoices - 1;

  for (let i = 0; i < sentenceCount; i += 1) {
    const subjectId = pickSubject(rng, subjectPool, usedSubjects);
    usedSubjects.push(subjectId);
    const statement = buildStatement(params, rng, subjectId, usedAnchors, minAlts);
    statements.push(statement);
    usedAnchors.push(statement.anchor);
  }

  const text = statements.map(statementText).join(' ');
  const correctPlacements = statements.map(placementOf);
  const correct: Scene = { placements: correctPlacements };

  // Candidats d'image fausse : pour chaque phrase, un trait modifié, les autres phrases restant vraies.
  // L'image de l'affirmation d'une phrase négative passe en premier : c'est le piège de qui saute « ne… pas ».
  const affirmations: Scene[] = [];
  const wrongCandidates: Scene[] = [];
  for (let i = 0; i < statements.length; i += 1) {
    const statement = statements[i] as Statement;
    for (const alt of altPlacements(params, statement)) {
      const placements = correctPlacements.slice();
      placements[i] = alt;
      const isAffirmation =
        statement.negated && alt.relation === statement.statedRelation && alt.count === statement.count;
      (isAffirmation ? affirmations : wrongCandidates).push({ placements });
    }
  }

  const shuffled = [...rng.shuffle(affirmations), ...rng.shuffle(wrongCandidates)];
  const wrongs: Scene[] = [];
  const seen = new Set<string>([sceneKey(correct)]);
  for (const scene of shuffled) {
    if (wrongs.length >= wantedChoices - 1) break;
    const key = sceneKey(scene);
    if (seen.has(key)) continue;
    seen.add(key);
    wrongs.push(scene);
  }

  return { text, correct, wrongs, firstSubjectId: statements[0]?.subjectId as SubjectId };
}

/** Images fausses que les autres pièges (hors "noun") peuvent fournir au mieux, pour une phrase. */
function otherTrapsCapacity(params: ReadParams): number {
  let n = 0;
  if (params.traps.includes('number')) n += 1;
  if (params.traps.includes('position')) {
    n += Math.max(0, ...ANCHOR_IDS.map((a) => fullRelations(a).length - 1));
  }
  if (params.traps.includes('negation')) n += 1;
  return n;
}

export function generateRounds(params: ReadParams, count: number, rng: Rng): Round<ReadRoundData>[] {
  const wantedChoices = clamp(params.choices, MIN_CHOICES, MAX_CHOICES);
  // Si "noun" est actif, ne piocher que des sujets dont le nombre de sosies (combiné aux autres pièges)
  // peut fournir assez d'images fausses distinctes pour ce nombre de choix.
  const subjectPool = params.traps.includes('noun')
    ? SUBJECT_IDS.filter((id) => SUBJECTS[id].lookAlikes.length + otherTrapsCapacity(params) >= wantedChoices - 1)
    : SUBJECT_IDS;

  const rounds: Round<ReadRoundData>[] = [];
  const seenTexts = new Set<string>();
  let lastFirstSubject: SubjectId | undefined;

  for (let i = 0; i < count; i += 1) {
    let built: BuiltRound | null = null;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const candidate = buildOneRound(params, rng, subjectPool, lastFirstSubject, wantedChoices);
      if (candidate.wrongs.length < wantedChoices - 1) continue; // pas assez d'images fausses distinctes
      if (seenTexts.has(candidate.text) && attempt < 29) continue; // évite une manche identique
      built = candidate;
      break;
    }
    if (!built) built = buildOneRound(params, rng, subjectPool, lastFirstSubject, wantedChoices);

    seenTexts.add(built.text);

    const scenes = rng.shuffle([built.correct, ...built.wrongs]);
    const choices = scenes.map((scene, index) => ({ id: `img-${index}` as ChoiceId, scene }));
    const answerId = (choices[scenes.indexOf(built.correct)] as (typeof choices)[number]).id;

    rounds.push({ data: { text: built.text, choices }, answer: answerId });

    // Mémorise le sujet de la première phrase pour ne pas le répéter d'une manche à l'autre.
    lastFirstSubject = built.firstSubjectId;
  }

  return rounds;
}
