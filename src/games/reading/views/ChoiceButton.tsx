// Bouton de choix partagé par les vues : porte data-choice et traduit les états (faux, juste, relance…) en classes.
import type { ComponentChildren } from "preact";
import type { ChoiceFlags } from "./logic";

interface ChoiceButtonProps {
  id: string;
  /** Rang du choix : décide de la teinte (3 teintes qui tournent). */
  index: number;
  flags: ChoiceFlags;
  onChoose: (choiceId: string) => void;
  class?: string;
  children: ComponentChildren;
}

export function ChoiceButton({
  id,
  index,
  flags,
  onChoose,
  class: extra,
  children,
}: ChoiceButtonProps) {
  const classes = ["rv-choice", `rv-tone-${index % 3}`];
  if (flags.wrong) classes.push("rv-choice--wrong");
  if (flags.correct) classes.push("rv-choice--correct");
  if (flags.hint) classes.push("rv-choice--hint");
  if (flags.spoken) classes.push("rv-choice--spoken");
  if (flags.waiting) classes.push("rv-choice--waiting");
  if (flags.off) classes.push("rv-choice--off");
  if (flags.dimmed) classes.push("rv-choice--dim");
  if (extra) classes.push(extra);
  return (
    <button
      type="button"
      class={classes.join(" ")}
      data-choice={id}
      aria-disabled={flags.inert ? "true" : "false"}
      onClick={() => {
        if (!flags.inert) onChoose(id);
      }}
    >
      {children}
    </button>
  );
}
