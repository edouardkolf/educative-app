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

/**
 * Carte d'image posée seule (modèle, stimulus). Avec `onTap`, c'est un bouton qui fait répéter le mot
 * (`data-testid="reading-model"`) ; ce n'est jamais un choix de réponse.
 */
export function PictureCard({
  id,
  class: extra,
  onTap,
}: {
  id: PictureId | undefined | null;
  class?: string;
  onTap?: () => void;
}) {
  const cls = extra ? `rv-stim ${extra}` : "rv-stim";
  if (!onTap) {
    return (
      <div class={cls}>
        <Pic id={id} />
      </div>
    );
  }
  return (
    <button
      type="button"
      class={`${cls} rv-stim--tap`}
      data-testid="reading-model"
      aria-label="réécouter le mot"
      onClick={onTap}
    >
      <Pic id={id} />
    </button>
  );
}
