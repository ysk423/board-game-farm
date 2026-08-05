import { cloneState, findKing, type GameState } from './board';
import { demote, opponentOf, promote, type Player } from './pieces';
import { generatePseudoLegalMoves, isSquareAttacked, type Move } from './moveGenerator';

export function isInCheck(state: GameState, player: Player): boolean {
  const kingPos = findKing(state, player);
  if (!kingPos) return false;
  return isSquareAttacked(state.board, kingPos, opponentOf(player));
}

/** 手を適用した新しい状態を返す（合法性のチェックは呼び出し側の責務） */
export function applyMove(state: GameState, move: Move): GameState {
  const next = cloneState(state);
  const mover = state.turn;

  if (move.kind === 'drop') {
    next.board[move.to[0]][move.to[1]] = { type: move.pieceType, owner: mover };
    next.hand[mover][move.pieceType] -= 1;
  } else {
    const piece = next.board[move.from[0]][move.from[1]];
    if (!piece) throw new Error('存在しないマスからの移動が指定されました');

    const captured = next.board[move.to[0]][move.to[1]];
    if (captured) {
      next.hand[mover][demote(captured.type)] += 1;
    }

    next.board[move.from[0]][move.from[1]] = null;
    next.board[move.to[0]][move.to[1]] = {
      type: move.promote ? promote(piece.type) : piece.type,
      owner: mover,
    };
  }

  next.turn = opponentOf(mover);
  return next;
}

/**
 * state.turn側の合法手一覧。
 * 王手放置となる手（自玉が取られる手を含む）と、打ち歩詰めとなる歩打ちを除外する。
 */
export function generateLegalMoves(state: GameState): Move[] {
  const player = state.turn;
  const pseudoLegal = generatePseudoLegalMoves(state, player);
  const legal: Move[] = [];

  for (const move of pseudoLegal) {
    const next = applyMove(state, move);
    if (isInCheck(next, player)) continue; // 王手放置は禁止

    if (move.kind === 'drop' && move.pieceType === 'FU' && isCheckmate(next)) {
      continue; // 打ち歩詰めは禁止
    }

    legal.push(move);
  }

  return legal;
}

export function isCheckmate(state: GameState): boolean {
  return isInCheck(state, state.turn) && generateLegalMoves(state).length === 0;
}

/** 盤面・持ち駒・手番が一致するかを表すキー（千日手判定に使う） */
export function positionKey(state: GameState): string {
  const boardPart = state.board
    .map((row) => row.map((sq) => (sq ? `${sq.owner[0]}${sq.type}` : '.')).join(','))
    .join('/');
  const handPart = (['sente', 'gote'] as const)
    .map((p) => (['FU', 'GIN', 'KIN', 'KAKU', 'HI'] as const).map((t) => state.hand[p][t]).join(','))
    .join('|');
  return `${boardPart}_${handPart}_${state.turn}`;
}

export interface HistoryEntry {
  key: string;
  mover: Player;
  isCheck: boolean;
}

export type RepetitionOutcome =
  | { type: 'none' }
  | { type: 'perpetual-check'; loser: Player }
  | { type: 'sennichite'; loser: Player };

/**
 * 同一局面が4回出現した場合の判定。
 * 五五将棋の慣例ルールで「千日手は先手の負け」だが、片方が最後まで王手をかけ続けていた
 * （連続王手の千日手）場合は本将棋と同様、王手をかけ続けた側の負けとする。
 * 簡易実装として「繰り返し区間の中で、その手番側の指し手が全て王手だった」ことを条件とする。
 */
export function checkRepetition(history: HistoryEntry[]): RepetitionOutcome {
  if (history.length === 0) return { type: 'none' };
  const latest = history[history.length - 1];

  const occurrences = history.reduce<number[]>((acc, entry, index) => {
    if (entry.key === latest.key) acc.push(index);
    return acc;
  }, []);

  if (occurrences.length < 4) return { type: 'none' };

  const lastFour = occurrences.slice(-4);
  const segment = history.slice(lastFour[0] + 1, lastFour[3] + 1);

  for (const candidate of ['sente', 'gote'] as const) {
    const candidateMoves = segment.filter((entry) => entry.mover === candidate);
    if (candidateMoves.length > 0 && candidateMoves.every((entry) => entry.isCheck)) {
      return { type: 'perpetual-check', loser: candidate };
    }
  }

  return { type: 'sennichite', loser: 'sente' };
}
