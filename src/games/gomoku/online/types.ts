import type { Timestamp } from 'firebase/firestore';
import type { Board } from '../logic/board';

export type StoneColor = 'black' | 'white';
export type Visibility = 'public' | 'private';
export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface PlayerInfo {
  name: string; // 未入力の場合は空文字
}

export interface RoomDoc {
  board: Board;
  turn: StoneColor;
  players: {
    black: PlayerInfo | null;
    white: PlayerInfo | null;
  };
  visibility: Visibility;
  status: RoomStatus;
  winner: StoneColor | 'draw' | null;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export interface RoomSummary {
  roomId: string;
  hostName: string;
  createdAt: Timestamp;
}

export type JoinRoomResult = { ok: true; color: 'white' } | { ok: false; reason: 'not-found' | 'full' };
