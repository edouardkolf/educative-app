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
  getTrackOrDefault,
  hasCompleted,
} from '../engine';
import type { ChoiceId, Level, Round } from '../engine/types';
import type { RoundRecord } from '../storage/types';
import { abandonRun, completeRun, listOverrides, listRuns, recordRound, startRun } from '../storage';
import { getMechanic } from '../mechanics';
import { navigate } from '../app/routes';
import { worldIndexForLevel } from './map/layout';
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
  const { timeUp, timeUpRef, clearSoftEnd } = useSession();
  const [phase, setPhase] = useState<Phase>('loading');
  const [level, setLevel] = useState<Level | null>(null);
  const [rounds, setRounds] = useState<Round<unknown>[] | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [wrongChoices, setWrongChoices] = useState<Set<ChoiceId>>(new Set());
  const [solved, setSolved] = useState(false);
  const [hasTapped, setHasTapped] = useState(false);
  const [stars, setStars] = useState<1 | 2 | 3>(1);
  const [nextLevelId, setNextLevelId] = useState<string | null>(null);
  /** Le niveau suivant ouvre un nouveau monde : « Suivant » passe par la carte, qui fête l'arrivée. */
  const [nextInNewWorld, setNextInNewWorld] = useState(false);
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
  /** F4 : id du minuteur de 3 s (écran des étoiles → écran de fin), annulé si la partie change avant qu'il sonne. */
  const lockAfterStarsTimeoutRef = useRef<number | null>(null);
  /** F7/F8 : lus depuis le nettoyage de l'effet de montage, qui peut fermer sur un rendu obsolète — toujours à jour via ref. */
  const levelRef = useRef<Level | null>(null);
  const totalRoundsRef = useRef(0);
  /** F10 : millisecondes de la manche en cours passées page cachée (écran éteint), à soustraire de `durationMs`. */
  const roundPausedMsRef = useRef(0);
  const roundHiddenSinceRef = useRef<number | null>(null);

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
      const track = lvl ? getTrackOrDefault(profile.trackId) : undefined; // F11
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
      if (cancelled) {
        // F8 : démonté (ou niveau/rejeu changé) pendant que `startRun` était encore en vol — cette
        // partie n'a jamais été rattachée à `runIdRef` et ne serait donc jamais close par le
        // nettoyage ci-dessous (qui n'agit que sur `runIdRef.current`) : la clore ici directement.
        abandonRun(run.id, 'quit').catch((err) => console.error('abandonRun (F8) failed', err));
        return;
      }

      runIdRef.current = run.id;
      recordsRef.current = [];
      tapsRef.current = 0;
      firstTryRef.current = true;
      busyRef.current = false;
      starsDoneRef.current = false;
      lockAfterStarsRef.current = false;
      levelRef.current = lvl;
      totalRoundsRef.current = generated.length;
      roundStartRef.current = performance.now();
      roundPausedMsRef.current = 0;
      roundHiddenSinceRef.current = document.visibilityState === 'hidden' ? performance.now() : null;
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
      // F4 : un minuteur de 3 s encore en attente (fin sur l'écran des étoiles) appartient à LA
      // PARTIE PRÉCÉDENTE — ne jamais le laisser naviguer vers l'écran de fin après qu'une nouvelle
      // partie a démarré (Suivant/Rejouer), ce qui la ferait compter en abandon 3 s plus tard.
      if (lockAfterStarsTimeoutRef.current !== null) {
        window.clearTimeout(lockAfterStarsTimeoutRef.current);
        lockAfterStarsTimeoutRef.current = null;
      }
      lockAfterStarsRef.current = false;
      if (!endedRef.current && runIdRef.current) {
        endedRef.current = true;
        void endInterruptedRun(runIdRef.current);
      }
    };
  }, [levelId, profile?.id, runToken]);

  // F7 : bouton maison ou retour Android dans les ~900 ms après la dernière bonne réponse — toutes
  // les manches sont déjà enregistrées (`recordRound`), mais `advance()` n'a pas encore eu le temps
  // de terminer la partie. La compter comme terminée (étoiles calculées), jamais comme un abandon.
  // Lit `levelRef`/`totalRoundsRef` (pas `level`/`rounds`) : appelée depuis le nettoyage de l'effet
  // ci-dessus, qui peut fermer sur un rendu antérieur à leur dernière mise à jour.
  async function endInterruptedRun(runId: string) {
    const allRoundsRecorded = totalRoundsRef.current > 0 && recordsRef.current.length >= totalRoundsRef.current;
    try {
      if (allRoundsRecorded && levelRef.current) {
        const finalStars = computeStars(levelRef.current, countMisses(recordsRef.current));
        await completeRun(runId, finalStars);
      } else {
        await abandonRun(runId, 'quit');
      }
    } catch (err) {
      console.error('endInterruptedRun failed', err);
    }
  }

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
    let newWorld = false;
    try {
      const track = getTrackOrDefault(profile.trackId); // F11
      const candidate = track ? getNextLevelId(track, levelId) : undefined;
      if (track && candidate) {
        const [runs, overrides] = await Promise.all([listRuns(profile.id), listOverrides(profile.id)]);
        const nextState = computeLevelStates(track, runs, overrides).find((s) => s.levelId === candidate);
        if (nextState && nextState.status !== 'locked') next = candidate;
        newWorld =
          worldIndexForLevel(track.levels.indexOf(candidate)) !== worldIndexForLevel(track.levels.indexOf(levelId));
      }
    } catch (err) {
      console.error('next level lookup failed', err);
    }
    setNextLevelId(next);
    setNextInNewWorld(newWorld);
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
    clearSoftEnd(); // F1 : la fin douce est traitée, la garde de route peut reprendre la main.
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
    // F10 : nouvelle manche, nouveau chronomètre — pas d'écran éteint hérité de la manche précédente.
    roundPausedMsRef.current = 0;
    roundHiddenSinceRef.current = document.visibilityState === 'hidden' ? performance.now() : null;
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
    // F4 : id gardé pour pouvoir l'annuler (nettoyage de l'effet de montage) si Suivant/Rejouer
    // démarre une nouvelle partie avant que ces 3 s ne s'écoulent — sinon ce minuteur, périmé,
    // navigue quand même vers l'écran de fin et la NOUVELLE partie se retrouve comptée en abandon.
    lockAfterStarsTimeoutRef.current = window.setTimeout(() => {
      lockAfterStarsTimeoutRef.current = null;
      clearSoftEnd();
      navigate({ name: 'locked' }, { replace: true });
    }, 3000);
  };
  useEffect(() => {
    if (phase === 'end' && timeUp && starsDoneRef.current) scheduleLockAfterStars();
  }, [phase, timeUp]);

  // F10 : chronomètre de manche en pause pendant que la page est cachée (écran éteint) — le temps
  // hors ligne ne doit jamais compter dans « Temps de jeu » (somme des durées de manches, §7).
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        roundHiddenSinceRef.current = performance.now();
      } else if (roundHiddenSinceRef.current !== null) {
        roundPausedMsRef.current += performance.now() - roundHiddenSinceRef.current;
        roundHiddenSinceRef.current = null;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

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
        durationMs: Math.round(performance.now() - roundStartRef.current - roundPausedMsRef.current),
      };
      recordsRef.current = [...recordsRef.current, record];
      const runId = runIdRef.current;
      if (runId) recordRound(runId, record).catch((err) => console.error('recordRound failed', err));
      const mechanicForDelay = level ? getMechanic(level.mechanic) : undefined;
      window.setTimeout(advance, mechanicForDelay?.solvedDelayMs ?? 900);
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
    // F7 : toutes les manches déjà enregistrées (retour dans les ~900 ms après la dernière bonne
    // réponse) → terminer la partie plutôt que l'abandonner.
    if (runId) void endInterruptedRun(runId);
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
        onNext={() =>
          nextLevelId && navigate(nextInNewWorld ? { name: 'map' } : { name: 'play', levelId: nextLevelId })
        }
        onReplay={() => setRunToken((t) => t + 1)}
        onToMap={() => navigate({ name: 'map' })}
        // F4 : temps déjà écoulé pendant l'écran des étoiles → ni Suivant ni Rejouer (seulement les
        // étoiles), l'écran de fin arrive de lui-même 3 s plus tard (scheduleLockAfterStars).
        timeUp={Boolean(timeUp)}
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
  const tutorialTargets = mechanic.tutorialTargets?.(round) ?? [round.answer];

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
      {showTutorial && <TutorialHand targets={tutorialTargets} />}
    </div>
  );
}
