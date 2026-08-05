export const BOARD_SIZE = 3;

/** 0=空, 1=○(プレイヤー/先手), 2=×(CPU/後手) */
export type Stone = 0 | 1 | 2;
export type Board = Stone[][];

export const MARU: Stone = 1;
export const BATSU: Stone = 2;

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array<Stone>(BOARD_SIZE).fill(0));
}

export function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}
