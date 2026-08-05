import { describe, expect, it } from 'vitest';
import { createInitialState, topOf, type GameState } from './board';
import { applyMove, checkRepetition, checkWin, getLegalMoves } from './rules';

function emptyState(turn: 1 | 2 = 1): GameState {
  const state = createInitialState();
  state.turn = turn;
  return state;
}

describe('createInitialState', () => {
  it('両者とも持ち駒が小中大2個ずつ、先手番から始まる', () => {
    const state = createInitialState();
    expect(state.inventory[1]).toEqual({ S: 2, M: 2, L: 2 });
    expect(state.inventory[2]).toEqual({ S: 2, M: 2, L: 2 });
    expect(state.turn).toBe(1);
  });

  it('初期局面の合法手は27通り（3サイズ×9マスの配置のみ、盤上に駒がないため移動手はなし）', () => {
    const moves = getLegalMoves(createInitialState());
    expect(moves).toHaveLength(27);
  });
});

describe('被せ配置', () => {
  it('自分より小さい駒の上には被せて置けるが、同じか大きい駒の上には置けない', () => {
    const state = emptyState();
    state.board[0][0].push({ owner: 2, size: 'S' });
    const moves = getLegalMoves(state);
    expect(moves).toContainEqual({ kind: 'place', row: 0, col: 0, size: 'M' });
    expect(moves).toContainEqual({ kind: 'place', row: 0, col: 0, size: 'L' });
    expect(moves).not.toContainEqual({ kind: 'place', row: 0, col: 0, size: 'S' });
  });
});

describe('applyMove（配置）', () => {
  it('駒を置くと持ち駒が減り手番が交代する', () => {
    const state = createInitialState();
    const next = applyMove(state, { kind: 'place', row: 0, col: 0, size: 'S' });
    expect(topOf(next.board[0][0])).toEqual({ owner: 1, size: 'S' });
    expect(next.inventory[1].S).toBe(1);
    expect(next.turn).toBe(2);
  });

  it('被せて置くと下の駒は残ったまま一番上だけが変わる', () => {
    const state = emptyState();
    state.board[0][0].push({ owner: 2, size: 'S' });
    const next = applyMove(state, { kind: 'place', row: 0, col: 0, size: 'L' });
    expect(next.board[0][0]).toHaveLength(2);
    expect(topOf(next.board[0][0])).toEqual({ owner: 1, size: 'L' });
  });
});

describe('applyMove（移動）', () => {
  it('盤上の自分の駒を動かすと、移動元は下の駒が現れる（無ければ空になる）', () => {
    const state = emptyState();
    state.board[0][0].push({ owner: 1, size: 'S' });
    state.board[0][0].push({ owner: 1, size: 'L' });
    const next = applyMove(state, { kind: 'move', from: { row: 0, col: 0 }, to: { row: 1, col: 1 } });
    expect(topOf(next.board[0][0])).toEqual({ owner: 1, size: 'S' });
    expect(topOf(next.board[1][1])).toEqual({ owner: 1, size: 'L' });
    expect(next.turn).toBe(2);
  });
});

describe('checkWin', () => {
  it('一番上に見えている自分の駒が縦横斜めに3つ並べば勝ち', () => {
    const state = emptyState();
    state.board[0][0].push({ owner: 1, size: 'S' });
    state.board[0][1].push({ owner: 1, size: 'M' });
    expect(checkWin(state.board, 1)).toBe(false);
    state.board[0][2].push({ owner: 1, size: 'L' });
    expect(checkWin(state.board, 1)).toBe(true);
  });

  it('相手の駒に被せて隠すと、その列は相手の勝ちにならない', () => {
    const state = emptyState();
    state.board[0][0].push({ owner: 2, size: 'S' });
    state.board[0][1].push({ owner: 2, size: 'S' });
    state.board[0][2].push({ owner: 2, size: 'S' });
    expect(checkWin(state.board, 2)).toBe(true);
    state.board[0][1].push({ owner: 1, size: 'L' });
    expect(checkWin(state.board, 2)).toBe(false);
  });
});

describe('checkRepetition', () => {
  it('同一局面が3回未満なら引き分けにならない', () => {
    expect(checkRepetition(['a', 'b', 'a'])).toBe(false);
  });

  it('同一局面が3回出現したら引き分け', () => {
    expect(checkRepetition(['a', 'b', 'a', 'b', 'a'])).toBe(true);
  });
});
