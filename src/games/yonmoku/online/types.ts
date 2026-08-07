import type { Timestamp } from 'firebase/firestore';
import type { Board } from '../logic/board';

export type StoneColor = 'black' | 'white';
export type Visibility = 'public' | 'private';
export type RoomStatus = 'waiting' | 'playing' | 'finished';
export type WinReason = 'four-in-a-row' | 'resign';

export interface PlayerInfo {
  name: string; // 未入力の場合は空文字
}

// オンライン対戦中のスタンプ機能。対局履歴には残さない一過性の演出のため、常に最新の1件のみ保持する
export interface Reaction {
  by: StoneColor;
  emoji: string;
  sentAt: number; // クライアントのDate.now()。serverTimestamp()はローカルエコーがnullになり表示が遅れるため使わない
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
  winReason: WinReason | null;
  reaction: Reaction | null;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export interface RoomSummary {
  roomId: string;
  hostName: string;
  createdAt: Timestamp;
}

export type JoinRoomResult = { ok: true; color: StoneColor } | { ok: false; reason: 'not-found' | 'full' };
