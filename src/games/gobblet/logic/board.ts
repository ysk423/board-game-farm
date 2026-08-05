export const BOARD_SIZE = 3;

/** 1=プレイヤー（先手）, 2=CPU（後手） */
export type Player = 1 | 2;

export type Size = 'S' | 'M' | 'L';
export const SIZES: Size[] = ['S', 'M', 'L'];
export const SIZE_ORDER: Record<Size, number> = { S: 0, M: 1, L: 2 };

export interface Piece {
  owner: Player;
  size: Size;
}

/** マスの中身。下から上へ積んだ駒のスタック（大きい駒は小さい駒に被せられる）。空配列=空きマス */
export type Cell = Piece[];
export type Board = Cell[][];

export type Inventory = Record<Size, number>;

export interface GameState {
  board: Board;
  inventory: Record<Player, Inventory>;
  turn: Player;
  // 千日手（同一局面の繰り返し）検出用の局面キー履歴。本家ルールには無い実装上のセーフガード
  history: string[];
}

export function opponentOf(player: Player): Player {
  return player === 1 ? 2 : 1;
}

export function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

/** マスの一番上（＝盤面上で見えている）駒。無ければnull */
export function topOf(cell: Cell): Piece | null {
  return cell.length === 0 ? null : cell[cell.length - 1];
}

// 本家ルール: 各プレイヤーは小・中・大を2個ずつ、計6個持つ
function createInitialInventory(): Inventory {
  return { S: 2, M: 2, L: 2 };
}

export function createInitialState(): GameState {
  return {
    board: Array.from({ length: BOARD_SIZE }, () =>
      Array.from({ length: BOARD_SIZE }, (): Cell => []),
    ),
    inventory: {
      1: createInitialInventory(),
      2: createInitialInventory(),
    },
    turn: 1,
    history: [],
  };
}

export function cloneState(state: GameState): GameState {
  return {
    board: state.board.map((row) => row.map((cell) => cell.map((piece) => ({ ...piece })))),
    inventory: {
      1: { ...state.inventory[1] },
      2: { ...state.inventory[2] },
    },
    turn: state.turn,
    history: [...state.history],
  };
}

/** 盤面+持ち駒+手番から局面キーを生成する（千日手判定用） */
export function positionKey(state: GameState): string {
  const boardPart = state.board
    .map((row) => row.map((cell) => cell.map((p) => `${p.owner}${p.size}`).join('')).join('|'))
    .join('/');
  const invPart = SIZES.map((s) => `${state.inventory[1][s]}${state.inventory[2][s]}`).join('');
  return `${boardPart}#${invPart}#${state.turn}`;
}
