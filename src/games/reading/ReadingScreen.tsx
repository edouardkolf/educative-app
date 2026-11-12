// Écran du programme « J'apprends à lire » (route `#/reading`, LECTURE.md §2 et §16). Trois états : accueil (le
// parcours de niveaux), séance, fin. La progression n'est jamais stockée : elle est recalculée à partir des séances.
import { useEffect, useRef, useState } from 'preact/hooks';
import { useProfile } from '../../app/context';
import { returnTo } from '../../app/routes';
import { createRng } from '../../engine/rng';
import { IconButton } from '../../ui/IconButton';
import { Icon } from '../../ui/icons/Icon';
import { checkVoice } from '../../ui/voice';
import { listReadings } from '../../storage/readings';
import { computeProgress, type ReadingSettings } from './progress';
import { isLevelPass, levelProgress, type LevelProgress, type ReadingLevel } from './levels';
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
}

type Phase = 'loading' | 'home' | 'session' | 'end' | 'error';

export function ReadingScreen() {
  const { profile } = useProfile();
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
      const records = await listReadings(profile.id);
      const settings = profile.gameSettings?.reading;
      return { progress: computeProgress(records, settings), levels: levelProgress(records, settings) };
    } catch (err) {
      console.error('reading progress failed', err);
      return null;
    }
  }

  async function reload() {
    const [next, voice] = await Promise.all([loadProgress(), checkVoice().catch(() => null)]);
    if (!aliveRef.current) return;
    setVoiceReady(voice?.status === 'ready');
    if (next) {
      setLoaded(next);
      setPhase('home');
    } else {
      setPhase((p) => (p === 'loading' ? 'error' : p));
    }
  }

  useEffect(() => {
    if (profile) void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  function start(level: ReadingLevel, review: boolean) {
    if (!loaded) return;
    try {
      seedRef.current = (seedRef.current + 0x9e3779b9) >>> 0;
      const rng = createRng((Date.now() ^ seedRef.current) >>> 0);
      const plan = planLevel(level, loaded.progress, rng);
      setSession({ plan, level, review, before: loaded.levels });
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
          <IconButton size={72} onClick={() => returnTo('hub')} aria-label="Retour à l'accueil" data-testid="to-hub">
            <Icon name="home" size={44} />
          </IconButton>
        </div>
      )}
      {phase === 'home' && loaded && <ReadingHome progress={loaded.levels} voiceReady={voiceReady} onStart={start} />}
      {phase === 'session' && session && (
        <ReadingSession plan={session.plan} review={session.review} profileId={profile.id} onFinish={onFinish} />
      )}
      {phase === 'end' && end && <ReadingEnd info={end} onContinue={backHome} />}
    </div>
  );
}
