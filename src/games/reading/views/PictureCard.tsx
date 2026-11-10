// Image du catalogue lecture : l'émoji de getPicture(id) ; rien du tout si l'image est introuvable.
import { Emoji } from "../../../ui/Emoji";
import { getPicture } from "../pictures";
import type { PictureId } from "../types";

export function Pic({ id }: { id: PictureId | undefined | null }) {
  const picture = id ? getPicture(id) : undefined;
  if (!picture) return <span class="rv-pic rv-pic--none" />;
  return (
    <span class="rv-pic">
      <Emoji char={picture.emoji} />
    </span>
  );
}

/** Carte d'image posée seule (modèle, stimulus). */
export function PictureCard({
  id,
  class: extra,
}: {
  id: PictureId | undefined | null;
  class?: string;
}) {
  return (
    <div class={extra ? `rv-stim ${extra}` : "rv-stim"}>
      <Pic id={id} />
    </div>
  );
}
