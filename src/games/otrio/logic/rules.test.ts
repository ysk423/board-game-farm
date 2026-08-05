import { describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from './board';
import { applyMove, checkWin, getLegalMoves, isGameOver } from './rules';

function emptyState(turn: 1 | 2 = 1): GameState {
  const state = createInitialState();
  state.turn = turn;
  return state;
}

describe('createInitialState', () => {
  it('両者とも持ち駒が小中大3個ずつ、先手番から始まる', () => {
    const state = createInitialState();
    expect(state.inventory[1]).toEqual({ S: 3, M: 3, L: 3 });
    expect(state.inventory[2]).toEqual({ S: 3, M: 3, L: 3 });
    expect(state.turn).toBe(1);
  });

  it('初期局面の合法手は27通り（3サイズ×9マス）', () => {
    const moves = getLegalMoves(createInitialState());
    expect(moves).toHaveLength(27);
  });
});

describe('checkWin', () => {
  it('同サイズが縦・横・斜めに3つ並べば勝ち', () => {
    const state = emptyState();
    state.board[0][0].M = 1;
    state.board[0][1].M = 1;
    expect(checkWin(state.board, 1)).toBe(false);
    state.board[0][2].M = 1;
    expect(checkWin(state.board, 1)).toBe(true);
  });

  it('サイズが揃っていない列は勝ちにならない', () => {
    const state = emptyState();
    state.board[0][0].S = 1;
    state.board[0][1].M = 1;
    state.board[0][2].L = 1;
    expect(checkWin(state.board, 1)).toBe(false);
  });

  it('1マスに小中大すべて自分の駒があればトリオで勝ち', () => {
    const state = emptyState();
    state.board[1][1].S = 2;
    state.board[1][1].M = 2;
    expect(checkWin(state.board, 2)).toBe(false);
    state.board[1][1].L = 2;
    expect(checkWin(state.board, 2)).toBe(true);
  });
});

describe('applyMove', () => {
  it('駒を置くと持ち駒が減り手番が交代する', () => {
    const state = createInitialState();
    const next = applyMove(state, { row: 0, col: 0, size: 'S' });
    expect(next.board[0][0].S).toBe(1);
    expect(next.inventory[1].S).toBe(2);
    expect(next.turn).toBe(2);
  });
});

describe('isGameOver', () => {
  it('持ち駒が残っていればfalse', () => {
    expect(isGameOver(createInitialState())).toBe(false);
  });

  it('両者の持ち駒が0ならtrue', () => {
    const state = createInitialState();
    state.inventory[1] = { S: 0, M: 0, L: 0 };
    state.inventory[2] = { S: 0, M: 0, L: 0 };
    expect(isGameOver(state)).toBe(true);
  });
});
