import { describe, expect, it } from 'vitest';
import { createInitialState } from './board';
import { getCpuMove } from './ai';
import { checkRepetition, type HistoryEntry } from './rules';

describe('getCpuMove', () => {
  it.each(['easy', 'medium', 'hard'] as const)('%sで初期局面から合法な手を返す', (difficulty) => {
    const state = createInitialState();
    const result = getCpuMove(state, difficulty);
    expect(result.type).toBe('move');
  });
});

describe('checkRepetition', () => {
  function entry(key: string, mover: 'sente' | 'gote', isCheck: boolean): HistoryEntry {
    return { key, mover, isCheck };
  }

  it('4回未満の出現では判定しない', () => {
    const history = [entry('A', 'sente', false), entry('B', 'gote', false), entry('A', 'sente', false)];
    expect(checkRepetition(history)).toEqual({ type: 'none' });
  });

  it('王手を伴わない同一局面4回は先手の負け', () => {
    const history = [
      entry('A', 'sente', false),
      entry('B', 'gote', false),
      entry('A', 'sente', false),
      entry('B', 'gote', false),
      entry('A', 'sente', false),
      entry('B', 'gote', false),
      entry('A', 'sente', false),
    ];
    expect(checkRepetition(history)).toEqual({ type: 'sennichite', loser: 'sente' });
  });

  it('片方が王手をかけ続けた同一局面4回はその側の負け', () => {
    const history = [
      entry('A', 'gote', false),
      entry('B', 'sente', true),
      entry('A', 'gote', false),
      entry('B', 'sente', true),
      entry('A', 'gote', false),
      entry('B', 'sente', true),
      entry('A', 'gote', false),
    ];
    expect(checkRepetition(history)).toEqual({ type: 'perpetual-check', loser: 'sente' });
  });
});
