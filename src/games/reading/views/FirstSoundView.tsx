// « Par quoi ça commence ? » : une image, 2 ou 3 lettres capitales au choix.
import type { ReadingViewProps } from "../types";
import { ChoiceRow } from "./ChoiceRow";
import { LetterTile } from "./LetterTile";
import { PictureCard } from "./PictureCard";

export function FirstSoundView(props: ReadingViewProps) {
  const { stimulus } = props.question;
  return (
    <div class="rv rv-letters" data-game="first-sound">
      {stimulus.kind === "picture" && (
        <PictureCard id={stimulus.picture} onTap={props.onReplayModel} />
      )}
      <ChoiceRow view={props} render={(c) => <LetterTile text={c.label} />} />
    </div>
  );
}
