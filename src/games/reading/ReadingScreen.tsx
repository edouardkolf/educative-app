// Écran du programme « J'apprends à lire » (route `#/reading`, LECTURE.md §2). Trois états : accueil (les cinq
// étapes), séance, fin. La progression n'est jamais stockée : elle est recalculée à partir des séances.
import { useEffect, useRef, useState } from 'preact/hooks';
import { useProfile } from '../../app/context';
import { returnTo } from '../../app/routes';
import { createRng } from '../../engine/rng';
import { IconButton } from '../../ui/IconButton';
import { Icon } from '../../ui/icons/Icon';
import { checkVoice } from '../../ui/voice';
import { listReadings } from '../../storage/readings';
import { computeProgress, type ReadingSettings } from './progress';
import { planSession } from './session';
import { ReadingEnd, type EndInfo } from './ReadingEnd';
import { ReadingHome, stageState } from './ReadingHome';
import { ReadingSession } from './ReadingSession';
import type { ReadingAnswer, ReadingProgress, ReadingSessionPlan, ReadingStage } from './types';
import './reading.css';

interface ActiveSession {
  plan: ReadingSessionPlan;
  review: boolean;
  /** Progression avant la séance (pour savoir si une étape vient d'être validée). */
  before: ReadingProgress;
}

type Phase = 'loading' | 'home' | 'session' | 'end' | 'error';

export function ReadingScreen() {
  const { profile } = useProfile();
  const [phase, setPhase] = useState<Phase>('loading');
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
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
  async function loadProgress(): Promise<ReadingProgress | null> {
    if (!profile) return null;
    try {
      const records = await listReadings(profile.id);
      return computeProgress(records, profile.gameSettings?.reading);
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
      setProgress(next);
      setPhase('home');
    } else {
      setPhase((p) => (p === 'loading' ? 'error' : p));
    }
  }

  useEffect(() => {
    if (profile) void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  function start(stage: ReadingStage, review: boolean) {
    if (!progress) return;
    try {
      seedRef.current = (seedRef.current + 0x9e3779b9) >>> 0;
      const rng = createRng((Date.now() ^ seedRef.current) >>> 0);
      const plan = planSession(progress, rng, review ? { stage } : undefined);
      setSession({ plan, review, before: progress });
      setPhase('session');
    } catch (err) {
      console.error('reading planSession failed', err);
    }
  }

  async function onFinish(_answers: readonly ReadingAnswer[]) {
    const current = session;
    if (!current) return;
    const after = await loadProgress();
    if (!aliveRef.current) return;
    const stage = current.plan.stage;
    const wasDone = stageState(current.before, stage) === 'done';
    const nowDone = after ? stageState(after, stage) === 'done' : wasDone;
    const justValidated = !current.review && !wasDone && nowDone;
    if (after) setProgress(after);
    setEnd({ stage, review: current.review, justValidated, programFinished: justValidated && Boolean(after?.finished) });
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
      {phase === 'home' && progress && <ReadingHome progress={progress} voiceReady={voiceReady} onStart={start} />}
      {phase === 'session' && session && (
        <ReadingSession plan={session.plan} review={session.review} profileId={profile.id} onFinish={onFinish} />
      )}
      {phase === 'end' && end && <ReadingEnd info={end} onContinue={backHome} />}
    </div>
  );
}
