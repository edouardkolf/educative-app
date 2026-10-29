import { describe, expect, it } from 'vitest';
import type { HangmanRecord } from '../../storage/hangmans';
import type { TicTacToeRecord } from '../../storage/tictactoes';
import { summarizeTicTacToes } from '../tictactoe/stats';
import { summarizeHangmans } from './stats';

const base = { profileId: 'p', endedAt: 2, status: 'completed' as const, endReason: null, activeMs: 1000 };

function hm(id: string, word: string, outcome: HangmanRecord['outcome'], mistakes: number, startedAt: number): HangmanRecord {
  return { ...base, id, startedAt, wordId: word, word, guesses: [], mistakes, maxMistakes: 8, outcome };
}

function ttt(id: string, mode: TicTacToeRecord['mode'], outcome: TicTacToeRecord['outcome']): TicTacToeRecord {
  return { ...base, id, startedAt: 1, mode, xStarts: true, moves: [], outcome };
}

describe('statistiques du pendu', () => {
  it('compte les mots trouvés, les erreurs moyennes et les derniers ratés', () => {
    const s = summarizeHangmans([
      hm('1', 'lion', 'found', 2, 1),
      hm('2', 'zèbre', 'lost', 8, 2),
      hm('3', 'pomme', 'found', 4, 3),
      hm('4', 'vélo', null, 1, 4),
    ]);
    expect(s.wordsPlayed).toBe(3);
    expect(s.wordsFound).toBe(2);
    expect(s.foundRate).toBeCloseTo(2 / 3);
    expect(s.meanMistakesWhenFound).toBe(3);
    expect(s.recentlyMissed).toEqual(['zèbre']);
  });

  it('sans partie : aucun taux', () => {
    expect(summarizeHangmans([]).foundRate).toBeNull();
  });
});

describe('statistiques du morpion', () => {
  it('sépare le solo du jeu à deux et ignore les grilles sans issue', () => {
    const s = summarizeTicTacToes([
      ttt('1', 'solo', 'x'),
      ttt('2', 'solo', 'o'),
      ttt('3', 'solo', 'draw'),
      ttt('4', 'solo', 'x'),
      ttt('5', 'duo', 'o'),
      ttt('6', 'solo', null),
    ]);
    expect(s).toEqual({ soloGrids: 4, soloWins: 2, soloLosses: 1, soloDraws: 1, soloWinRate: 0.5, duoGrids: 1 });
  });
});
