// CONTRAT — registre des huit vues de jeu (LECTURE.md §4). SOUCHE : la tâche L4 remplace chaque vue.
import type { ComponentType } from 'preact';
import type { ReadingGameId, ReadingViewProps } from '../types';

const Placeholder: ComponentType<ReadingViewProps> = () => null;

export const READING_VIEWS: Record<ReadingGameId, ComponentType<ReadingViewProps>> = {
  'syllable-drum': Placeholder,
  'same-start': Placeholder,
  'same-end': Placeholder,
  'letter-sound': Placeholder,
  'first-sound': Placeholder,
  'syllable-machine': Placeholder,
  'mystery-word': Placeholder,
  'letter-twins': Placeholder,
};
