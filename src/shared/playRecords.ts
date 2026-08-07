import { addDoc, collection, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { Difficulty, GameOutcome } from '../types/common';

export type GameId = 'gomoku' | 'gogo-shogi' | 'tictactoe' | 'otrio' | 'yonmoku' | 'gobblet' | 'stonepush';

export const GAME_TITLES: Record<GameId, string> = {
  gomoku: '五目並べ',
  'gogo-shogi': '五五将棋',
  tictactoe: '〇×ゲーム',
  otrio: 'オートリオ',
  yonmoku: '四目並べ',
  gobblet: 'ゴブレット・ゴブラーズ',
  stonepush: 'ストーンプッシュ',
};

export const PLAY_RECORDS_COLLECTION = 'playRecords';

// プレイ記録ページ用のドキュメント。CPU対戦はプレイヤー視点の勝敗、オンライン対戦は
// 客観的な勝者（役割名。引き分けはnull）を持つ、という非対称な形をあえて許容している
export type PlayRecord =
  | {
      game: GameId;
      mode: 'cpu';
      difficulty: Difficulty;
      outcome: GameOutcome;
      playedAt: Timestamp;
    }
  | {
      game: GameId;
      mode: 'online';
      winnerLabel: string | null;
      playedAt: Timestamp;
    };

// CPU対戦の結果を1件記録する。対局終了時に各ゲームのCPU対戦画面（ui/main.ts）から呼び出す
export async function recordCpuPlay(game: GameId, difficulty: Difficulty, outcome: GameOutcome): Promise<void> {
  await addDoc(collection(db, PLAY_RECORDS_COLLECTION), {
    game,
    mode: 'cpu',
    difficulty,
    outcome,
    playedAt: serverTimestamp(),
  });
}

// オンライン対戦の記録データを組み立てる。書き込みは呼び出し元（各ゲームのonline/roomService.ts）で
// 対局終了を検知したトランザクション/バッチに含めることで、1対局につき1件だけ記録されるようにする
export function buildOnlinePlayRecord(game: GameId, winnerLabel: string | null) {
  return {
    game,
    mode: 'online' as const,
    winnerLabel,
    playedAt: serverTimestamp(),
  };
}
