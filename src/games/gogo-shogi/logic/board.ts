import type { HandPieceType, Piece, PieceType, Player } from './pieces';

export const BOARD_SIZE = 5;

export type Square = Piece | null;
export type BoardGrid = Square[][];

export type Hand = Record<Player, Record<HandPieceType, number>>;

export interface GameState {
  board: BoardGrid;
  hand: Hand;
  turn: Player;
}

export function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

/** 敵陣は最も奥の1列のみ（本将棋の3列とは異なる5五将棋特有のルール） */
export function isEnemyZone(row: number, owner: Player): boolean {
  return owner === 'sente' ? row === 0 : row === BOARD_SIZE - 1;
}

function emptyHand(): Record<HandPieceType, number> {
  return { HI: 0, KAKU: 0, GIN: 0, KIN: 0, FU: 0 };
}

// 5五将棋の初期配置（仕様書5.2節）。row0=1段目(後手陣)〜row4=5段目(先手陣)、col0=1筋〜col4=5筋
export function createInitialState(): GameState {
  const board: BoardGrid = Array.from({ length: BOARD_SIZE }, () => Array<Square>(BOARD_SIZE).fill(null));

  const senteRow: PieceType[] = ['HI', 'KAKU', 'GIN', 'KIN', 'OU'];
  const goteRow: PieceType[] = ['OU', 'KIN', 'GIN', 'KAKU', 'HI'];

  senteRow.forEach((type, col) => {
    board[4][col] = { type, owner: 'sente' };
  });
  goteRow.forEach((type, col) => {
    board[0][col] = { type, owner: 'gote' };
  });

  board[3][4] = { type: 'FU', owner: 'sente' }; // 王将の前(5筋4段目)
  board[1][0] = { type: 'FU', owner: 'gote' }; // 玉将の前(1筋2段目)

  return {
    board,
    hand: { sente: emptyHand(), gote: emptyHand() },
    turn: 'sente',
  };
}

export function cloneState(state: GameState): GameState {
  return {
    board: state.board.map((row) => row.map((square) => (square ? { ...square } : null))),
    hand: {
      sente: { ...state.hand.sente },
      gote: { ...state.hand.gote },
    },
    turn: state.turn,
  };
}

export function findKing(state: GameState, player: Player): [number, number] | null {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const square = state.board[row][col];
      if (square && square.type === 'OU' && square.owner === player) return [row, col];
    }
  }
  return null;
}
