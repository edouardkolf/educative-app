// « Qui finit pareil ? » (rime) : une image modèle, trois images au choix.
import type { ReadingViewProps } from "../types";
import { ChoiceRow } from "./ChoiceRow";
import { Pic, PictureCard } from "./PictureCard";

export function SameEndView(props: ReadingViewProps) {
  const { stimulus } = props.question;
  return (
    <div class="rv rv-pictures rv-pictures--end" data-game="same-end">
      {stimulus.kind === "picture" && (
        <PictureCard id={stimulus.picture} class="rv-stim--model" />
      )}
      <ChoiceRow view={props} render={(c) => <Pic id={c.picture} />} />
    </div>
  );
}
