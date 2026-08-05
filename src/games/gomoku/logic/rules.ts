import { type Board, BOARD_SIZE, isInBounds } from './board';

export const WIN_LENGTH = 5;

// 4方向（横・縦・斜め2種）。逆方向は符号反転して同じベクトルで走査する
export const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

/** 直近に置いた(row, col)を起点に、5つ以上連続しているかを判定する */
export function checkWin(board: Board, row: number, col: number): boolean {
  const stone = board[row][col];
  if (stone === 0) return false;

  for (const [dr, dc] of DIRECTIONS) {
    let count = 1;
    count += countDirection(board, row, col, dr, dc, stone);
    count += countDirection(board, row, col, -dr, -dc, stone);
    if (count >= WIN_LENGTH) return true;
  }
  return false;
}

function countDirection(
  board: Board,
  row: number,
  col: number,
  dr: number,
  dc: number,
  stone: number,
): number {
  let count = 0;
  let r = row + dr;
  let c = col + dc;
  while (isInBounds(r, c) && board[r][c] === stone) {
    count++;
    r += dr;
    c += dc;
  }
  return count;
}

export function isBoardFull(board: Board): boolean {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === 0) return false;
    }
  }
  return true;
}
