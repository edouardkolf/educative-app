// Registre des huit vues de jeu (LECTURE.md §4). Chaque vue reçoit `ReadingViewProps` et ne fait qu'afficher.
import type { ComponentType } from "preact";
import type { ReadingGameId, ReadingViewProps } from "../types";
import { FirstSoundView } from "./FirstSoundView";
import { LetterSoundView } from "./LetterSoundView";
import { LetterTwinsView } from "./LetterTwinsView";
import { MysteryWordView } from "./MysteryWordView";
import { SameEndView } from "./SameEndView";
import { SameStartView } from "./SameStartView";
import { SyllableDrumView } from "./SyllableDrumView";
import { SyllableMachineView } from "./SyllableMachineView";
import "./views.css";

export const READING_VIEWS: Record<
  ReadingGameId,
  ComponentType<ReadingViewProps>
> = {
  "syllable-drum": SyllableDrumView,
  "same-start": SameStartView,
  "same-end": SameEndView,
  "letter-sound": LetterSoundView,
  "first-sound": FirstSoundView,
  "syllable-machine": SyllableMachineView,
  "mystery-word": MysteryWordView,
  "letter-twins": LetterTwinsView,
};
