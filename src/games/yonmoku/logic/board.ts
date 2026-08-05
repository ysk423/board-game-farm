export const BOARD_SIZE = 15;

/** 0=空, 1=黒(プレイヤー/先手), 2=白(CPU/後手) */
export type Stone = 0 | 1 | 2;
export type Board = Stone[][];

export const BLACK: Stone = 1;
export const WHITE: Stone = 2;

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array<Stone>(BOARD_SIZE).fill(0));
}

export function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}
