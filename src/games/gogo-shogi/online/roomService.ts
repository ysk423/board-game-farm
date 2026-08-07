import {
  collection,
  doc,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../../shared/firebase';
import { generateRoomId } from '../../../shared/onlineRoomCode';
import { buildOnlinePlayRecord, PLAY_RECORDS_COLLECTION } from '../../../shared/playRecords';
import { BOARD_SIZE, createInitialState, type BoardGrid, type GameState, type Square } from '../logic/board';
import { opponentOf, type Player } from '../logic/pieces';
import { applyMove, checkRepetition, isCheckmate, isInCheck, positionKey, type HistoryEntry } from '../logic/rules';
import type { Move } from '../logic/moveGenerator';
import type { JoinRoomResult, RoomDoc, RoomSummary, Visibility, WinReason } from './types';

const ROOMS_COLLECTION = 'shogiGames';
const ROOM_TTL_MS = 3 * 60 * 60 * 1000; // 放置ルームは3時間でFirestoreのTTLにより自動削除

// プレイ記録（履歴ページ）用。入力名は載せず「先手」「後手」の役割名のみを記録する
function roleLabel(color: Player): string {
  return color === 'sente' ? '先手' : '後手';
}

// Firestoreは配列の配列（ネスト配列）を直接サポートしないため、
// 保存時は5x5の盤面を25要素のフラットな配列に変換し、読み込み時に2次元へ戻す
function toWireBoard(board: BoardGrid): Square[] {
  return board.flat();
}

function fromWireBoard(flat: Square[]): BoardGrid {
  const board: BoardGrid = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    board.push(flat.slice(row * BOARD_SIZE, (row + 1) * BOARD_SIZE));
  }
  return board;
}

function roomFromSnapshotData(data: Record<string, unknown>): RoomDoc {
  return { ...data, board: fromWireBoard(data.board as Square[]) } as RoomDoc;
}

// 作成者は先手/後手どちらでも選べる。参加者は空いている方の手番になる
export async function createRoom(playerName: string, visibility: Visibility, creatorColor: Player): Promise<string> {
  const roomId = generateRoomId();
  const initial: GameState = createInitialState();
  const opponentColor = opponentOf(creatorColor);

  await setDoc(doc(db, ROOMS_COLLECTION, roomId), {
    board: toWireBoard(initial.board),
    hand: initial.hand,
    turn: initial.turn,
    players: {
      [creatorColor]: { name: playerName },
      [opponentColor]: null,
    },
    visibility,
    status: 'waiting',
    winner: null,
    winReason: null,
    history: [],
    reaction: null,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + ROOM_TTL_MS),
  });

  return roomId;
}

export async function joinRoom(roomId: string, playerName: string): Promise<JoinRoomResult> {
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);

  return runTransaction(db, async (tx) => {
    const snapshot = await tx.get(roomRef);
    if (!snapshot.exists()) return { ok: false, reason: 'not-found' } as const;

    const room = roomFromSnapshotData(snapshot.data());
    if (room.status !== 'waiting') {
      return { ok: false, reason: 'full' } as const;
    }

    const openColor: Player | null = !room.players.sente ? 'sente' : !room.players.gote ? 'gote' : null;
    if (!openColor) {
      return { ok: false, reason: 'full' } as const;
    }

    tx.update(roomRef, {
      [`players.${openColor}`]: { name: playerName },
      status: 'playing',
    });
    return { ok: true, color: openColor } as const;
  });
}

export function subscribeToOpenRooms(callback: (rooms: RoomSummary[]) => void): Unsubscribe {
  const q = query(
    collection(db, ROOMS_COLLECTION),
    where('visibility', '==', 'public'),
    where('status', '==', 'waiting'),
    orderBy('createdAt', 'desc'),
    fsLimit(20),
  );
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as RoomDoc;
        return {
          roomId: docSnap.id,
          hostName: data.players.sente?.name || data.players.gote?.name || '名無しさん',
          createdAt: data.createdAt,
        };
      }),
    );
  });
}

export function subscribeToRoom(roomId: string, callback: (room: RoomDoc | null) => void): Unsubscribe {
  return onSnapshot(doc(db, ROOMS_COLLECTION, roomId), (snapshot) => {
    callback(snapshot.exists() ? roomFromSnapshotData(snapshot.data()) : null);
  });
}

// 手番確認をトランザクション内で再確認してから着手を適用し、
// 詰み・千日手判定も既存のrules.tsをそのまま使ってクライアント側で行う
// （合法手そのものの厳密な再検証はせず、自己申告ベースという既存方針を踏襲）
export async function submitMove(roomId: string, move: Move, color: Player): Promise<void> {
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);

  await runTransaction(db, async (tx) => {
    const snapshot = await tx.get(roomRef);
    if (!snapshot.exists()) return;

    const room = roomFromSnapshotData(snapshot.data());
    if (room.status !== 'playing' || room.turn !== color) return;

    const state: GameState = { board: room.board, hand: room.hand, turn: room.turn };
    const next = applyMove(state, move);

    const historyEntry: HistoryEntry = {
      key: positionKey(next),
      mover: color,
      isCheck: isInCheck(next, next.turn),
    };
    const history = [...room.history, historyEntry];

    let status: RoomDoc['status'] = 'playing';
    let winner: Player | null = null;
    let winReason: WinReason | null = null;

    const repetition = checkRepetition(history);
    if (repetition.type !== 'none') {
      status = 'finished';
      winner = opponentOf(repetition.loser);
      winReason = repetition.type;
    } else if (isCheckmate(next)) {
      status = 'finished';
      winner = color;
      winReason = 'checkmate';
    }

    tx.update(roomRef, {
      board: toWireBoard(next.board),
      hand: next.hand,
      turn: next.turn,
      history,
      status,
      winner,
      winReason,
    });

    // 対局が決着した瞬間の書き込みに相乗りさせ、1対局につき1件だけプレイ記録を残す
    if (winner) {
      tx.set(doc(collection(db, PLAY_RECORDS_COLLECTION)), buildOnlinePlayRecord('gogo-shogi', roleLabel(winner)));
    }
  });
}

// スタンプ送信。合法性チェックが不要な一過性の演出のため、着手のようなトランザクションは使わず直接上書きする
export async function sendReaction(roomId: string, by: Player, emoji: string): Promise<void> {
  await updateDoc(doc(db, ROOMS_COLLECTION, roomId), {
    reaction: { by, emoji, sentAt: Date.now() },
  });
}

export async function resign(roomId: string, color: Player): Promise<void> {
  const winner = opponentOf(color);
  const batch = writeBatch(db);
  batch.update(doc(db, ROOMS_COLLECTION, roomId), {
    status: 'finished',
    winner,
    winReason: 'resign',
  });
  batch.set(doc(collection(db, PLAY_RECORDS_COLLECTION)), buildOnlinePlayRecord('gogo-shogi', roleLabel(winner)));
  await batch.commit();
}
