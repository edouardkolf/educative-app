// « La machine à syllabes » : deux blocs glissent l'un vers l'autre et se collent (~1,2 s) ; on touche la syllabe
// écrite. Résolue : l'image d'un mot qui commence par la syllabe apparaît (LA comme LAMA).
import { SYLLABLES } from "../curriculum";
import type { ReadingViewProps } from "../types";
import { ChoiceRow } from "./ChoiceRow";
import { LetterTile } from "./LetterTile";
import { Pic } from "./PictureCard";

export function SyllableMachineView(props: ReadingViewProps) {
  const { question, solved } = props;
  const { stimulus } = question;
  if (stimulus.kind !== "syllable")
    return <div class="rv rv-machine-view" data-game="syllable-machine" />;

  const [left, right] = stimulus.parts;
  const picture = solved
    ? SYLLABLES.find((s) => s.id === stimulus.syllable.toLowerCase())?.picture
    : null;

  return (
    <div class="rv rv-machine-view" data-game="syllable-machine">
      <div class={solved ? "rv-machine rv-machine--solved" : "rv-machine"}>
        <span class="rv-rail rv-rail--top" aria-hidden="true" />
        <div
          class="rv-machine-stage"
          key={`${stimulus.syllable}-${question.target}`}
        >
          <div class="rv-core">
            <span
              class="rv-block rv-block--left"
              data-len={Math.min(left.length, 3)}
            >
              {left}
            </span>
            <span
              class="rv-block rv-block--right"
              data-len={Math.min(right.length, 3)}
            >
              {right}
            </span>
          </div>
          {picture && (
            <div class="rv-machine-pic">
              <Pic id={picture} />
            </div>
          )}
        </div>
        <span class="rv-rail rv-rail--bottom" aria-hidden="true" />
      </div>
      <ChoiceRow view={props} render={(c) => <LetterTile text={c.label} />} />
    </div>
  );
}
