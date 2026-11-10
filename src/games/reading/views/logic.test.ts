import { describe, expect, it } from "vitest";
import type { ReadingQuestion } from "../types";
import {
  addTap,
  choiceFlags,
  DRUM_MAX_TAPS,
  drumPulseTimes,
  mysteryHintTimeline,
  wordFontUnits,
  type ChoiceStateProps,
} from "./logic";

const question: ReadingQuestion = {
  game: "first-sound",
  itemId: "g:a",
  target: "a",
  stimulus: { kind: "picture", picture: "avion" },
  choices: [
    { id: "a", kind: "letter", label: "A" },
    { id: "i", kind: "letter", label: "I" },
  ],
  answer: "a",
  prompt: [],
  speakChoices: false,
  praise: [],
  isNew: false,
};

const base: ChoiceStateProps = {
  question,
  wrongChoices: [],
  solved: false,
  hintChoice: null,
  spokenChoice: null,
  guided: false,
  disabled: false,
};

describe("choiceFlags", () => {
  it("laisse un choix libre tapable", () => {
    const f = choiceFlags(base, "i");
    expect(f.inert).toBe(false);
    expect(f.wrong).toBe(false);
  });
  it("grise un choix faux et le rend inerte", () => {
    const f = choiceFlags({ ...base, wrongChoices: ["i"] }, "i");
    expect(f.wrong).toBe(true);
    expect(f.inert).toBe(true);
  });
  it("résolu : la réponse fête, tout est inerte", () => {
    const p = { ...base, solved: true };
    expect(choiceFlags(p, "a")).toMatchObject({
      correct: true,
      inert: true,
      dimmed: false,
    });
    expect(choiceFlags(p, "i")).toMatchObject({
      correct: false,
      inert: true,
      dimmed: true,
    });
  });
  it("désactivé : en attente, sans être grisé comme une erreur", () => {
    const f = choiceFlags({ ...base, disabled: true }, "i");
    expect(f).toMatchObject({ waiting: true, wrong: false, inert: true });
  });
  it("guidé : seule la réponse réagit", () => {
    const p = { ...base, guided: true };
    expect(choiceFlags(p, "a").inert).toBe(false);
    expect(choiceFlags(p, "i")).toMatchObject({
      inert: true,
      off: true,
      wrong: false,
    });
  });
  it("relance et voix", () => {
    const p = { ...base, hintChoice: "a", spokenChoice: "i" };
    expect(choiceFlags(p, "a").hint).toBe(true);
    expect(choiceFlags(p, "i").spoken).toBe(true);
    expect(choiceFlags({ ...p, solved: true }, "a").hint).toBe(false);
  });
});

describe("tambour", () => {
  it("compte jusqu'à 4 au plus", () => {
    let n = 0;
    for (let i = 0; i < 7; i++) n = addTap(n);
    expect(n).toBe(DRUM_MAX_TAPS);
    expect(addTap(0)).toBe(1);
  });
  it("pulse autant de fois que la réponse", () => {
    expect(drumPulseTimes("3")).toHaveLength(3);
    expect(drumPulseTimes("1")).toEqual([0]);
    expect(drumPulseTimes("x")).toEqual([]);
    expect(drumPulseTimes("9")).toHaveLength(DRUM_MAX_TAPS);
  });
});

describe("mot mystère", () => {
  it("allume les syllabes deux fois avant de faire clignoter la réponse", () => {
    const t = mysteryHintTimeline(3, 2, 500);
    expect(t.steps.map((s) => s.index)).toEqual([0, 1, 2, 0, 1, 2]);
    expect(t.blinkAt).toBeGreaterThan(t.steps[5]?.at ?? 0);
  });
  it("un mot long tient en largeur", () => {
    expect(wordFontUnits(6) * 0.72 * 6).toBeLessThanOrEqual(80.01);
    expect(wordFontUnits(2)).toBe(26);
  });
});
