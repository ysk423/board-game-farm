import { describe, expect, it } from 'vitest';
import { BLACK, createEmptyBoard, WHITE } from './board';
import { checkWin, isBoardFull } from './rules';

describe('checkWin', () => {
  it('横に5つ並べば勝ち', () => {
    const board = createEmptyBoard();
    for (let col = 3; col <= 6; col++) board[7][col] = BLACK;
    expect(checkWin(board, 7, 6)).toBe(false); // まだ4つ
    board[7][7] = BLACK;
    expect(checkWin(board, 7, 7)).toBe(true);
  });

  it('斜めに5つ並べば勝ち', () => {
    const board = createEmptyBoard();
    for (let i = 0; i < 5; i++) board[i][i] = WHITE;
    expect(checkWin(board, 4, 4)).toBe(true);
  });

  it('4つでは勝ちにならない', () => {
    const board = createEmptyBoard();
    for (let col = 0; col < 4; col++) board[0][col] = BLACK;
    expect(checkWin(board, 0, 3)).toBe(false);
  });
});

describe('isBoardFull', () => {
  it('空きがあればfalse', () => {
    expect(isBoardFull(createEmptyBoard())).toBe(false);
  });
});
