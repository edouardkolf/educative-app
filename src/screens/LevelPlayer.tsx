// Écran Partie : moteur générique (ARCHITECTURE §5) — charge un niveau, joue ses manches,
// calcule les étoiles. Ne connaît aucune mécanique en particulier, seulement le contrat commun.
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  computeLevelStates,
  computeStars,
  countMisses,
  createRng,
  getLevel,
  getNextLevelId,
  getTrack,
  hasCompleted,
} from '../engine';
import type { ChoiceId, Level, Round } from '../engine/types';
import type { RoundRecord } from '../storage/types';
import { abandonRun, completeRun, listOverrides, listRuns, recordRound, startRun } from '../storage';
import { getMechanic } from '../mechanics';
import { navigate } from '../app/routes';
import { useProfile } from '../app/context';
import { useSession } from '../app/SessionProvider';
import { playError, playSuccess } from '../ui/sound';
import { IconButton } from '../ui/IconButton';
import { TutorialHand } from '../ui/TutorialHand';
import { LevelEnd } from './LevelEnd';

type Phase = 'loading' | 'not-found' | 'unavailable' | 'playing' | 'end';

const NO_ANSWER_TIMEOUT_MS = 60_000;

export function LevelPlayer({ levelId }: { levelId: string }) {
  const { profile } = useProfile();
  const { timeUp, timeUpRef } = useSession();
  const [phase, setPhase] = useState<Phase>('loading');
  const [level, setLevel] = useState<Level | null>(null);
  const [rounds, setRounds] = useState<Round<unknown>[] | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [wrongChoices, setWrongChoices] = useState<Set<ChoiceId>>(new Set());
  const [solved, setSolved] = useState(false);
  const [hasTapped, setHasTapped] = useState(false);
  const [stars, setStars] = useState<1 | 2 | 3>(1);
  const [nextLevelId, setNextLevelId] = useState<string | null>(null);
  const [runToken, setRunToken] = useState(0);

  const runIdRef = useRef<string | null>(null);
  const endedRef = useRef(false);
  const recordsRef = useRef<RoundRecord[]>([]);
  const tapsRef = useRef(0);
  const firstTryRef = useRef(true);
  const roundStartRef = useRef(0);
  const busyRef = useRef(false);
  const starsDoneRef = useRef(false);
  const lockAfterStarsRef = useRef(false);

  // Charge le niveau et démarre une partie. Se relance au changement de niveau ou de `runToken`
  // (rejouer) ; le nettoyage abandonne toute partie encore en cours (bouton maison, retour Android,
  // changement de niveau direct) — jamais après une fin normale (`endedRef`).
  useEffect(() => {
    if (!profile) return undefined;
    let cancelled = false;
    endedRef.current = false;
    runIdRef.current = null;
    setPhase('loading');

    (async () => {
      const lvl = getLevel(levelId);
      const track = lvl ? getTrack(profile.trackId) : undefined;
      if (!lvl || !track) {
        if (!cancelled) setPhase('not-found');
        return;
      }
      const [runs, overrides] = await Promise.all([listRuns(profile.id), listOverrides(profile.id)]);
      if (cancelled) return;
      const state = computeLevelStates(track, runs, overrides).find((s) => s.levelId === levelId);
      if (!state || state.status === 'locked') {
        setPhase('not-found');
        return;
      }
      const mechanic = getMechanic(lvl.mechanic);
      if (!mechanic) {
        setPhase('unavailable');
        return;
      }
      const rng = createRng(Date.now());
      const generated = mechanic.generateRounds(lvl.params, lvl.rounds, rng);
      const run = await startRun({
        profileId: profile.id,
        levelId,
        trackId: track.id,
        replay: hasCompleted(levelId, runs),
      });
      if (cancelled) return;

      runIdRef.current = run.id;
      recordsRef.current = [];
      tapsRef.current = 0;
      firstTryRef.current = true;
      busyRef.current = false;
      starsDoneRef.current = false;
      lockAfterStarsRef.current = false;
      roundStartRef.current = performance.now();
      setLevel(lvl);
      setRounds(generated);
      setRoundIndex(0);
      setWrongChoices(new Set());
      setSolved(false);
      setHasTapped(false);
      setPhase('playing');
    })().catch((err) => {
      console.error('LevelPlayer init failed', err);
      if (!cancelled) setPhase('not-found');
    });

    return () => {
      cancelled = true;
      if (!endedRef.current && runIdRef.current) {
        endedRef.current = true;
        abandonRun(runIdRef.current, 'quit').catch((err) => console.error('abandonRun failed', err));
      }
    };
  }, [levelId, profile?.id, runToken]);

  useEffect(() => {
    if (phase === 'not-found') navigate({ name: 'map' }, { replace: true });
  }, [phase]);

  const finish = async () => {
    if (!level || !runIdRef.current || !profile) return;
    const misses = countMisses(recordsRef.current);
    const finalStars = computeStars(level, misses);
    endedRef.current = true;
    try {
      await completeRun(runIdRef.current, finalStars);
    } catch (err) {
      console.error('completeRun failed', err);
    }
    setStars(finalStars);

    let next: string | null = null;
    try {
      const track = getTrack(profile.trackId);
      const candidate = track ? getNextLevelId(track, levelId) : undefined;
      if (track && candidate) {
        const [runs, overrides] = await Promise.all([listRuns(profile.id), listOverrides(profile.id)]);
        const nextState = computeLevelStates(track, runs, overrides).find((s) => s.levelId === candidate);
        if (nextState && nextState.status !== 'locked') next = candidate;
      }
    } catch (err) {
      console.error('next level lookup failed', err);
    }
    setNextLevelId(next);
    setPhase('end');
  };

  // Fin douce (§8) : le minuteur ou le quota est atteint pendant une manche non finale — la manche
  // en cours a été laissée se terminer (bonne réponse ou 60 s sans réponse), mais on s'arrête là :
  // abandon "time-up" (une interruption, pas un abandon) puis écran de fin. `endedRef` avant l'appel
  // réseau pour que le nettoyage au démontage (changement de route) ne compte pas aussi un "quit".
  const timeUpEnd = async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    const runId = runIdRef.current;
    if (runId) {
      try {
        await abandonRun(runId, 'time-up');
      } catch (err) {
        console.error('abandonRun (time-up) failed', err);
      }
    }
    navigate({ name: 'locked' }, { replace: true });
  };

  const advance = () => {
    if (endedRef.current) return; // partie déjà quittée pendant le délai de 900 ms
    const total = rounds?.length ?? 0;
    const next = roundIndex + 1;
    // Lu via une ref (pas l'état réactif `timeUp`) : ce callback différé (setTimeout 900 ms) a pu
    // capturer un rendu antérieur à l'apparition du minuteur.
    if (next < total && timeUpRef.current) {
      void timeUpEnd();
      return;
    }
    if (next >= total) {
      void finish();
      return;
    }
    setRoundIndex(next);
    setWrongChoices(new Set());
    setSolved(false);
    busyRef.current = false;
    tapsRef.current = 0;
    firstTryRef.current = true;
    roundStartRef.current = performance.now();
  };

  // Sans réponse dans les 60 s après l'apparition du minuteur pendant une manche : même fin douce.
  useEffect(() => {
    if (!timeUp || phase !== 'playing' || solved) return undefined;
    const id = window.setTimeout(() => void timeUpEnd(), NO_ANSWER_TIMEOUT_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp, phase, roundIndex, solved]);

  // Niveau terminé (étoiles) : écran de fin 3 s après la fin de l'animation, dans les deux ordres
  // possibles — le minuteur peut arriver avant ou après la dernière étoile (`onDone` couvre le
  // premier cas, cet effet le second, une fois `starsDoneRef` déjà vrai).
  const scheduleLockAfterStars = () => {
    if (lockAfterStarsRef.current) return;
    lockAfterStarsRef.current = true;
    window.setTimeout(() => navigate({ name: 'locked' }, { replace: true }), 3000);
  };
  useEffect(() => {
    if (phase === 'end' && timeUp && starsDoneRef.current) scheduleLockAfterStars();
  }, [phase, timeUp]);

  const onChoose = (choice: ChoiceId) => {
    if (phase !== 'playing' || solved || busyRef.current || !rounds) return;
    const round = rounds[roundIndex];
    if (!round) return;
    setHasTapped(true);
    tapsRef.current += 1;
    if (choice === round.answer) {
      busyRef.current = true;
      setSolved(true);
      playSuccess();
      const record: RoundRecord = {
        index: roundIndex,
        taps: tapsRef.current,
        firstTry: firstTryRef.current,
        durationMs: Math.round(performance.now() - roundStartRef.current),
      };
      recordsRef.current = [...recordsRef.current, record];
      const runId = runIdRef.current;
      if (runId) recordRound(runId, record).catch((err) => console.error('recordRound failed', err));
      window.setTimeout(advance, 900);
    } else {
      firstTryRef.current = false;
      playError();
      setWrongChoices((prev) => new Set(prev).add(choice));
    }
  };

  const quit = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    const runId = runIdRef.current;
    navigate({ name: 'map' });
    if (runId) abandonRun(runId, 'quit').catch((err) => console.error('abandonRun failed', err));
  };

  if (!profile) return null;

  if (phase === 'loading' || phase === 'not-found') {
    return <div class="screen screen--loading" />;
  }

  if (phase === 'unavailable') {
    return (
      <div class="screen screen--unavailable">
        <div class="unavailable-picto" aria-hidden="true">
          🚧
        </div>
        <IconButton size={72} onClick={() => navigate({ name: 'map' })} aria-label="Retour à la carte" data-testid="to-map">
          🗺️
        </IconButton>
      </div>
    );
  }

  if (phase === 'end') {
    return (
      <LevelEnd
        stars={stars}
        hasNext={nextLevelId !== null}
        onNext={() => nextLevelId && navigate({ name: 'play', levelId: nextLevelId })}
        onReplay={() => setRunToken((t) => t + 1)}
        onToMap={() => navigate({ name: 'map' })}
        onDone={() => {
          starsDoneRef.current = true;
          if (timeUpRef.current) scheduleLockAfterStars();
        }}
      />
    );
  }

  if (!level || !rounds) return <div class="screen screen--loading" />;
  const round = rounds[roundIndex];
  if (!round) return null;
  const mechanic = getMechanic(level.mechanic);
  if (!mechanic) return null;
  const showTutorial = Boolean(level.tutorial) && roundIndex === 0 && !hasTapped;

  return (
    <div class="screen screen--play">
      <div class="play-topbar">
        <IconButton size={56} onClick={quit} aria-label="Quitter" data-testid="quit">
          🏠
        </IconButton>
        <div class="play-progress">
          {rounds.map((_, i) => (
            <span
              key={i}
              class={`play-progress__dot${i < roundIndex ? ' is-done' : ''}${i === roundIndex ? ' is-current' : ''}`}
            />
          ))}
        </div>
      </div>
      <div class="play-round" data-answer={round.answer}>
        <mechanic.View round={round} wrongChoices={wrongChoices} solved={solved} onChoose={onChoose} key={roundIndex} />
      </div>
      {showTutorial && <TutorialHand answer={round.answer} />}
    </div>
  );
}
