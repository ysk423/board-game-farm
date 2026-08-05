import type { Difficulty } from '../../../types/common';
import { BOARD_SIZE, type Board, type Stone } from './board';
import { checkWin, isBoardFull } from './rules';

export interface Move {
  row: number;
  col: number;
}

function getEmptyCells(board: Board): Move[] {
  const cells: Move[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === 0) cells.push({ row, col });
    }
  }
  return cells;
}

function findImmediate(board: Board, cells: Move[], stone: Stone): Move | null {
  for (const { row, col } of cells) {
    board[row][col] = stone;
    const win = checkWin(board, row, col);
    board[row][col] = 0;
    if (win) return { row, col };
  }
  return null;
}

function chooseEasyMove(board: Board, cpu: Stone, human: Stone): Move {
  const cells = getEmptyCells(board);
  // 「自分が置けば3並びになる手」は必打
  const winMove = findImmediate(board, cells, cpu);
  if (winMove) return winMove;
  // 「相手が次に置けば3並びになる手」は必ず阻止
  const blockMove = findImmediate(board, cells, human);
  if (blockMove) return blockMove;
  return cells[Math.floor(Math.random() * cells.length)];
}

// ライン内に自分の石だけがn個ある場合の評価点（相手の石が混ざっているラインは0点）
const LINE_SCORE = [0, 1, 10, 100];

function getAllLines(): Array<Array<[number, number]>> {
  const lines: Array<Array<[number, number]>> = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    lines.push(Array.from({ length: BOARD_SIZE }, (_, c) => [r, c] as [number, number]));
  }
  for (let c = 0; c < BOARD_SIZE; c++) {
    lines.push(Array.from({ length: BOARD_SIZE }, (_, r) => [r, c] as [number, number]));
  }
  lines.push(Array.from({ length: BOARD_SIZE }, (_, i) => [i, i] as [number, number]));
  lines.push(Array.from({ length: BOARD_SIZE }, (_, i) => [i, BOARD_SIZE - 1 - i] as [number, number]));
  return lines;
}

const ALL_LINES = getAllLines();

function evaluateBoard(board: Board, cpu: Stone, human: Stone): number {
  let score = 0;
  for (const line of ALL_LINES) {
    const stones = line.map(([r, c]) => board[r][c]);
    const cpuCount = stones.filter((s) => s === cpu).length;
    const humanCount = stones.filter((s) => s === human).length;
    if (humanCount === 0) score += LINE_SCORE[cpuCount];
    if (cpuCount === 0) score -= LINE_SCORE[humanCount];
  }
  return score;
}

const MATE_SCORE = 1_000;

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  cpu: Stone,
  human: Stone,
): number {
  const cells = getEmptyCells(board);
  if (cells.length === 0 || depth === 0) {
    return evaluateBoard(board, cpu, human);
  }

  const stone = maximizing ? cpu : human;
  let best = maximizing ? -Infinity : Infinity;

  for (const { row, col } of cells) {
    board[row][col] = stone;

    let value: number;
    if (checkWin(board, row, col)) {
      // 手数が浅いほど早い勝ち/負けとして優先度を上げる
      value = maximizing ? MATE_SCORE + depth : -MATE_SCORE - depth;
    } else if (isBoardFull(board)) {
      value = 0;
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

function chooseMoveByMinimax(board: Board, depth: number, cpu: Stone, human: Stone): Move {
  const cells = getEmptyCells(board);
  let bestMove = cells[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;

  for (const { row, col } of cells) {
    board[row][col] = cpu;

    let score: number;
    if (checkWin(board, row, col)) {
      score = MATE_SCORE + depth;
    } else if (isBoardFull(board)) {
      score = 0;
    } else {
      score = minimax(board, depth - 1, alpha, beta, false, cpu, human);
    }
    board[row][col] = 0;

    if (score > bestScore) {
      bestScore = score;
      bestMove = { row, col };
    }
    alpha = Math.max(alpha, score);
  }
  return bestMove;
}

const MEDIUM_DEPTH = 2;
const HARD_DEPTH = 9; // 3x3=9マス全てを読み切れる深さ（事実上の完全読み）

export function getCpuMove(board: Board, difficulty: Difficulty, cpu: Stone, human: Stone): Move {
  switch (difficulty) {
    case 'easy':
      return chooseEasyMove(board, cpu, human);
    case 'medium':
      return chooseMoveByMinimax(board, MEDIUM_DEPTH, cpu, human);
    case 'hard':
      return chooseMoveByMinimax(board, HARD_DEPTH, cpu, human);
  }
}
