import type { Timestamp } from 'firebase/firestore';
import type { Board } from '../logic/board';

export type StoneColor = 'maru' | 'batsu';
export type Visibility = 'public' | 'private';
export type RoomStatus = 'waiting' | 'playing' | 'finished';
export type WinReason = 'three-in-a-row' | 'resign';

export interface PlayerInfo {
  name: string; // 未入力の場合は空文字
}

export interface RoomDoc {
  board: Board;
  turn: StoneColor;
  players: {
    maru: PlayerInfo | null;
    batsu: PlayerInfo | null;
  };
  visibility: Visibility;
  status: RoomStatus;
  winner: StoneColor | 'draw' | null;
  winReason: WinReason | null;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export interface RoomSummary {
  roomId: string;
  hostName: string;
  createdAt: Timestamp;
}

export type JoinRoomResult = { ok: true; color: StoneColor } | { ok: false; reason: 'not-found' | 'full' };
