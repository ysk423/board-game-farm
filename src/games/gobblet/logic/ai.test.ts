import { describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from './board';
import { getCpuMove } from './ai';

function emptyState(turn: 1 | 2 = 1): GameState {
  const state = createInitialState();
  state.turn = turn;
  return state;
}

describe('getCpuMove', () => {
  it('easy/medium/hardいずれも初期局面から合法な手を返す', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const move = getCpuMove(createInitialState(), difficulty);
      expect(move).toBeDefined();
    }
  });

  it('easy: 自分が勝てる手があれば見逃さない', () => {
    const state = emptyState(2);
    state.board[0][0].push({ owner: 2, size: 'S' });
    state.board[0][1].push({ owner: 2, size: 'M' });
    const move = getCpuMove(state, 'easy');
    // (0,2)は空きマスなのでどのサイズを置いても勝ちになる。探索順（S→M→L）上、最初に見つかるのはS
    expect(move).toEqual({ kind: 'place', row: 0, col: 2, size: 'S' });
  });

  it('hard: 勝てる手があれば見逃さない', () => {
    const state = emptyState(1);
    state.board[0][0].push({ owner: 1, size: 'S' });
    state.board[0][1].push({ owner: 1, size: 'M' });
    const move = getCpuMove(state, 'hard');
    expect(move.kind).toBe('place');
    if (move.kind === 'place') {
      expect(move.row).toBe(0);
      expect(move.col).toBe(2);
    }
  });
});
