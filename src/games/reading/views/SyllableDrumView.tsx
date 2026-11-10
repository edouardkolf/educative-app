// « Le tambour » : l'enfant tape une fois par syllabe ; la vue compte, puis valide 2 s après la dernière frappe.
import { useEffect, useRef, useState } from "preact/hooks";
import { playTap } from "../../../ui/sound";
import type { ReadingViewProps } from "../types";
import { PictureCard } from "./PictureCard";
import {
  addTap,
  DRUM_MAX_TAPS,
  DRUM_VALIDATE_MS,
  drumPulseTimes,
} from "./logic";

function DrumArt() {
  return (
    <svg viewBox="0 0 220 190" class="rv-drum-art" aria-hidden="true">
      <line class="rv-stick" x1="52" y1="14" x2="92" y2="60" />
      <line class="rv-stick" x1="168" y1="14" x2="128" y2="60" />
      <circle class="rv-stick-tip" cx="52" cy="14" r="9" />
      <circle class="rv-stick-tip" cx="168" cy="14" r="9" />
      <path
        class="rv-drum-body"
        d="M20 84v72c0 14 40 26 90 26s90-12 90-26V84z"
      />
      <path
        class="rv-drum-zig"
        d="M30 98l20 66 20-66 20 66 20-66 20 66 20-66 20 66 20-66 20 66"
      />
      <ellipse class="rv-drum-rim" cx="110" cy="84" rx="90" ry="26" />
      <ellipse class="rv-drum-skin" cx="110" cy="84" rx="80" ry="20" />
    </svg>
  );
}

export function SyllableDrumView(props: ReadingViewProps) {
  const { question, wrongChoices, solved, hintChoice, disabled } = props;
  const [taps, setTaps] = useState(0);
  const [stamp, setStamp] = useState(0);
  const [bounce, setBounce] = useState(0);
  const [pulseKey, setPulseKey] = useState(0);
  const [ring, setRing] = useState(false);
  const sent = useRef(false);
  const latest = useRef(props);
  latest.current = props;

  // Nouvelle question ou erreur : les points s'effacent, on recommence.
  useEffect(() => {
    sent.current = false;
    setTaps(0);
    setStamp(0);
  }, [question, wrongChoices.length]);

  // Validation 2 s après la dernière frappe.
  useEffect(() => {
    if (stamp === 0) return;
    const id = window.setTimeout(() => {
      const p = latest.current;
      if (p.solved || p.disabled) return;
      sent.current = true;
      p.onChoose(String(taps));
    }, DRUM_VALIDATE_MS);
    return () => window.clearTimeout(id);
  }, [stamp]);

  // Relance : le tambour pulse `answer` fois en rythme.
  useEffect(() => {
    if (hintChoice === null || solved) {
      setRing(false);
      return;
    }
    const timers: number[] = [];
    drumPulseTimes(question.answer).forEach((at) => {
      timers.push(
        window.setTimeout(() => {
          setPulseKey((k) => k + 1);
          setRing(true);
          timers.push(window.setTimeout(() => setRing(false), 380));
        }, at),
      );
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [hintChoice, solved, question]);

  const inert = solved || disabled;
  const shown = solved
    ? Math.min(DRUM_MAX_TAPS, Number(question.answer) || taps)
    : taps;

  const hit = () => {
    if (inert) return;
    playTap();
    const base = sent.current ? 0 : taps;
    sent.current = false;
    setTaps(addTap(base));
    setStamp((s) => s + 1);
    setBounce((b) => b + 1);
  };

  const classes = ["rv-drum"];
  if (solved) classes.push("rv-drum--correct");
  if (disabled && !solved) classes.push("rv-drum--waiting");
  if (ring) classes.push("rv-drum--ring");

  return (
    <div class="rv rv-drum-view" data-game="syllable-drum" data-taps={shown}>
      {question.stimulus.kind === "picture" && (
        <PictureCard id={question.stimulus.picture} />
      )}
      <button
        type="button"
        class={classes.join(" ")}
        data-choice="drum"
        aria-disabled={inert ? "true" : "false"}
        aria-label="tambour"
        onClick={hit}
      >
        <span
          key={`${bounce}-${pulseKey}`}
          class={
            bounce > 0 || pulseKey > 0
              ? "rv-drum-skin-wrap rv-drum-skin-wrap--hit"
              : "rv-drum-skin-wrap"
          }
        >
          <DrumArt />
        </span>
      </button>
      <div class="rv-dots" aria-hidden="true">
        {Array.from({ length: DRUM_MAX_TAPS }, (_, i) => (
          <span
            key={i}
            class={i < shown ? `rv-dot rv-dot--on rv-dot--${i % 2}` : "rv-dot"}
          />
        ))}
      </div>
    </div>
  );
}
