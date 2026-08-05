import type { Timestamp } from 'firebase/firestore';
import type { Board, Inventory, Player } from '../logic/board';

export type Visibility = 'public' | 'private';
export type RoomStatus = 'waiting' | 'playing' | 'finished';
export type WinReason = 'line' | 'resign' | 'repetition';

export interface PlayerInfo {
  name: string; // 未入力の場合は空文字
}

export interface RoomDoc {
  board: Board;
  inventory: Record<Player, Inventory>;
  turn: Player;
  history: string[];
  players: {
    1: PlayerInfo | null;
    2: PlayerInfo | null;
  };
  visibility: Visibility;
  status: RoomStatus;
  winner: Player | null;
  winReason: WinReason | null;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export interface RoomSummary {
  roomId: string;
  hostName: string;
  createdAt: Timestamp;
}

export type JoinRoomResult = { ok: true; color: Player } | { ok: false; reason: 'not-found' | 'full' };
