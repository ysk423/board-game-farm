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

// オンライン対戦中のスタンプ機能。対局履歴には残さない一過性の演出のため、常に最新の1件のみ保持する
export interface Reaction {
  by: Player;
  emoji: string;
  sentAt: number; // クライアントのDate.now()。serverTimestamp()はローカルエコーがnullになり表示が遅れるため使わない
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
  reaction: Reaction | null;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export interface RoomSummary {
  roomId: string;
  hostName: string;
  createdAt: Timestamp;
}

export type JoinRoomResult = { ok: true; color: Player } | { ok: false; reason: 'not-found' | 'full' };
