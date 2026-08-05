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
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../../shared/firebase';
import { generateRoomId } from '../../../shared/onlineRoomCode';
import { BOARD_SIZE, type Board, type Cell, createInitialState, type GameState, opponentOf, type Player } from '../logic/board';
import { applyMove, checkWin, isGameOver, type Move } from '../logic/rules';
import type { JoinRoomResult, RoomDoc, RoomSummary, Visibility } from './types';

const ROOMS_COLLECTION = 'otrioGames';
const ROOM_TTL_MS = 3 * 60 * 60 * 1000; // 放置ルームは3時間でFirestoreのTTLにより自動削除

// Firestoreは配列の配列（ネスト配列）を直接サポートしないため、3x3の盤面を9要素のフラット配列に変換する。
// 各マスはCellオブジェクト（配列ではない）なので、この変換だけでFirestoreにそのまま保存できる
function toWireBoard(board: Board): Cell[] {
  return board.flat();
}

function fromWireBoard(flat: Cell[]): Board {
  const board: Board = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    board.push(flat.slice(row * BOARD_SIZE, (row + 1) * BOARD_SIZE));
  }
  return board;
}

function roomFromSnapshotData(data: Record<string, unknown>): RoomDoc {
  return { ...data, board: fromWireBoard(data.board as Cell[]) } as RoomDoc;
}

// 作成者は1P/2Pどちらでも選べる。参加者は空いている方になる
export async function createRoom(playerName: string, visibility: Visibility, creatorColor: Player): Promise<string> {
  const roomId = generateRoomId();
  const initial: GameState = createInitialState();
  const opponentColor = opponentOf(creatorColor);

  await setDoc(doc(db, ROOMS_COLLECTION, roomId), {
    board: toWireBoard(initial.board),
    inventory: initial.inventory,
    turn: initial.turn,
    players: {
      [creatorColor]: { name: playerName },
      [opponentColor]: null,
    },
    visibility,
    status: 'waiting',
    winner: null,
    winReason: null,
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

    const openColor: Player | null = !room.players[1] ? 1 : !room.players[2] ? 2 : null;
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
          hostName: data.players[1]?.name || data.players[2]?.name || '名無しさん',
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

export async function submitMove(roomId: string, move: Move, color: Player): Promise<void> {
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);

  await runTransaction(db, async (tx) => {
    const snapshot = await tx.get(roomRef);
    if (!snapshot.exists()) return;

    const room = roomFromSnapshotData(snapshot.data());
    if (room.status !== 'playing' || room.turn !== color) return;

    const state: GameState = { board: room.board, inventory: room.inventory, turn: room.turn };
    const next = applyMove(state, move);

    const win = checkWin(next.board, color);
    const draw = !win && isGameOver(next);

    tx.update(roomRef, {
      board: toWireBoard(next.board),
      inventory: next.inventory,
      turn: next.turn,
      status: win || draw ? 'finished' : 'playing',
      winner: win ? color : null,
      winReason: win ? 'win' : draw ? 'draw' : null,
    });
  });
}

export async function resign(roomId: string, color: Player): Promise<void> {
  await updateDoc(doc(db, ROOMS_COLLECTION, roomId), {
    status: 'finished',
    winner: opponentOf(color),
    winReason: 'resign',
  });
}
