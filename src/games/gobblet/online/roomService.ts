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
import {
  BOARD_SIZE,
  type Board,
  createInitialState,
  type GameState,
  opponentOf,
  type Piece,
  type Player,
  SIZES,
  SIZE_ORDER,
} from '../logic/board';
import { applyMove, checkRepetition, checkWin, type Move } from '../logic/rules';
import type { JoinRoomResult, RoomDoc, RoomSummary, Visibility } from './types';

const ROOMS_COLLECTION = 'gobbletGames';
const ROOM_TTL_MS = 3 * 60 * 60 * 1000; // 放置ルームは3時間でFirestoreのTTLにより自動削除

// マスは駒のスタック（配列）であり、Firestoreはネスト配列を扱えないため、
// 各マスを固定長3要素（下から上へ）の数値配列にエンコードし、9マス×3要素=27要素の
// フラット配列として保存する。0=駒なし、それ以外は「所有者*10 + サイズ番号+1」
function encodePiece(piece: Piece): number {
  return piece.owner * 10 + SIZE_ORDER[piece.size] + 1;
}

function decodePiece(code: number): Piece {
  const owner = (code >= 10 ? 2 : 1) as Player;
  const size = SIZES[(code % 10) - 1];
  return { owner, size };
}

function toWireBoard(board: Board): number[] {
  const flat: number[] = [];
  for (const row of board) {
    for (const cell of row) {
      const codes = cell.map(encodePiece);
      while (codes.length < 3) codes.push(0);
      flat.push(...codes);
    }
  }
  return flat;
}

function fromWireBoard(flat: number[]): Board {
  const board: Board = [];
  let idx = 0;
  for (let row = 0; row < BOARD_SIZE; row++) {
    const rowCells = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      const codes = flat.slice(idx, idx + 3);
      idx += 3;
      rowCells.push(codes.filter((c) => c !== 0).map(decodePiece));
    }
    board.push(rowCells);
  }
  return board;
}

function roomFromSnapshotData(data: Record<string, unknown>): RoomDoc {
  return { ...data, board: fromWireBoard(data.board as number[]) } as RoomDoc;
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
    history: initial.history,
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

    const state: GameState = {
      board: room.board,
      inventory: room.inventory,
      turn: room.turn,
      history: room.history,
    };
    const next = applyMove(state, move);

    const win = checkWin(next.board, color);
    const draw = !win && checkRepetition(next.history);

    tx.update(roomRef, {
      board: toWireBoard(next.board),
      inventory: next.inventory,
      turn: next.turn,
      history: next.history,
      status: win || draw ? 'finished' : 'playing',
      winner: win ? color : null,
      winReason: win ? 'line' : draw ? 'repetition' : null,
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
