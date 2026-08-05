import type { Difficulty } from '../../../types/common';
import { type GameState, opponentOf, type Player, SIZES } from './board';
import { applyMove, checkWin, getLegalMoves, isGameOver, LINES, type Move } from './rules';

// ライン評価: 相手に阻害されていない自分の駒数(0-3)に応じた点数
const LINE_SCORE = [0, 1, 10, 1_000];
// トリオ評価: 相手に阻害されていない自分の駒数(0-3、1マスあたり)に応じた点数
const TRIO_SCORE = [0, 2, 20, 2_000];

function evaluateState(state: GameState, player: Player): number {
  const opponent = opponentOf(player);
  let score = 0;

  for (const line of LINES) {
    for (const size of SIZES) {
      const owners = line.map(([r, c]) => state.board[r][c][size]);
      const mine = owners.filter((o) => o === player).length;
      const theirs = owners.filter((o) => o === opponent).length;
      if (theirs === 0) score += LINE_SCORE[mine];
      if (mine === 0) score -= LINE_SCORE[theirs];
    }
  }

  for (const row of state.board) {
    for (const cell of row) {
      const sizes = [cell.S, cell.M, cell.L];
      const mine = sizes.filter((o) => o === player).length;
      const theirs = sizes.filter((o) => o === opponent).length;
      if (theirs === 0) score += TRIO_SCORE[mine];
      if (mine === 0) score -= TRIO_SCORE[theirs];
    }
  }

  return score;
}

// 指定プレイヤーの手番と仮定して、即勝ちできる手があれば返す
function findWinningMove(state: GameState, player: Player): Move | null {
  const hypothetical: GameState = { ...state, turn: player };
  for (const move of getLegalMoves(hypothetical)) {
    const next = applyMove(hypothetical, move);
    if (checkWin(next.board, player)) return move;
  }
  return null;
}

function chooseEasyMove(state: GameState): Move {
  const cpu = state.turn;
  const human = opponentOf(cpu);

  // 自分が置けば勝てる手は必打
  const winMove = findWinningMove(state, cpu);
  if (winMove) return winMove;

  // 相手が次に置けば勝ってしまう手は、同じマス・サイズに打てるなら阻止する
  const opponentWinMove = findWinningMove(state, human);
  if (opponentWinMove) {
    const legal = getLegalMoves(state);
    const blockMove = legal.find(
      (m) => m.row === opponentWinMove.row && m.col === opponentWinMove.col && m.size === opponentWinMove.size,
    );
    if (blockMove) return blockMove;
  }

  const legal = getLegalMoves(state);
  return legal[Math.floor(Math.random() * legal.length)];
}

function orderedMoves(state: GameState, limit: number): Move[] {
  return getLegalMoves(state)
    .map((move) => ({ move, score: evaluateState(applyMove(state, move), state.turn) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.move);
}

const MATE_SCORE = 1_000_000;

function negamax(state: GameState, depth: number, alpha: number, beta: number, branchLimit: number): number {
  const player = state.turn;
  if (isGameOver(state)) return 0;
  if (depth === 0) return evaluateState(state, player);

  const moves = orderedMoves(state, branchLimit);
  if (moves.length === 0) return evaluateState(state, player);

  let best = -Infinity;
  for (const move of moves) {
    const next = applyMove(state, move);

    let score: number;
    if (checkWin(next.board, player)) {
      score = MATE_SCORE + depth;
    } else {
      score = -negamax(next, depth - 1, -beta, -alpha, branchLimit);
    }

    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break; // αβ枝刈り
  }
  return best;
}

function chooseMoveByMinimax(state: GameState, depth: number, branchLimit: number): Move {
  const player = state.turn;
  const moves = orderedMoves(state, branchLimit);
  let bestMove = moves[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;

  for (const move of moves) {
    const next = applyMove(state, move);

    let score: number;
    if (checkWin(next.board, player)) {
      score = MATE_SCORE + depth;
    } else {
      score = -negamax(next, depth - 1, -beta, -alpha, branchLimit);
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    if (score > alpha) alpha = score;
  }
  return bestMove;
}

const MEDIUM_DEPTH = 2;
const MEDIUM_BRANCH_LIMIT = 100; // 分岐数が少ないため実質無制限
const HARD_DEPTH = 6;
const HARD_BRANCH_LIMIT = 10;

export function getCpuMove(state: GameState, difficulty: Difficulty): Move {
  switch (difficulty) {
    case 'easy':
      return chooseEasyMove(state);
    case 'medium':
      return chooseMoveByMinimax(state, MEDIUM_DEPTH, MEDIUM_BRANCH_LIMIT);
    case 'hard':
      return chooseMoveByMinimax(state, HARD_DEPTH, HARD_BRANCH_LIMIT);
  }
}
