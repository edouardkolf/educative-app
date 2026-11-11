// « La lettre qui chante » : un grand haut-parleur, 2 ou 3 lettres au choix. Pour une lettre nouvelle,
// pendant la présentation (consigne en cours) : la lettre seule en grand avec l'image du mot repère.
import { getGrapheme } from "../curriculum";
import type { ReadingViewProps } from "../types";
import { ChoiceRow } from "./ChoiceRow";
import { LetterTile } from "./LetterTile";
import { Pic } from "./PictureCard";
import { Speaker } from "./Speaker";

export function LetterSoundView(props: ReadingViewProps) {
  const { question, disabled, solved } = props;
  const { stimulus } = question;
  const grapheme =
    stimulus.kind === "sound" ? getGrapheme(stimulus.grapheme) : undefined;
  const presenting =
    question.isNew && (disabled || solved) && grapheme !== undefined;

  return (
    <div class="rv rv-letters" data-game="letter-sound">
      {presenting && grapheme ? (
        <div class="rv-present" data-testid="reading-new-letter">
          <div class="rv-present-letter">
            <LetterTile text={grapheme.upper} />
          </div>
          {grapheme.keyword && (
            <div class="rv-present-pic">
              <Pic id={grapheme.keyword} />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          class="rv-speaker-btn"
          data-testid="reading-model"
          aria-label="réécouter le son"
          onClick={props.onReplayModel}
        >
          <Speaker />
        </button>
      )}
      <ChoiceRow view={props} render={(c) => <LetterTile text={c.label} />} />
    </div>
  );
}
