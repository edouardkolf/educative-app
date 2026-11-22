// Écran du programme « J'apprends à lire » (route `#/reading`, LECTURE.md §2 et §16). Trois états : accueil (le
// parcours de niveaux), séance, fin. La progression n'est jamais stockée : elle est recalculée à partir des séances.
// Avec `levelId` (route `#/reading/<niveau>`, Petits Lecteurs, LECTURE-APP.md §3) : pas d'accueil, la séance du
// niveau démarre tout de suite et tout retour mène à la carte d'aventure.
import { useEffect, useRef, useState } from 'preact/hooks';
import { useProfile } from '../../app/context';
import { returnTo } from '../../app/routes';
import { getSettings } from '../../storage/settings';
import { createRng } from '../../engine/rng';
import { IconButton } from '../../ui/IconButton';
import { Icon } from '../../ui/icons/Icon';
import { checkVoice } from '../../ui/voice';
import { listReadings } from '../../storage/readings';
import { computeProgress, type ReadingSettings } from './progress';
import { getLevel, isLevelPass, isPlayable, levelProgress, levelState, type LevelProgress, type ReadingLevel } from './levels';
import { planLevel } from './session';
import { ReadingEnd, type EndInfo } from './ReadingEnd';
import { ReadingHome } from './ReadingHome';
import { ReadingSession } from './ReadingSession';
import type { ReadingAnswer, ReadingProgress, ReadingSessionPlan } from './types';
import './reading.css';

interface ActiveSession {
  plan: ReadingSessionPlan;
  level: ReadingLevel;
  review: boolean;
  /** Parcours avant la séance (pour savoir si le niveau vient d'être gagné). */
  before: LevelProgress;
}

interface Loaded {
  /** Maîtrise des items (leurres, statistiques). */
  progress: ReadingProgress;
  /** Position dans le parcours de niveaux. */
  levels: LevelProgress;
  /** Mode admin : tous les niveaux sont ouverts. */
  unlockAll: boolean;
}

type Phase = 'loading' | 'home' | 'session' | 'end' | 'error';

interface ReadingScreenProps {
  /** Niveau à jouer tout de suite (séance lancée depuis la carte d'aventure). */
  levelId?: string;
}

export function ReadingScreen({ levelId }: ReadingScreenProps = {}) {
  const { profile } = useProfile();
  const fromMap = levelId !== undefined;
  const [phase, setPhase] = useState<Phase>('loading');
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [voiceReady, setVoiceReady] = useState(true);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [end, setEnd] = useState<EndInfo | null>(null);
  const aliveRef = useRef(true);
  const seedRef = useRef(Date.now() >>> 0);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  /** Recharge les séances et recalcule la progression ; renvoie null en cas d'échec. */
  async function loadProgress(): Promise<Loaded | null> {
    if (!profile) return null;
    try {
      const [records, appSettings] = await Promise.all([listReadings(profile.id), getSettings()]);
      const settings = profile.gameSettings?.reading;
      return {
        progress: computeProgress(records, settings),
        levels: levelProgress(records, settings),
        unlockAll: appSettings.adminUnlockAll === true,
      };
    } catch (err) {
      console.error('reading progress failed', err);
      return null;
    }
  }

  async function reload() {
    const [next, voice] = await Promise.all([loadProgress(), checkVoice().catch(() => null)]);
    if (!aliveRef.current) return;
    setVoiceReady(voice?.status === 'ready');
    if (next && fromMap) {
      // Depuis la carte : niveau inconnu, verrouillé ou voix absente → retour à la carte (qui montre la cause).
      const level = getLevel(levelId);
      const state = level ? levelState(next.levels, level, { unlockAll: next.unlockAll }) : 'locked';
      setLoaded(next);
      if (!level || !isPlayable(state) || voice?.status !== 'ready') {
        returnTo('map');
        return;
      }
      start(level, state === 'done', next);
    } else if (next) {
      setLoaded(next);
      setPhase('home');
    } else {
      setPhase((p) => (p === 'loading' ? 'error' : p));
    }
  }

  useEffect(() => {
    if (profile) void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, levelId]);

  function start(level: ReadingLevel, review: boolean, from: Loaded | null = loaded) {
    if (!from) return;
    try {
      seedRef.current = (seedRef.current + 0x9e3779b9) >>> 0;
      const rng = createRng((Date.now() ^ seedRef.current) >>> 0);
      const plan = planLevel(level, from.progress, rng);
      setSession({ plan, level, review, before: from.levels });
      setPhase('session');
    } catch (err) {
      console.error('reading planLevel failed', err);
    }
  }

  async function onFinish(answers: readonly ReadingAnswer[]) {
    const current = session;
    if (!current) return;
    const after = await loadProgress();
    if (!aliveRef.current) return;
    const { level, plan } = current;
    const passed = isLevelPass({ status: 'completed', planned: plan.questions.length, answers: [...answers] });
    const wasDone = current.before.passed.has(level.id);
    const nowDone = after ? after.levels.passed.has(level.id) : wasDone;
    const justValidated = !wasDone && nowDone;
    if (after) setLoaded(after);
    setEnd({
      level,
      review: current.review,
      passed,
      justValidated,
      next: justValidated ? (after?.levels.current ?? null) : null,
      programFinished: justValidated && Boolean(after?.levels.finished),
    });
    setSession(null);
    setPhase('end');
  }

  function backHome() {
    if (fromMap) {
      returnTo('map');
      return;
    }
    setEnd(null);
    setPhase('home');
    void reload();
  }

  if (!profile) return null;

  return (
    <div class="reading" data-testid="reading" data-phase={phase}>
      {phase === 'loading' && <div class="screen rd-loading" />}
      {phase === 'error' && (
        <div class="screen rd-loading">
          <IconButton
            size={72}
            onClick={() => returnTo(fromMap ? 'map' : 'hub')}
            aria-label={fromMap ? 'Retour à la carte' : "Retour à l'accueil"}
            data-testid={fromMap ? 'to-map' : 'to-hub'}
          >
            <Icon name={fromMap ? 'map' : 'home'} size={44} />
          </IconButton>
        </div>
      )}
      {phase === 'home' && loaded && (
        <ReadingHome
          progress={loaded.levels}
          voiceReady={voiceReady}
          unlockAll={loaded.unlockAll}
          onStart={(level, review) => start(level, review)}
        />
      )}
      {phase === 'session' && session && (
        <ReadingSession
          plan={session.plan}
          review={session.review}
          profileId={profile.id}
          onFinish={onFinish}
          exitTo={fromMap ? 'map' : 'hub'}
        />
      )}
      {phase === 'end' && end && <ReadingEnd info={end} onContinue={backHome} />}
    </div>
  );
}
