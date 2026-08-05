import { describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from './board';
import { getCpuMove } from './ai';

function emptyState(turn: 1 | 2 = 2): GameState {
  const state = createInitialState();
  state.board = state.board.map((row) => row.map(() => ({ S: null, M: null, L: null })));
  state.turn = turn;
  return state;
}

describe('getCpuMove', () => {
  it.each(['easy', 'medium', 'hard'] as const)('%sで初期局面から合法な手を返す', (difficulty) => {
    const state = createInitialState();
    const move = getCpuMove(state, difficulty);
    expect(move.row).toBeGreaterThanOrEqual(0);
    expect(['S', 'M', 'L']).toContain(move.size);
  });

  it('弱: 自分が置けば勝てる手を必ず打つ', () => {
    const state = emptyState(2);
    state.board[0][0].M = 2;
    state.board[0][1].M = 2;
    const move = getCpuMove(state, 'easy');
    expect(move).toEqual({ row: 0, col: 2, size: 'M' });
  });

  it('強: 自分が置けば勝てる手を見逃さない', () => {
    const state = emptyState(2);
    state.board[1][1].S = 2;
    state.board[1][1].M = 2;
    const move = getCpuMove(state, 'hard');
    expect(move).toEqual({ row: 1, col: 1, size: 'L' });
  });
});
