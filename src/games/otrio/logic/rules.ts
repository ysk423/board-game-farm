import { BOARD_SIZE, type Board, cloneState, type GameState, type Player, SIZES, type Size } from './board';

export interface Move {
  row: number;
  col: number;
  size: Size;
}

/** 8ライン（行3・列3・斜め2）の座標定義 */
export const LINES: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [[0, 0], [0, 1], [0, 2]],
  [[1, 0], [1, 1], [1, 2]],
  [[2, 0], [2, 1], [2, 2]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 1], [1, 1], [2, 1]],
  [[0, 2], [1, 2], [2, 2]],
  [[0, 0], [1, 1], [2, 2]],
  [[0, 2], [1, 1], [2, 0]],
];

export function getLegalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  const inventory = state.inventory[state.turn];

  for (const size of SIZES) {
    if (inventory[size] <= 0) continue;
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (state.board[row][col][size] === null) {
          moves.push({ row, col, size });
        }
      }
    }
  }
  return moves;
}

/** 合法性のチェックは呼び出し側の責務（既存ゲームと同じ方針） */
export function applyMove(state: GameState, move: Move): GameState {
  const next = cloneState(state);
  const mover = state.turn;

  next.board[move.row][move.col][move.size] = mover;
  next.inventory[mover][move.size] -= 1;
  next.turn = mover === 1 ? 2 : 1;

  return next;
}

/** 同サイズの3並びがあるか判定 */
function hasSameSizeLine(board: Board, player: Player): boolean {
  for (const line of LINES) {
    for (const size of SIZES) {
      if (line.every(([r, c]) => board[r][c][size] === player)) return true;
    }
  }
  return false;
}

/** いずれかのマスで小・中・大すべてが自分の駒（トリオ）になっているか判定 */
function hasTriStack(board: Board, player: Player): boolean {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const cell = board[row][col];
      if (cell.S === player && cell.M === player && cell.L === player) return true;
    }
  }
  return false;
}

export function checkWin(board: Board, player: Player): boolean {
  return hasSameSizeLine(board, player) || hasTriStack(board, player);
}

/** 両者の持ち駒が尽きた（18手指し終えた）かどうか */
export function isGameOver(state: GameState): boolean {
  const p1 = state.inventory[1];
  const p2 = state.inventory[2];
  return p1.S + p1.M + p1.L === 0 && p2.S + p2.M + p2.L === 0;
}
