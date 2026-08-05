import { describe, expect, it } from 'vitest';
import { BATSU, createEmptyBoard, MARU } from './board';
import { getCpuMove } from './ai';

describe('getCpuMove (easy)', () => {
  it('自分が置けば3並びになる手を必ず打つ', () => {
    const board = createEmptyBoard();
    board[0][0] = BATSU;
    board[0][1] = BATSU;
    const move = getCpuMove(board, 'easy', BATSU, MARU);
    expect(move).toEqual({ row: 0, col: 2 });
  });

  it('相手が次に置けば3並びになる手を阻止する', () => {
    const board = createEmptyBoard();
    board[1][0] = MARU;
    board[1][1] = MARU;
    const move = getCpuMove(board, 'easy', BATSU, MARU);
    expect(move).toEqual({ row: 1, col: 2 });
  });
});

describe('getCpuMove (hard)', () => {
  it('勝てる手があれば見逃さない', () => {
    const board = createEmptyBoard();
    board[0][0] = BATSU;
    board[0][1] = BATSU;
    const move = getCpuMove(board, 'hard', BATSU, MARU);
    expect(move).toEqual({ row: 0, col: 2 });
  });

  it('負けが確定する手を防ぐ', () => {
    const board = createEmptyBoard();
    board[2][0] = MARU;
    board[2][1] = MARU;
    const move = getCpuMove(board, 'hard', BATSU, MARU);
    expect(move).toEqual({ row: 2, col: 2 });
  });
});
