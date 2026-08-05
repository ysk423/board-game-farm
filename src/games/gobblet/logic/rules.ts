import {
  BOARD_SIZE,
  type Board,
  cloneState,
  type GameState,
  positionKey,
  SIZE_ORDER,
  SIZES,
  type Size,
  topOf,
} from './board';

export type Move =
  | { kind: 'place'; row: number; col: number; size: Size }
  | { kind: 'move'; from: { row: number; col: number }; to: { row: number; col: number } };

/** 8ライン（行3・列3・斜め2）の座標定義（オートリオと同じ） */
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
  const turn = state.turn;
  const inventory = state.inventory[turn];

  // 新規配置: 持ち駒があり、置き先が空きまたは自分より小さい駒の上であること
  for (const size of SIZES) {
    if (inventory[size] <= 0) continue;
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const top = topOf(state.board[row][col]);
        if (!top || SIZE_ORDER[top.size] < SIZE_ORDER[size]) {
          moves.push({ kind: 'place', row, col, size });
        }
      }
    }
  }

  // 移動: 盤上の自分の駒（一番上）を、空きまたはより小さい駒の上へ動かせる
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const top = topOf(state.board[row][col]);
      if (!top || top.owner !== turn) continue;
      for (let r2 = 0; r2 < BOARD_SIZE; r2++) {
        for (let c2 = 0; c2 < BOARD_SIZE; c2++) {
          if (r2 === row && c2 === col) continue;
          const destTop = topOf(state.board[r2][c2]);
          if (!destTop || SIZE_ORDER[destTop.size] < SIZE_ORDER[top.size]) {
            moves.push({ kind: 'move', from: { row, col }, to: { row: r2, col: c2 } });
          }
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

  if (move.kind === 'place') {
    next.board[move.row][move.col].push({ owner: mover, size: move.size });
    next.inventory[mover][move.size] -= 1;
  } else {
    const piece = next.board[move.from.row][move.from.col].pop();
    if (piece) next.board[move.to.row][move.to.col].push(piece);
  }

  next.turn = mover === 1 ? 2 : 1;
  next.history = [...state.history, positionKey(next)];
  return next;
}

/** 一番上に見えている駒（topOwner）が縦横斜めのいずれかで揃っているか判定 */
export function checkWin(board: Board, player: 1 | 2): boolean {
  for (const line of LINES) {
    if (line.every(([r, c]) => topOf(board[r][c])?.owner === player)) return true;
  }
  return false;
}

/**
 * 同一局面（盤面+持ち駒+手番）が3回出現したら引き分けとする。
 * 本家ルールには存在しない実装上のセーフガード。盤上の駒を動かし続けるだけで
 * 理論上は無限に対局が続き得るため、五五将棋のcheckRepetitionと同じ考え方で
 * 無限対局を防止する目的で追加している。
 */
export function checkRepetition(history: string[]): boolean {
  if (history.length === 0) return false;
  const last = history[history.length - 1];
  return history.filter((key) => key === last).length >= 3;
}
