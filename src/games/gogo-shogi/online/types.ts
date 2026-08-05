import type { Timestamp } from 'firebase/firestore';
import type { BoardGrid, Hand } from '../logic/board';
import type { Player } from '../logic/pieces';
import type { HistoryEntry } from '../logic/rules';

export type Visibility = 'public' | 'private';
export type RoomStatus = 'waiting' | 'playing' | 'finished';
export type WinReason = 'checkmate' | 'resign' | 'sennichite' | 'perpetual-check';

export interface PlayerInfo {
  name: string; // 未入力の場合は空文字
}

export interface RoomDoc {
  board: BoardGrid;
  hand: Hand;
  turn: Player;
  players: {
    sente: PlayerInfo | null;
    gote: PlayerInfo | null;
  };
  visibility: Visibility;
  status: RoomStatus;
  winner: Player | null;
  winReason: WinReason | null;
  history: HistoryEntry[];
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export interface RoomSummary {
  roomId: string;
  hostName: string;
  createdAt: Timestamp;
}

export type JoinRoomResult = { ok: true; color: 'gote' } | { ok: false; reason: 'not-found' | 'full' };
