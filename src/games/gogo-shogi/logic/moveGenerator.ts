import { BOARD_SIZE, type BoardGrid, type GameState, isEnemyZone, isInBounds } from './board';
import {
  type HandPieceType,
  type Piece,
  getSlideDirections,
  getStepDirections,
  isPromotable,
  type Player,
} from './pieces';

export type Move =
  | { kind: 'board'; from: readonly [number, number]; to: readonly [number, number]; promote: boolean }
  | { kind: 'drop'; to: readonly [number, number]; pieceType: HandPieceType };

/** (row, col)の駒が動ける先の一覧（成り選択・自玉安全性は考慮しない軽量版。王手判定にも使う） */
export function getReachableSquares(board: BoardGrid, row: number, col: number): Array<[number, number]> {
  const piece = board[row][col];
  if (!piece) return [];
  const results: Array<[number, number]> = [];

  for (const [dr, dc] of getStepDirections(piece.type, piece.owner)) {
    const r = row + dr;
    const c = col + dc;
    if (!isInBounds(r, c)) continue;
    const target = board[r][c];
    if (target && target.owner === piece.owner) continue;
    results.push([r, c]);
  }

  for (const [dr, dc] of getSlideDirections(piece.type)) {
    let r = row + dr;
    let c = col + dc;
    while (isInBounds(r, c)) {
      const target = board[r][c];
      if (!target) {
        results.push([r, c]);
      } else {
        if (target.owner !== piece.owner) results.push([r, c]);
        break; // 味方・敵いずれの駒でもそこで止まる
      }
      r += dr;
      c += dc;
    }
  }

  return results;
}

export function isSquareAttacked(board: BoardGrid, target: readonly [number, number], byPlayer: Player): boolean {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (!piece || piece.owner !== byPlayer) continue;
      for (const [r, c] of getReachableSquares(board, row, col)) {
        if (r === target[0] && c === target[1]) return true;
      }
    }
  }
  return false;
}

function buildBoardMoveVariants(piece: Piece, from: [number, number], to: [number, number]): Move[] {
  if (!isPromotable(piece.type)) {
    return [{ kind: 'board', from, to, promote: false }];
  }

  const zoneEntry = isEnemyZone(to[0], piece.owner) || isEnemyZone(from[0], piece.owner);
  if (!zoneEntry) {
    return [{ kind: 'board', from, to, promote: false }];
  }

  // 歩が最奥段に進む手は、成らないと次に一切動けなくなるため成りが必須
  if (piece.type === 'FU' && isEnemyZone(to[0], piece.owner)) {
    return [{ kind: 'board', from, to, promote: true }];
  }

  return [
    { kind: 'board', from, to, promote: true },
    { kind: 'board', from, to, promote: false },
  ];
}

function generateBoardMoves(state: GameState, player: Player): Move[] {
  const moves: Move[] = [];
  const { board } = state;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (!piece || piece.owner !== player) continue;

      for (const to of getReachableSquares(board, row, col)) {
        moves.push(...buildBoardMoveVariants(piece, [row, col], to));
      }
    }
  }
  return moves;
}

function hasOwnPawnOnFile(board: BoardGrid, player: Player, col: number): boolean {
  for (let row = 0; row < BOARD_SIZE; row++) {
    const piece = board[row][col];
    if (piece && piece.owner === player && piece.type === 'FU') return true;
  }
  return false;
}

function generateDropMoves(state: GameState, player: Player): Move[] {
  const moves: Move[] = [];
  const hand = state.hand[player];

  for (const pieceType of Object.keys(hand) as HandPieceType[]) {
    if (hand[pieceType] <= 0) continue;

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (state.board[row][col]) continue;

        if (pieceType === 'FU') {
          if (isEnemyZone(row, player)) continue; // 行き所のない駒（最奥段への歩打ち）は禁止
          if (hasOwnPawnOnFile(state.board, player, col)) continue; // 二歩
        }

        moves.push({ kind: 'drop', to: [row, col], pieceType });
      }
    }
  }
  return moves;
}

// 幾何学的に可能な手の一覧。自玉が王手されたままになる手や打ち歩詰めを含みうるため、
// 合法手としてのフィルタリングはrules.tsのgenerateLegalMovesが担当する
export function generatePseudoLegalMoves(state: GameState, player: Player): Move[] {
  return [...generateBoardMoves(state, player), ...generateDropMoves(state, player)];
}
