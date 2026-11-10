// Rangée de choix : un ChoiceButton par choix de la question, contenu fourni par la vue.
import type { ComponentChildren } from "preact";
import type { ReadingChoice, ReadingViewProps } from "../types";
import { ChoiceButton } from "./ChoiceButton";
import { choiceFlags } from "./logic";

interface ChoiceRowProps {
  view: ReadingViewProps;
  /** Contenu d'un choix (image, lettre, syllabe…). */
  render: (choice: ReadingChoice) => ComponentChildren;
  class?: string;
}

export function ChoiceRow({ view, render, class: extra }: ChoiceRowProps) {
  const n = view.question.choices.length;
  return (
    <div class={extra ? `rv-choices ${extra}` : "rv-choices"} data-n={n}>
      {view.question.choices.map((choice, i) => (
        <ChoiceButton
          key={choice.id}
          id={choice.id}
          index={i}
          flags={choiceFlags(view, choice.id)}
          onChoose={view.onChoose}
        >
          {render(choice)}
        </ChoiceButton>
      ))}
    </div>
  );
}
