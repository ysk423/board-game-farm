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
import { BATSU, BOARD_SIZE, type Board, createEmptyBoard, MARU, type Stone } from '../logic/board';
import { checkWin, isBoardFull } from '../logic/rules';
import type { JoinRoomResult, RoomDoc, RoomSummary, StoneColor, Visibility } from './types';

const ROOMS_COLLECTION = 'tictactoeGames';
const ROOM_TTL_MS = 3 * 60 * 60 * 1000; // 放置ルームは3時間でFirestoreのTTLにより自動削除

function stoneColorToStone(color: StoneColor): Stone {
  return color === 'maru' ? MARU : BATSU;
}

function opponentOf(color: StoneColor): StoneColor {
  return color === 'maru' ? 'batsu' : 'maru';
}

// プレイ記録（履歴ページ）用。入力名は載せず「先手」「後手」の役割名のみを記録する
function roleLabel(color: StoneColor): string {
  return color === 'maru' ? '先手' : '後手';
}

// Firestoreは配列の配列（ネスト配列）を直接サポートしないため、
// 保存時は3x3の盤面を9要素のフラットな配列に変換し、読み込み時に2次元へ戻す
function toWireBoard(board: Board): number[] {
  return board.flat();
}

function fromWireBoard(flat: number[]): Board {
  const board: Board = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    board.push(flat.slice(row * BOARD_SIZE, (row + 1) * BOARD_SIZE) as Stone[]);
  }
  return board;
}

function roomFromSnapshotData(data: Record<string, unknown>): RoomDoc {
  return { ...data, board: fromWireBoard(data.board as number[]) } as RoomDoc;
}

// 作成者は○/×どちらでも選べる。参加者は空いている方の色になる
export async function createRoom(playerName: string, visibility: Visibility, creatorColor: StoneColor): Promise<string> {
  const roomId = generateRoomId();
  const opponentColor = opponentOf(creatorColor);

  await setDoc(doc(db, ROOMS_COLLECTION, roomId), {
    board: toWireBoard(createEmptyBoard()),
    turn: 'maru',
    players: {
      [creatorColor]: { name: playerName },
      [opponentColor]: null,
    },
    visibility,
    status: 'waiting',
    winner: null,
    winReason: null,
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

    const openColor: StoneColor | null = !room.players.maru ? 'maru' : !room.players.batsu ? 'batsu' : null;
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
          hostName: data.players.maru?.name || data.players.batsu?.name || '名無しさん',
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

export async function submitMove(roomId: string, row: number, col: number, color: StoneColor): Promise<void> {
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);

  await runTransaction(db, async (tx) => {
    const snapshot = await tx.get(roomRef);
    if (!snapshot.exists()) return;

    const room = roomFromSnapshotData(snapshot.data());
    if (room.status !== 'playing' || room.turn !== color) return;
    if (room.board[row][col] !== 0) return;

    const stone = stoneColorToStone(color);
    const board = room.board.map((r) => [...r]);
    board[row][col] = stone;

    const win = checkWin(board, row, col);
    const draw = !win && isBoardFull(board);

    tx.update(roomRef, {
      board: toWireBoard(board),
      turn: color === 'maru' ? 'batsu' : 'maru',
      status: win || draw ? 'finished' : 'playing',
      winner: win ? color : draw ? 'draw' : null,
      winReason: win ? 'three-in-a-row' : null,
    });

    // 対局が決着した瞬間の書き込みに相乗りさせ、1対局につき1件だけプレイ記録を残す
    if (win || draw) {
      tx.set(doc(collection(db, PLAY_RECORDS_COLLECTION)), buildOnlinePlayRecord('tictactoe', win ? roleLabel(color) : null));
    }
  });
}

// スタンプ送信。合法性チェックが不要な一過性の演出のため、着手のようなトランザクションは使わず直接上書きする
export async function sendReaction(roomId: string, by: StoneColor, emoji: string): Promise<void> {
  await updateDoc(doc(db, ROOMS_COLLECTION, roomId), {
    reaction: { by, emoji, sentAt: Date.now() },
  });
}

export async function resign(roomId: string, color: StoneColor): Promise<void> {
  const winner = opponentOf(color);
  const batch = writeBatch(db);
  batch.update(doc(db, ROOMS_COLLECTION, roomId), {
    status: 'finished',
    winner,
    winReason: 'resign',
  });
  batch.set(doc(collection(db, PLAY_RECORDS_COLLECTION)), buildOnlinePlayRecord('tictactoe', roleLabel(winner)));
  await batch.commit();
}
