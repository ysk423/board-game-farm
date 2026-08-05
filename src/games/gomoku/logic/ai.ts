import type { Difficulty } from '../../../types/common';
import { BOARD_SIZE, type Board, type Stone, isInBounds } from './board';
import { DIRECTIONS, checkWin } from './rules';

export interface Move {
  row: number;
  col: number;
}

// パターンごとの評価点。数値自体は目安であり、調整はここだけで完結する
const SCORE = {
  five: 100_000,
  openFour: 10_000,
  four: 1_000,
  openThree: 500,
  three: 100,
  openTwo: 50,
  two: 10,
  one: 1,
};

function patternScore(count: number, openEnds: number): number {
  if (count >= 5) return SCORE.five;
  if (count === 4) return openEnds === 2 ? SCORE.openFour : openEnds === 1 ? SCORE.four : 0;
  if (count === 3) return openEnds === 2 ? SCORE.openThree : openEnds === 1 ? SCORE.three : 0;
  if (count === 2) return openEnds === 2 ? SCORE.openTwo : openEnds === 1 ? SCORE.two : 0;
  if (count === 1) return openEnds > 0 ? SCORE.one : 0;
  return 0;
}

// (row, col)は空マス前提。そこに`stone`を仮に置いたと想定して、方向(dr, dc)の
// 連続数と両端の空き状況を、盤面を実際には書き換えずに数える
function analyzeLine(
  board: Board,
  row: number,
  col: number,
  dr: number,
  dc: number,
  stone: Stone,
): { count: number; openEnds: number } {
  let count = 1;

  let r = row + dr;
  let c = col + dc;
  while (isInBounds(r, c) && board[r][c] === stone) {
    count++;
    r += dr;
    c += dc;
  }
  const forwardOpen = isInBounds(r, c) && board[r][c] === 0;

  r = row - dr;
  c = col - dc;
  while (isInBounds(r, c) && board[r][c] === stone) {
    count++;
    r -= dr;
    c -= dc;
  }
  const backwardOpen = isInBounds(r, c) && board[r][c] === 0;

  return { count, openEnds: (forwardOpen ? 1 : 0) + (backwardOpen ? 1 : 0) };
}

function moveScoreFor(board: Board, row: number, col: number, stone: Stone): number {
  let total = 0;
  for (const [dr, dc] of DIRECTIONS) {
    const { count, openEnds } = analyzeLine(board, row, col, dr, dc, stone);
    total += patternScore(count, openEnds);
  }
  return total;
}

// 自分が打った場合の攻撃点＋相手の攻撃を防ぐ防御点（やや割引）を合算して着手候補を評価する
function evaluateCandidate(board: Board, row: number, col: number, self: Stone, opponent: Stone): number {
  const attack = moveScoreFor(board, row, col, self);
  const defense = moveScoreFor(board, row, col, opponent);
  return attack + defense * 0.9;
}

// 盤面全体の静的評価（ミニマックスの葉ノードで使用）。既存の石が作る全ラインを走査し、
// 各連続グループの「先頭」でのみ加点することで重複カウントを避ける
function evaluateBoard(board: Board, cpuStone: Stone): number {
  let score = 0;
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const stone = board[row][col];
      if (stone === 0) continue;

      for (const [dr, dc] of DIRECTIONS) {
        const pr = row - dr;
        const pc = col - dc;
        if (isInBounds(pr, pc) && board[pr][pc] === stone) continue; // 連の先頭でなければスキップ

        let count = 1;
        let r = row + dr;
        let c = col + dc;
        while (isInBounds(r, c) && board[r][c] === stone) {
          count++;
          r += dr;
          c += dc;
        }
        const forwardOpen = isInBounds(r, c) && board[r][c] === 0;
        const backwardOpen = isInBounds(pr, pc) && board[pr][pc] === 0;
        const s = patternScore(count, (forwardOpen ? 1 : 0) + (backwardOpen ? 1 : 0));
        score += stone === cpuStone ? s : -s;
      }
    }
  }
  return score;
}

const CANDIDATE_RADIUS = 2;

// 探索範囲を「既存の石の周辺」に絞ることで15x15盤でも現実的な速度に抑える
function getCandidateCells(board: Board): Move[] {
  const candidates = new Set<string>();
  let hasStone = false;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === 0) continue;
      hasStone = true;
      for (let dr = -CANDIDATE_RADIUS; dr <= CANDIDATE_RADIUS; dr++) {
        for (let dc = -CANDIDATE_RADIUS; dc <= CANDIDATE_RADIUS; dc++) {
          const r = row + dr;
          const c = col + dc;
          if (!isInBounds(r, c) || board[r][c] !== 0) continue;
          candidates.add(`${r},${c}`);
        }
      }
    }
  }

  if (!hasStone) {
    const center = Math.floor(BOARD_SIZE / 2);
    return [{ row: center, col: center }];
  }

  return Array.from(candidates, (key) => {
    const [row, col] = key.split(',').map(Number);
    return { row, col };
  });
}

function getOrderedCandidates(board: Board, self: Stone, opponent: Stone, limit: number): Move[] {
  return getCandidateCells(board)
    .map((move) => ({ move, score: evaluateCandidate(board, move.row, move.col, self, opponent) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.move);
}

function findImmediate(board: Board, candidates: Move[], stone: Stone): Move | null {
  for (const { row, col } of candidates) {
    board[row][col] = stone;
    const win = checkWin(board, row, col);
    board[row][col] = 0;
    if (win) return { row, col };
  }
  return null;
}

function chooseEasyMove(board: Board, cpu: Stone, human: Stone): Move {
  const candidates = getCandidateCells(board);
  // 「自分が置けば5連になる手」は必打
  const winMove = findImmediate(board, candidates, cpu);
  if (winMove) return winMove;
  // 「相手が次に置けば5連になる手」は必ず阻止
  const blockMove = findImmediate(board, candidates, human);
  if (blockMove) return blockMove;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function chooseMediumMove(board: Board, cpu: Stone, human: Stone): Move {
  const candidates = getCandidateCells(board);
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const move of candidates) {
    const score = evaluateCandidate(board, move.row, move.col, cpu, human);
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}

const HARD_SEARCH_DEPTH = 4;
const HARD_BRANCH_LIMIT = 8;

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  cpu: Stone,
  human: Stone,
): number {
  if (depth === 0) return evaluateBoard(board, cpu);

  const stone = maximizing ? cpu : human;
  const opponent = maximizing ? human : cpu;
  const candidates = getOrderedCandidates(board, stone, opponent, HARD_BRANCH_LIMIT);
  if (candidates.length === 0) return evaluateBoard(board, cpu);

  let best = maximizing ? -Infinity : Infinity;
  for (const { row, col } of candidates) {
    board[row][col] = stone;

    let value: number;
    if (checkWin(board, row, col)) {
      // 手数が浅いほど早い勝ち/負けとして優先度を上げる
      value = maximizing ? 1_000_000 + depth : -1_000_000 - depth;
    } else {
      value = minimax(board, depth - 1, alpha, beta, !maximizing, cpu, human);
    }
    board[row][col] = 0;

    if (maximizing) {
      best = Math.max(best, value);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, value);
      beta = Math.min(beta, best);
    }
    if (beta <= alpha) break; // αβ枝刈り
  }
  return best;
}

function chooseHardMove(board: Board, cpu: Stone, human: Stone): Move {
  const candidates = getOrderedCandidates(board, cpu, human, HARD_BRANCH_LIMIT);
  let bestMove = candidates[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;

  for (const { row, col } of candidates) {
    board[row][col] = cpu;
    const score = checkWin(board, row, col)
      ? 1_000_000 + HARD_SEARCH_DEPTH
      : minimax(board, HARD_SEARCH_DEPTH - 1, alpha, beta, false, cpu, human);
    board[row][col] = 0;

    if (score > bestScore) {
      bestScore = score;
      bestMove = { row, col };
    }
    alpha = Math.max(alpha, score);
  }
  return bestMove;
}

export function getCpuMove(board: Board, difficulty: Difficulty, cpu: Stone, human: Stone): Move {
  switch (difficulty) {
    case 'easy':
      return chooseEasyMove(board, cpu, human);
    case 'medium':
      return chooseMediumMove(board, cpu, human);
    case 'hard':
      return chooseHardMove(board, cpu, human);
  }
}
