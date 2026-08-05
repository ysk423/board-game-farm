import { describe, expect, it } from 'vitest';
import { BLACK, createEmptyBoard, WHITE } from './board';
import { checkWin, isBoardFull } from './rules';

describe('checkWin', () => {
  it('横に4つ並べば勝ち', () => {
    const board = createEmptyBoard();
    for (let col = 3; col <= 5; col++) board[7][col] = BLACK;
    expect(checkWin(board, 7, 5)).toBe(false); // まだ3つ
    board[7][6] = BLACK;
    expect(checkWin(board, 7, 6)).toBe(true);
  });

  it('斜めに4つ並べば勝ち', () => {
    const board = createEmptyBoard();
    for (let i = 0; i < 4; i++) board[i][i] = WHITE;
    expect(checkWin(board, 3, 3)).toBe(true);
  });

  it('3つでは勝ちにならない', () => {
    const board = createEmptyBoard();
    for (let col = 0; col < 3; col++) board[0][col] = BLACK;
    expect(checkWin(board, 0, 2)).toBe(false);
  });
});

describe('isBoardFull', () => {
  it('空きがあればfalse', () => {
    expect(isBoardFull(createEmptyBoard())).toBe(false);
  });
});
