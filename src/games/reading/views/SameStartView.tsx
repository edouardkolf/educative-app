// « Qui commence pareil ? » : une image modèle, trois images au choix.
import type { ReadingViewProps } from "../types";
import { ChoiceRow } from "./ChoiceRow";
import { Pic, PictureCard } from "./PictureCard";

export function SameStartView(props: ReadingViewProps) {
  const { stimulus } = props.question;
  return (
    <div class="rv rv-pictures rv-pictures--start" data-game="same-start">
      {stimulus.kind === "picture" && (
        <PictureCard
          id={stimulus.picture}
          class="rv-stim--model"
          onTap={props.onReplayModel}
        />
      )}
      <ChoiceRow view={props} render={(c) => <Pic id={c.picture} />} />
    </div>
  );
}
