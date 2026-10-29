// Données d'une manche « Devine le nombre ».
import type { GuessNumberParams } from '../../engine/types';

export interface GuessNumberRoundData {
  /** Nombre secret (la vue en a besoin pour répondre « plus grand / plus petit »). */
  secret: number;
  min: number;
  max: number;
  maxGuesses: number;
  input: GuessNumberParams['input'];
}
