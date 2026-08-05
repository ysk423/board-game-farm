import { describe, expect, it } from 'vitest';
import { BLACK, createEmptyBoard, WHITE } from './board';
import { getCpuMove } from './ai';

describe('getCpuMove (easy)', () => {
  it('自分が置けば5連になる手を必ず打つ', () => {
    const board = createEmptyBoard();
    for (let col = 3; col <= 6; col++) board[7][col] = WHITE;
    const move = getCpuMove(board, 'easy', WHITE, BLACK);
    // col3-6の4連は両端(col2/col7)どちらに置いても5連になる
    expect(move.row).toBe(7);
    expect([2, 7]).toContain(move.col);
  });

  it('相手が次に置けば5連になる手を阻止する', () => {
    const board = createEmptyBoard();
    for (let col = 3; col <= 6; col++) board[7][col] = BLACK;
    const move = getCpuMove(board, 'easy', WHITE, BLACK);
    // 7,2 か 7,7 のどちらかで止めれば良い
    expect(move.row).toBe(7);
    expect([2, 7]).toContain(move.col);
  });
});

describe('getCpuMove (hard)', () => {
  it('勝てる手があれば見逃さない', () => {
    const board = createEmptyBoard();
    for (let col = 3; col <= 6; col++) board[7][col] = WHITE;
    const move = getCpuMove(board, 'hard', WHITE, BLACK);
    // col3-6の4連は両端(col2/col7)どちらに置いても5連になる
    expect(move.row).toBe(7);
    expect([2, 7]).toContain(move.col);
  });
});
