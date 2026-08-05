export const BOARD_SIZE = 3;

/** 1=プレイヤー（先手）, 2=CPU（後手） */
export type Player = 1 | 2;

export type Size = 'S' | 'M' | 'L';
export const SIZES: Size[] = ['S', 'M', 'L'];

/** マスの中身。サイズごとに最大1個まで駒を置ける（置いたら取り除かれない） */
export interface Cell {
  S: Player | null;
  M: Player | null;
  L: Player | null;
}

export type Board = Cell[][];

export type Inventory = Record<Size, number>;

export interface GameState {
  board: Board;
  inventory: Record<Player, Inventory>;
  turn: Player;
}

export function opponentOf(player: Player): Player {
  return player === 1 ? 2 : 1;
}

export function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function createEmptyCell(): Cell {
  return { S: null, M: null, L: null };
}

function createInitialInventory(): Inventory {
  return { S: 3, M: 3, L: 3 };
}

export function createInitialState(): GameState {
  return {
    board: Array.from({ length: BOARD_SIZE }, () =>
      Array.from({ length: BOARD_SIZE }, () => createEmptyCell()),
    ),
    inventory: {
      1: createInitialInventory(),
      2: createInitialInventory(),
    },
    turn: 1,
  };
}

export function cloneState(state: GameState): GameState {
  return {
    board: state.board.map((row) => row.map((cell) => ({ ...cell }))),
    inventory: {
      1: { ...state.inventory[1] },
      2: { ...state.inventory[2] },
    },
    turn: state.turn,
  };
}
