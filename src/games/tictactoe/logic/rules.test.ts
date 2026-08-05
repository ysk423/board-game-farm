import { describe, expect, it } from 'vitest';
import { BATSU, createEmptyBoard, MARU } from './board';
import { checkWin, isBoardFull } from './rules';

describe('checkWin', () => {
  it('横に3つ並べば勝ち', () => {
    const board = createEmptyBoard();
    board[0][0] = MARU;
    board[0][1] = MARU;
    expect(checkWin(board, 0, 1)).toBe(false); // まだ2つ
    board[0][2] = MARU;
    expect(checkWin(board, 0, 2)).toBe(true);
  });

  it('斜めに3つ並べば勝ち', () => {
    const board = createEmptyBoard();
    board[0][0] = BATSU;
    board[1][1] = BATSU;
    board[2][2] = BATSU;
    expect(checkWin(board, 2, 2)).toBe(true);
  });

  it('縦に3つ並べば勝ち', () => {
    const board = createEmptyBoard();
    board[0][1] = MARU;
    board[1][1] = MARU;
    board[2][1] = MARU;
    expect(checkWin(board, 2, 1)).toBe(true);
  });
});

describe('isBoardFull', () => {
  it('空きがあればfalse', () => {
    expect(isBoardFull(createEmptyBoard())).toBe(false);
  });

  it('全マス埋まればtrue', () => {
    const board = createEmptyBoard();
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        board[row][col] = (row + col) % 2 === 0 ? MARU : BATSU;
      }
    }
    expect(isBoardFull(board)).toBe(true);
  });
});
