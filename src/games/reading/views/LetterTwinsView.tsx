// « Les jumelles » : une capitale, trois minuscules scriptes (Andika) ; on touche la même lettre, en petit.
import { getGrapheme } from "../curriculum";
import type { ReadingViewProps } from "../types";
import { ChoiceRow } from "./ChoiceRow";
import { LetterTile } from "./LetterTile";

export function LetterTwinsView(props: ReadingViewProps) {
  const { stimulus } = props.question;
  const upper =
    stimulus.kind === "letter"
      ? (getGrapheme(stimulus.grapheme)?.upper ??
        stimulus.grapheme.toUpperCase())
      : "";
  return (
    <div class="rv rv-letters rv-twins" data-game="letter-twins">
      <div class="rv-stim rv-stim--letter">
        <LetterTile text={upper} />
      </div>
      <svg class="rv-arrow" viewBox="0 0 48 28" aria-hidden="true">
        <path d="M6 5l18 17L42 5" />
      </svg>
      <ChoiceRow
        view={props}
        render={(c) => <LetterTile text={c.label} lower />}
      />
    </div>
  );
}
