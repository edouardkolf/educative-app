// « Le mot mystère » : le mot écrit en très grand, trois images au choix. À la relance, les syllabes
// s'allument une à une (deux passages) avant que la bonne image ne clignote.
import { useEffect, useState } from "preact/hooks";
import type { ReadingViewProps } from "../types";
import { ChoiceRow } from "./ChoiceRow";
import { Pic } from "./PictureCard";
import { mysteryHintTimeline, wordFontUnits } from "./logic";

export function MysteryWordView(props: ReadingViewProps) {
  const { question, solved, hintChoice } = props;
  const { stimulus } = question;
  const [lit, setLit] = useState<number | null>(null);
  const [blink, setBlink] = useState(false);
  const syllables =
    stimulus.kind === "word" && stimulus.syllables.length > 0
      ? stimulus.syllables
      : null;
  const count = syllables ? syllables.length : 1;

  useEffect(() => {
    setLit(null);
    setBlink(false);
    if (hintChoice === null || solved) return;
    const timers: number[] = [];
    const timeline = mysteryHintTimeline(count);
    timeline.steps.forEach(({ at, index }) => {
      timers.push(window.setTimeout(() => setLit(index), at));
      timers.push(window.setTimeout(() => setLit(null), at + 520));
    });
    timers.push(window.setTimeout(() => setBlink(true), timeline.blinkAt));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [hintChoice, solved, question, count]);

  if (stimulus.kind !== "word")
    return <div class="rv rv-mystery" data-game="mystery-word" />;

  const parts = syllables ?? [stimulus.word];
  const letters = parts.join("").length;
  return (
    <div class="rv rv-mystery" data-game="mystery-word">
      <div
        class={solved ? "rv-word rv-word--solved" : "rv-word"}
        style={{
          "--word-size": `calc(var(--u) * ${wordFontUnits(letters).toFixed(2)})`,
        }}
      >
        {parts.map((part, i) => (
          <span
            key={i}
            class={`rv-syl rv-syl--${i % 2}${lit === i ? " rv-syl--lit" : ""}`}
          >
            {part}
          </span>
        ))}
      </div>
      <ChoiceRow
        view={{ ...props, hintChoice: blink ? hintChoice : null }}
        render={(c) => <Pic id={c.picture} />}
      />
    </div>
  );
}
