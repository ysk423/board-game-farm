import type { Difficulty } from '../../../types/common';

export type Player = 'black' | 'white';

export type BoardColor = 'dark' | 'light';

export type BoardPosition = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

// PASSIVE_SELECT/CONFIRM=パッシブ移動（リード）の選択・確定、AGGRESSIVE_SELECT/CONFIRM=アグレッシブ移動（フォロー）の選択・確定
export type TurnPhase = 'passiveSelect' | 'passiveConfirm' | 'aggressiveSelect' | 'aggressiveConfirm' | 'gameOver';

export interface Pos {
  row: number;
  col: number;
}

export interface Direction {
  dr: number;
  dc: number;
}

// 8方向（縦・横・斜め）
export const ALL_DIRECTIONS: Direction[] = [
  { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
  { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
  { dr: 1, dc: -1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 },
];

export const ALL_BOARD_POSITIONS: BoardPosition[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];

// ボード位置ごとの色（左上・右下がdark、右上・左下がlight）
export const BOARD_COLOR_OF: Record<BoardPosition, BoardColor> = {
  topLeft: 'dark',
  topRight: 'light',
  bottomLeft: 'light',
  bottomRight: 'dark',
};

// ボード位置ごとのホームプレイヤー（上段2枚が白、下段2枚が黒）
export const HOME_PLAYER_OF: Record<BoardPosition, Player> = {
  topLeft: 'white',
  topRight: 'white',
  bottomLeft: 'black',
  bottomRight: 'black',
};

export const BOARD_SIZE = 4;

// 1枚のボード上の石配置。keyは`${row}_${col}`、値は石の所有者
export type StoneMap = Partial<Record<string, Player>>;

export interface BoardState {
  position: BoardPosition;
  color: BoardColor;
  stones: StoneMap;
}

export interface Move {
  boardPosition: BoardPosition;
  from: Pos;
  to: Pos;
  direction: Direction;
  steps: 1 | 2;
}

export interface GameState {
  boards: Record<BoardPosition, BoardState>;
  currentPlayer: Player;
  phase: TurnPhase;
  difficulty: Difficulty;
  humanPlayer: Player;
  // PASSIVE_CONFIRM: どの石を選択中か
  selectedPassiveFrom: { boardPosition: BoardPosition; pos: Pos } | null;
  // AGGRESSIVE_SELECT/CONFIRM: 適用済みのパッシブ移動（方向・歩数の引き継ぎ、及びキャンセル時の巻き戻しに使用）
  passiveMove: Move | null;
  // AGGRESSIVE_CONFIRM: どの石を選択中か
  selectedAggressiveFrom: { boardPosition: BoardPosition; pos: Pos } | null;
  winner: Player | null;
}

export function posKey(pos: Pos): string {
  return `${pos.row}_${pos.col}`;
}

export function isInBounds(pos: Pos): boolean {
  return pos.row >= 0 && pos.row < BOARD_SIZE && pos.col >= 0 && pos.col < BOARD_SIZE;
}

export function opponentOf(player: Player): Player {
  return player === 'black' ? 'white' : 'black';
}

// あるプレイヤーのホームボード2枚
export function homeBoardsOf(player: Player): BoardPosition[] {
  return ALL_BOARD_POSITIONS.filter((bp) => HOME_PLAYER_OF[bp] === player);
}

// あるボード色と逆色のボード2枚（アグレッシブ移動の対象）
export function oppositeColorBoards(color: BoardColor): BoardPosition[] {
  const opposite: BoardColor = color === 'dark' ? 'light' : 'dark';
  return ALL_BOARD_POSITIONS.filter((bp) => BOARD_COLOR_OF[bp] === opposite);
}

// 初期状態：全4ボードで黒=row3全列・白=row0全列。プレイヤーは黒（先手）固定
export function createInitialState(difficulty: Difficulty): GameState {
  const boards = {} as Record<BoardPosition, BoardState>;
  for (const bp of ALL_BOARD_POSITIONS) {
    const stones: StoneMap = {};
    for (let col = 0; col < BOARD_SIZE; col++) {
      stones[posKey({ row: 3, col })] = 'black';
      stones[posKey({ row: 0, col })] = 'white';
    }
    boards[bp] = { position: bp, color: BOARD_COLOR_OF[bp], stones };
  }
  return {
    boards,
    currentPlayer: 'black',
    phase: 'passiveSelect',
    difficulty,
    humanPlayer: 'black',
    selectedPassiveFrom: null,
    passiveMove: null,
    selectedAggressiveFrom: null,
    winner: null,
  };
}

export function cloneBoard(board: BoardState): BoardState {
  return { ...board, stones: { ...board.stones } };
}

export function cloneBoards(boards: Record<BoardPosition, BoardState>): Record<BoardPosition, BoardState> {
  const result = {} as Record<BoardPosition, BoardState>;
  for (const bp of ALL_BOARD_POSITIONS) result[bp] = cloneBoard(boards[bp]);
  return result;
}
