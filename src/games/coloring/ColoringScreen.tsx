// Écran du coloriage magique (docs/specs/COLORIAGE.md §2, §6). Phases : loading, choosing, painting,
// celebrating, fridge. Pas de sous-route : le retour Android quitte le jeu (§2.7).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Color } from '../../engine/types';
import { COLORS } from '../../engine/types';
import { useProfile } from '../../app/context';
import { useSession } from '../../app/SessionProvider';
import { returnTo } from '../../app/routes';
import { IconButton } from '../../ui/IconButton';
import { Icon } from '../../ui/icons/Icon';
import { TutorialHand } from '../../ui/TutorialHand';
import { playBoing, playDing, playDrain, playFanfare, playPour, playStar, playTap } from '../../ui/sound';
import { recipeFor } from '../../mechanics/color-mix/generate';
import { DROP_D } from '../../mechanics/color-mix/parts';
import { COLOR_HEX } from '../../ui/palette';
import { useSoftEnd } from '../useSoftEnd';
import {
  abandonColoring,
  completeColoring,
  listColorings,
  recordPaint,
  startColoring,
  type ColoringInit,
  type ColoringRecord,
  type PaintAttempt,
} from '../../storage/colorings';
import type { ColoringTier } from '../../storage/colorings';
import { DRAWINGS, findDrawing } from './catalog';
import { DETAIL_FOR_TIER, type CodeSymbol, type Detail, type Drawing } from './model';
import { applyPaint, helpFor, isComplete, stateFromRecord } from './rules';
import { EMPTY_CUP, applyCupPaint, paintOf, pourFlask, rinseCup, type CupState } from './cup';
import { assignColors, legendFor, nextVariantSeed } from './variants';
import { currentTier, fridgeItems, proposeDrawings, resumableRecord } from './progression';
import { Atelier } from './Atelier';
import { ChoiceBoard, type ChoiceCard } from './ChoiceBoard';
import { DrawingView, hitTestDrawing, visibleZones, type TransientZone } from './DrawingView';
import { Fridge } from './Fridge';
import { FridgeIcon } from './FridgeIcon';
import './coloring-screen.css';

type Phase = 'loading' | 'choosing' | 'painting' | 'celebrating' | 'fridge';

const MIX_MS = 600;
const DRAIN_MS = 400;
const SPREAD_MS = 350;
const MISS_MS = 450;
const HINT_MS = 2500;
const CELEBRATE_FIGURE_MS = 2600;
const CELEBRATE_TOTAL_MS = 3600;
const CELEBRATE_TOTAL_REDUCED_MS = 1200;

interface Session {
  recordId: string | null;
  resumedFrom?: string;
  drawing: Drawing;
  tier: ColoringTier;
  detail: Detail;
  variantSeed: number;
  zones: { id: string; target: Color }[];
  legend: Partial<Record<Color, CodeSymbol>> | null;
  painted: Set<string>;
  misses: Record<string, number>;
  paintedAtStart: string[];
  missesAtStart: Record<string, number>;
  showTutorial: boolean;
  showLegendTutorial: boolean;
}

function naturalZones(drawing: Drawing, detail: Detail): { id: string; target: Color }[] {
  return visibleZones(drawing, detail).map((z) => ({ id: z.id, target: z.palette[0] as Color }));
}

function uniqueColors(zones: readonly { target: Color }[]): Color[] {
  return COLORS.filter((c) => zones.some((z) => z.target === c));
}

function recentSignatures(records: readonly ColoringRecord[], drawingId: string, detail: Detail): Color[][] {
  return records
    .filter((r) => r.drawingId === drawingId && r.detail === detail)
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, 5)
    .map((r) => r.zones.map((z) => z.target));
}

function addTo(set: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(set);
  next.add(id);
  return next;
}

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

export function ColoringScreen() {
  const { profile } = useProfile();
  const { timeUp } = useSession();
  const [phase, setPhase] = useState<Phase>('loading');
  const [records, setRecords] = useState<ColoringRecord[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [choices, setChoices] = useState<ChoiceCard[]>([]);
  const [cup, setCup] = useState<CupState>(EMPTY_CUP);
  const [atelierAnim, setAtelierAnim] = useState<'idle' | 'mixing' | 'draining'>('idle');
  const [transient, setTransient] = useState<TransientZone | null>(null);
  const [hint, setHint] = useState<{ zoneId: string; level: 1 | 2 } | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number; color: Color } | null>(null);
  const [fromPhaseBeforeFridge, setFromPhaseBeforeFridge] = useState<Phase>('choosing');
  const [sizePx, setSizePx] = useState(300);

  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;
  const recordIdRef = useRef<string | null>(null);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const unmountedRef = useRef(false);
  const hasTappedRef = useRef(false);
  const paintedSinceTimeUpRef = useRef(false);
  const gameStartRef = useRef<number>(performance.now());
  const pausedMsRef = useRef(0);
  const hiddenSinceRef = useRef<number | null>(document.visibilityState === 'hidden' ? performance.now() : null);
  const drawingContainerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const reduced = useMemo(() => reducedMotion(), []);

  function schedule(fn: () => void, ms: number) {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  }

  function activeMs(): number {
    const hiddenExtra = hiddenSinceRef.current !== null ? performance.now() - hiddenSinceRef.current : 0;
    return Math.max(0, performance.now() - gameStartRef.current - pausedMsRef.current - hiddenExtra);
  }

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      unmountedRef.current = true;
    };
  }, []);

  // Pause du temps actif pendant que la page est cachée (docs/specs/COLORIAGE.md §6.2).
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenSinceRef.current = performance.now();
      } else if (hiddenSinceRef.current !== null) {
        pausedMsRef.current += performance.now() - hiddenSinceRef.current;
        hiddenSinceRef.current = null;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Mesure du côté du dessin (docs/specs/COLORIAGE.md §2.3) : au moins 300 px à 360×640.
  useEffect(() => {
    const measure = () => {
      const el = stageRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const side = Math.min(window.innerWidth - 24, 440, rect.height);
      setSizePx(Math.max(240, side));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [phase]);

  function enqueue(task: () => Promise<void>) {
    writeQueueRef.current = writeQueueRef.current.then(task, task).catch((err) => {
      console.error('coloring write failed', err);
    });
    return writeQueueRef.current;
  }

  function ensureRecord(init: ColoringInit): Promise<string> {
    // Le contrôle se refait DANS la tâche mise en file (pas seulement à l'appel) : deux essais très
    // rapprochés, avant que le premier n'ait créé la partie, ne doivent créer qu'un seul enregistrement.
    return enqueue(async () => {
      if (recordIdRef.current) return;
      if (!profile) return;
      const created = await startColoring(profile.id, init);
      recordIdRef.current = created.id;
    }).then(() => recordIdRef.current as string);
  }

  const softEnd = useSoftEnd({
    busy: (phase === 'painting' && !(Boolean(timeUp) && paintedSinceTimeUpRef.current)) || phase === 'celebrating',
    onTimeUp: async () => {
      const id = recordIdRef.current;
      if (id) {
        enqueue(() => abandonColoring(id, 'time-up', activeMs()));
        await writeQueueRef.current;
      }
    },
  });

  // Chargement initial (docs/specs/COLORIAGE.md §2.1).
  useEffect(() => {
    if (!profile) return undefined;
    let cancelled = false;
    listColorings(profile.id).then((r) => {
      if (cancelled) return;
      setRecords(r);
      enterFromRecords(r);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  function forcedTier(): ColoringTier | undefined {
    return profile?.gameSettings?.coloring?.tier;
  }

  function buildFreshSession(drawing: Drawing, opts: { tutorial?: boolean } = {}): Session {
    const tier = opts.tutorial ? (1 as ColoringTier) : currentTier(records, forcedTier());
    const detail = DETAIL_FOR_TIER[tier];
    if (opts.tutorial) {
      const zones = naturalZones(drawing, detail);
      return {
        recordId: null,
        drawing,
        tier,
        detail,
        variantSeed: 0,
        zones,
        legend: null,
        painted: new Set(),
        misses: {},
        paintedAtStart: [],
        missesAtStart: {},
        showTutorial: true,
        showLegendTutorial: false,
      };
    }
    const seed = profile ? nextVariantSeed(profile.id, drawing, detail, tier, recentSignatures(records, drawing.id, detail)) : 0;
    const zones = assignColors(drawing, detail, tier, seed);
    const legend = legendFor(uniqueColors(zones), tier, seed);
    const showLegendTutorial = tier >= 3 && !records.some((r) => r.tier >= 3);
    return {
      recordId: null,
      drawing,
      tier,
      detail,
      variantSeed: seed,
      zones,
      legend,
      painted: new Set(),
      misses: {},
      paintedAtStart: [],
      missesAtStart: {},
      showTutorial: false,
      showLegendTutorial,
    };
  }

  function buildResumeSession(record: ColoringRecord): Session {
    const { painted, misses } = stateFromRecord(record);
    return {
      recordId: null,
      resumedFrom: record.id,
      drawing: findDrawing(record.drawingId) as Drawing,
      tier: record.tier,
      detail: record.detail,
      variantSeed: record.variantSeed,
      zones: record.zones,
      legend: record.legend as Partial<Record<Color, CodeSymbol>> | null,
      painted,
      misses,
      paintedAtStart: [...painted],
      missesAtStart: { ...misses },
      showTutorial: false,
      showLegendTutorial: false,
    };
  }

  function resetActiveClock() {
    gameStartRef.current = performance.now();
    pausedMsRef.current = 0;
    hiddenSinceRef.current = document.visibilityState === 'hidden' ? performance.now() : null;
  }

  function enterPainting(next: Session) {
    recordIdRef.current = null;
    writeQueueRef.current = Promise.resolve();
    hasTappedRef.current = false;
    paintedSinceTimeUpRef.current = false;
    setCup(EMPTY_CUP);
    setHint(null);
    setTransient(null);
    resetActiveClock();
    setSession(next);
    setPhase('painting');
  }

  function buildChoiceCards(pool: readonly ColoringRecord[], resumable: ColoringRecord | null): ChoiceCard[] {
    const tier = currentTier(pool, forcedTier());
    const detail = DETAIL_FOR_TIER[tier];
    const excluded = resumable ? [resumable.drawingId] : [];
    const ids = proposeDrawings(
      pool,
      DRAWINGS.map((d) => d.id).filter((id) => !excluded.includes(id)),
      Date.now() & 0xffff,
    );
    const fresh: ChoiceCard[] = ids
      .map((id) => findDrawing(id))
      .filter((d): d is Drawing => Boolean(d))
      .map((drawing) => ({ drawing, detail, tier, targets: [], painted: new Set<string>(), isResume: false }));
    if (!resumable) return fresh.slice(0, 3);
    const drawing = findDrawing(resumable.drawingId);
    if (!drawing) return fresh.slice(0, 3);
    const { painted } = stateFromRecord(resumable);
    const resumeCard: ChoiceCard = {
      drawing,
      detail: resumable.detail,
      tier: resumable.tier,
      targets: resumable.zones,
      painted,
      isResume: true,
    };
    return [resumeCard, ...fresh].slice(0, 3);
  }

  function enterFromRecords(pool: readonly ColoringRecord[]) {
    if (pool.length === 0) {
      const drawing = DRAWINGS[0] as Drawing;
      enterPainting(buildFreshSession(drawing, { tutorial: true }));
      return;
    }
    const resumable = resumableRecord(pool, findDrawing);
    if (resumable && resumable.endReason !== 'quit') {
      if (softEnd.checkpoint()) return;
      enterPainting(buildResumeSession(resumable));
      return;
    }
    setChoices(buildChoiceCards(pool, resumable && resumable.endReason === 'quit' ? resumable : null));
    setPhase('choosing');
  }

  function pickChoice(index: number) {
    if (softEnd.checkpoint()) return;
    const card = choices[index];
    if (!card) return;
    playTap();
    if (card.isResume) {
      const resumable = resumableRecord(records, findDrawing);
      if (resumable) {
        enterPainting(buildResumeSession(resumable));
        return;
      }
    }
    enterPainting(buildFreshSession(card.drawing));
  }

  function clearHelp() {
    setHint(null);
  }

  function triggerHelp(zoneId: string, level: 1 | 2) {
    setHint({ zoneId, level });
    if (level === 1) schedule(() => setHint((h) => (h?.zoneId === zoneId ? null : h)), HINT_MS);
  }

  function handleEmptyCupTap() {
    playTap();
  }

  function finalizeAttempt(zoneId: string, outcome: 'painted' | 'missed', cupBefore: CupState) {
    const s = sessionRef.current;
    // La couleur réellement posée (celle du récipient), pas la cible de la case : un essai raté doit
    // rester raté dans les statistiques, et `paint` doit correspondre à `drops` (validation à l'import).
    const paint = paintOf(cupBefore);
    if (!s || !profile || !paint) return;
    const drops = [...cupBefore.drops];
    const freshResult = applyCupPaint(cupBefore);
    setCup(freshResult.cup);
    const priorMisses = s.misses[zoneId] ?? 0;
    const helpAlready = helpFor(s.tier, priorMisses);
    const at = activeMs();
    const attempt: PaintAttempt = {
      zoneId,
      paint,
      drops,
      fresh: freshResult.fresh,
      help: helpAlready,
      at,
    };

    const init: ColoringInit = {
      drawingId: s.drawing.id,
      tier: s.tier,
      detail: s.detail,
      variantSeed: s.variantSeed,
      zones: s.zones,
      legend: s.legend,
      ...(s.resumedFrom ? { resumedFrom: s.resumedFrom } : {}),
      paintedAtStart: s.paintedAtStart,
      missesAtStart: s.missesAtStart,
    };
    const nowComplete = outcome === 'painted' && isComplete(s.zones.map((z) => z.id), addTo(s.painted, zoneId));
    ensureRecord(init).then((id) => {
      enqueue(() => recordPaint(id, attempt, activeMs()));
      if (nowComplete) enqueue(() => completeColoring(id, activeMs()));
    });

    if (outcome === 'painted') {
      // Fin douce : seule une case réellement peinte clôt l'unité en cours, jamais un essai raté (§6.2).
      if (Boolean(timeUp)) paintedSinceTimeUpRef.current = true;
      playDing();
      hasTappedRef.current = true;
      clearHelp();
      setTransient({ id: zoneId, outcome: 'painted' });
      schedule(() => setTransient((t) => (t?.id === zoneId ? null : t)), SPREAD_MS);
      const nextPainted = addTo(s.painted, zoneId);
      const nextSession = { ...s, painted: nextPainted };
      setSession(nextSession);
      if (nowComplete) startCelebration();
    } else {
      playBoing();
      hasTappedRef.current = true;
      setTransient({ id: zoneId, outcome: 'missed' });
      schedule(() => setTransient((t) => (t?.id === zoneId ? null : t)), MISS_MS);
      const nextMisses = { ...s.misses, [zoneId]: priorMisses + 1 };
      setSession({ ...s, misses: nextMisses });
      const level = helpFor(s.tier, priorMisses + 1);
      if (level === 1 || level === 2) triggerHelp(zoneId, level);
      else clearHelp();
    }
  }

  function startCelebration() {
    setPhase('celebrating');
    playFanfare();
    const totalMs = reduced ? CELEBRATE_TOTAL_REDUCED_MS : CELEBRATE_TOTAL_MS;
    const flyAt = reduced ? totalMs - 200 : CELEBRATE_FIGURE_MS + 200;
    schedule(() => playStar(), flyAt);
    schedule(async () => {
      if (unmountedRef.current) return;
      await writeQueueRef.current;
      if (!profile) return;
      const fresh = await listColorings(profile.id);
      if (unmountedRef.current) return;
      setRecords(fresh);
      const resumable = resumableRecord(fresh, findDrawing);
      setChoices(buildChoiceCards(fresh, resumable && resumable.endReason === 'quit' ? resumable : null));
      setPhase('choosing');
    }, totalMs);
  }

  function attemptPaint(zoneId: string) {
    const s = sessionRef.current;
    if (!s || phase !== 'painting' || atelierAnim !== 'idle' || transient) return;
    const cupPaint = paintOf(cup);
    const target = s.zones.find((z) => z.id === zoneId)?.target;
    const outcome = applyPaint({ zoneId, target, painted: s.painted, cupPaint });
    if (outcome === 'none' || outcome === 'already-painted') return;
    if (outcome === 'empty-cup') {
      handleEmptyCupTap();
      return;
    }
    finalizeAttempt(zoneId, outcome, cup);
  }

  function handleZoneTap(zoneId: string) {
    hasTappedRef.current = true;
    attemptPaint(zoneId);
  }

  function handleFlaskTap(color: Color) {
    if (atelierAnim !== 'idle') return;
    hasTappedRef.current = true;
    playPour();
    const wasFull = cup.drops.length >= 2;
    const next = pourFlask(cup, color);
    setCup(next);
    if (wasFull) {
      setAtelierAnim('draining');
      schedule(() => setAtelierAnim('idle'), DRAIN_MS);
    } else if (next.drops.length === 2) {
      setAtelierAnim('mixing');
      schedule(() => setAtelierAnim('idle'), MIX_MS);
    }
  }

  function handleCupTap() {
    if (atelierAnim !== 'idle') return;
    hasTappedRef.current = true;
    if (cup.drops.length === 0) return;
    playDrain();
    setAtelierAnim('draining');
    setCup(rinseCup(cup));
    schedule(() => setAtelierAnim('idle'), DRAIN_MS);
  }

  // ---------- Glisser depuis le récipient (docs/specs/COLORIAGE.md §2.3) ----------

  function handleCupPointerDown(event: PointerEvent) {
    if (atelierAnim !== 'idle' || cup.drops.length === 0) return;
    const paint = paintOf(cup);
    if (!paint) return;
    setDrag({ x: event.clientX, y: event.clientY, color: paint });
    const onMove = (e: PointerEvent) => setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    const onUp = (e: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setDrag(null);
      const container = drawingContainerRef.current;
      const s = sessionRef.current;
      if (!container || !s) return;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0) return;
      const point = { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 };
      if (point.x < 0 || point.x > 100 || point.y < 0 || point.y > 100) return;
      const zoneId = hitTestDrawing(s.drawing, s.detail, s.painted, point, rect.width / 100);
      if (zoneId) attemptPaint(zoneId);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function goHome() {
    returnTo('hub');
  }

  function openFridge() {
    setFromPhaseBeforeFridge(phase === 'fridge' ? fromPhaseBeforeFridge : phase);
    setPhase('fridge');
  }

  function closeFridge() {
    setPhase(fromPhaseBeforeFridge);
  }

  // Sortie (docs/specs/COLORIAGE.md §2.7) : nettoyage au démontage, comme LevelPlayer.
  useEffect(() => {
    return () => {
      if (softEnd.endedRef.current) return;
      const id = recordIdRef.current;
      if (!id) return;
      const s = sessionRef.current;
      const reason = softEnd.exitReason();
      if (s && isComplete(s.zones.map((z) => z.id), s.painted)) {
        enqueue(() => completeColoring(id, activeMs()));
      } else {
        enqueue(() => abandonColoring(id, reason, activeMs()));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!profile || phase === 'loading') {
    return <div class="screen clr-screen" data-testid="coloring" data-phase="loading" />;
  }

  if (phase === 'fridge') {
    return (
      <div class="screen clr-screen" data-testid="coloring" data-phase="fridge">
        <div class="clr-topbar">
          <IconButton size={56} onClick={goHome} aria-label="Retour à l'accueil" data-testid="to-hub">
            <Icon name="home" size={36} />
          </IconButton>
          <IconButton size={56} onClick={closeFridge} aria-label="Fermer le frigo" data-testid="coloring-fridge">
            <FridgeIcon size={36} />
          </IconButton>
        </div>
        <Fridge items={fridgeItems(records)} findDrawing={findDrawing} />
      </div>
    );
  }

  if (phase === 'choosing') {
    return (
      <div class="screen clr-screen" data-testid="coloring" data-phase="choosing">
        <div class="clr-topbar">
          <IconButton size={56} onClick={goHome} aria-label="Retour à l'accueil" data-testid="to-hub">
            <Icon name="home" size={36} />
          </IconButton>
          <IconButton size={56} onClick={openFridge} aria-label="Ouvrir le frigo" data-testid="coloring-fridge">
            <FridgeIcon size={36} />
          </IconButton>
        </div>
        <div class="clr-stage" ref={stageRef}>
          <ChoiceBoard cards={choices} onPick={pickChoice} />
        </div>
      </div>
    );
  }

  // painting / celebrating
  const s = session as Session;
  const celebrating = phase === 'celebrating';
  const hints = hint ? { [hint.zoneId]: hint.level } : {};
  const recipe = hint ? recipeFor(s.zones.find((z) => z.id === hint.zoneId)?.target ?? 'red') : null;
  const tutorialTargets = (() => {
    if (!s.showTutorial && !s.showLegendTutorial) return null;
    if (hasTappedRef.current) return null;
    const firstSecondary = s.zones.find((z) => z.target === 'orange' || z.target === 'green' || z.target === 'purple');
    if (!firstSecondary) return null;
    const [a, b] = recipeFor(firstSecondary.target);
    if (s.showLegendTutorial) return [`zone-${firstSecondary.id}`, `legend-${firstSecondary.target}`, a, b, `zone-${firstSecondary.id}`];
    return [a, b, `zone-${firstSecondary.id}`];
  })();
  const helpHandTargets =
    hint && hint.level === 2 && recipe
      ? cup.drops.length > 0
        ? ['cup', recipe[0], recipe[1], `zone-${hint.zoneId}`]
        : [recipe[0], recipe[1], `zone-${hint.zoneId}`]
      : null;

  return (
    <div class="screen clr-screen" data-testid="coloring" data-phase={phase} data-tier={s.tier}>
      <div class="clr-topbar">
        <IconButton size={56} onClick={goHome} aria-label="Retour à l'accueil" data-testid="to-hub">
          <Icon name="home" size={36} />
        </IconButton>
        <div class="clr-topbar__legend" />
        <IconButton size={56} onClick={openFridge} aria-label="Ouvrir le frigo" data-testid="coloring-fridge">
          <FridgeIcon size={36} />
        </IconButton>
      </div>

      <div class="clr-stage" ref={stageRef}>
        <DrawingView
          drawing={s.drawing}
          detail={s.detail}
          tier={s.tier}
          targets={s.zones}
          legend={s.legend}
          painted={s.painted}
          hints={hints as Record<string, 0 | 1 | 2>}
          transient={transient}
          celebrating={celebrating}
          reducedMotion={reduced}
          sizePx={sizePx}
          interactive={phase === 'painting' && atelierAnim === 'idle'}
          onZoneTap={handleZoneTap}
          containerRef={(el) => {
            drawingContainerRef.current = el;
          }}
        />
        {!celebrating && (
          <Atelier
            cup={cup}
            busy={atelierAnim !== 'idle'}
            mixing={atelierAnim === 'mixing'}
            draining={atelierAnim === 'draining'}
            onFlaskTap={handleFlaskTap}
            onCupTap={handleCupTap}
            onCupPointerDown={handleCupPointerDown}
          />
        )}
      </div>

      {tutorialTargets && <TutorialHand targets={tutorialTargets} />}
      {helpHandTargets && <TutorialHand targets={helpHandTargets} />}
      {drag && (
        <div class="clr-drag-drop" style={{ left: `${drag.x}px`, top: `${drag.y - 36}px` }}>
          <svg viewBox="0 0 48 56">
            <path d={DROP_D} fill={COLOR_HEX[drag.color]} />
          </svg>
        </div>
      )}
    </div>
  );
}
