// Une séance de « J'apprends à lire » (LECTURE.md §2 et §9) : maison, points d'avancement, haut-parleur, et la vue
// du jeu en cours. Tout l'enchaînement (voix, relance, enregistrement) est dans `useQuestionFlow`.
import { returnTo } from '../../app/routes';
import { IconButton } from '../../ui/IconButton';
import { Icon } from '../../ui/icons/Icon';
import { TutorialHand } from '../../ui/TutorialHand';
import { STAGE_COLORS } from './StageIcon';
import { useQuestionFlow } from './useQuestionFlow';
import { READING_VIEWS } from './views';
import type { ReadingAnswer, ReadingSessionPlan } from './types';

interface ReadingSessionProps {
  plan: ReadingSessionPlan;
  review: boolean;
  profileId: string;
  onFinish: (answers: readonly ReadingAnswer[]) => void;
}

export function ReadingSession({ plan, review, profileId, onFinish }: ReadingSessionProps) {
  const flow = useQuestionFlow({ plan, review, profileId, onFinish });
  const { question, viewProps, dots } = flow;
  const colors = STAGE_COLORS[plan.stage];
  const View = question ? READING_VIEWS[question.game] : null;

  return (
    <div
      class="screen rd-session"
      data-testid="reading-session"
      data-stage={plan.stage}
      data-phase={flow.finishing ? 'end' : 'play'}
      style={`--rd-main:${colors.main};--rd-soft:${colors.soft};--rd-dark:${colors.dark}`}
    >
      <header class="rd-topbar">
        <IconButton
          size={56}
          onClick={() => {
            flow.goHome();
            returnTo('hub');
          }}
          aria-label="Retour à l'accueil"
          data-testid="to-hub"
        >
          <Icon name="home" size={36} />
        </IconButton>
        <ol class="rd-dots" data-testid="reading-dots" aria-hidden="true">
          {Array.from({ length: dots.total }, (_, i) => (
            <li
              key={i}
              class="rd-dot"
              data-state={i < dots.done ? 'done' : i === dots.done && !flow.finishing ? 'current' : 'todo'}
            />
          ))}
        </ol>
        <button
          type="button"
          class="rd-replay"
          onClick={flow.replay}
          aria-label="Réécouter"
          data-testid="reading-replay"
        >
          <Icon name="speaker" size={44} />
        </button>
      </header>

      {question && View && viewProps && (
        <main
          key={flow.turn}
          class="rd-question"
          data-testid="reading-question"
          data-game={question.game}
          data-answer={question.answer}
          data-item={question.itemId}
          data-guided={viewProps.guided ? 'true' : undefined}
          data-retry={flow.retry ? 'true' : undefined}
          data-solved={viewProps.solved ? 'true' : undefined}
          data-ready={viewProps.disabled ? undefined : 'true'}
        >
          <View question={question} {...viewProps} />
        </main>
      )}

      {flow.handTargets && <TutorialHand key={flow.turn} targets={flow.handTargets} />}
    </div>
  );
}
