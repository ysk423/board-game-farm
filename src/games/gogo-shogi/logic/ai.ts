import type { Difficulty } from '../../../types/common';
import type { GameState } from './board';
import { findKing } from './board';
import { POINT_VALUE, opponentOf, type Player } from './pieces';
import { getReachableSquares, isSquareAttacked, type Move } from './moveGenerator';
import { applyMove, generateLegalMoves, isInCheck } from './rules';

export type AiResult = { type: 'move'; move: Move } | { type: 'resign' };

const MATE_SCORE = 1_000_000;

// 駒得（盤上の駒＋持ち駒の点数差）
function evaluateMaterial(state: GameState, player: Player): number {
  let score = 0;
  for (const row of state.board) {
    for (const square of row) {
      if (!square) continue;
      const value = POINT_VALUE[square.type];
      score += square.owner === player ? value : -value;
    }
  }
  const opponent = opponentOf(player);
  for (const type of ['FU', 'GIN', 'KIN', 'KAKU', 'HI'] as const) {
    score += state.hand[player][type] * POINT_VALUE[type];
    score -= state.hand[opponent][type] * POINT_VALUE[type];
  }
  return score;
}

// 玉の周囲8マスのうち相手に利かされているマスの数（多いほど危険）
function evaluateKingSafety(state: GameState, player: Player): number {
  const opponent = opponentOf(player);
  const myKing = findKing(state, player);
  const opponentKing = findKing(state, opponent);

  const dangerAround = (kingPos: [number, number] | null, attacker: Player): number => {
    if (!kingPos) return 0;
    let danger = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = kingPos[0] + dr;
        const c = kingPos[1] + dc;
        if (r < 0 || r >= 5 || c < 0 || c >= 5) continue;
        if (isSquareAttacked(state.board, [r, c], attacker)) danger++;
      }
    }
    return danger;
  };

  const myDanger = dangerAround(myKing, opponent);
  const opponentDanger = dangerAround(opponentKing, player);
  return opponentDanger - myDanger;
}

// 盤面支配の簡易指標として、疑似合法手（自玉安全性は考慮しない）の可動域数の差を使う
function evaluateMobility(state: GameState, player: Player): number {
  const opponent = opponentOf(player);
  let myMobility = 0;
  let opponentMobility = 0;

  for (let row = 0; row < state.board.length; row++) {
    for (let col = 0; col < state.board[row].length; col++) {
      const piece = state.board[row][col];
      if (!piece) continue;
      const count = getReachableSquares(state.board, row, col).length;
      if (piece.owner === player) myMobility += count;
      else if (piece.owner === opponent) opponentMobility += count;
    }
  }
  return myMobility - opponentMobility;
}

interface EvalOptions {
  includeMobility: boolean;
}

function evaluateState(state: GameState, player: Player, options: EvalOptions): number {
  let score = evaluateMaterial(state, player) * 100 + evaluateKingSafety(state, player) * 20;
  if (options.includeMobility) {
    score += evaluateMobility(state, player) * 5;
  }
  return score;
}

function moveHeuristic(state: GameState, move: Move): number {
  if (move.kind === 'board') {
    const target = state.board[move.to[0]][move.to[1]];
    const captureValue = target ? POINT_VALUE[target.type] : 0;
    return captureValue * 10 + (move.promote ? 3 : 0);
  }
  return 0;
}

function orderedLegalMoves(state: GameState): Move[] {
  return [...generateLegalMoves(state)].sort((a, b) => moveHeuristic(state, b) - moveHeuristic(state, a));
}

function negamax(state: GameState, depth: number, alpha: number, beta: number, options: EvalOptions): number {
  const player = state.turn;

  if (depth === 0) {
    return evaluateState(state, player, options);
  }

  const legalMoves = orderedLegalMoves(state);
  if (legalMoves.length === 0) {
    return isInCheck(state, player) ? -MATE_SCORE - depth : 0;
  }

  let best = -Infinity;
  for (const move of legalMoves) {
    const next = applyMove(state, move);
    const score = -negamax(next, depth - 1, -beta, -alpha, options);
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break; // αβ枝刈り
  }
  return best;
}

function chooseMoveByMinimax(state: GameState, depth: number, options: EvalOptions): Move {
  const legalMoves = orderedLegalMoves(state);
  let bestMove = legalMoves[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;

  for (const move of legalMoves) {
    const next = applyMove(state, move);
    const score = -negamax(next, depth - 1, -beta, -alpha, options);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    if (score > alpha) alpha = score;
  }
  return bestMove;
}

function chooseWeakMove(state: GameState): Move {
  // 合法手の時点で「王手放置」「自玉が即座に取られる手」は除外済み
  const legalMoves = generateLegalMoves(state);
  return legalMoves[Math.floor(Math.random() * legalMoves.length)];
}

const MEDIUM_DEPTH = 3;
const HARD_DEPTH = 4;
const RESIGN_THRESHOLD = -2500; // 駒得換算で飛車以上に相当する劣勢が続く場合の投了しきい値

export function getCpuMove(state: GameState, difficulty: Difficulty): AiResult {
  switch (difficulty) {
    case 'easy':
      return { type: 'move', move: chooseWeakMove(state) };
    case 'medium':
      return { type: 'move', move: chooseMoveByMinimax(state, MEDIUM_DEPTH, { includeMobility: false }) };
    case 'hard': {
      const currentEval = evaluateState(state, state.turn, { includeMobility: true });
      if (currentEval < RESIGN_THRESHOLD) {
        return { type: 'resign' };
      }
      return { type: 'move', move: chooseMoveByMinimax(state, HARD_DEPTH, { includeMobility: true }) };
    }
  }
}
