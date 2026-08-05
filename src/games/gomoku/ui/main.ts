import { renderHeader } from '../../../shared/components/header';
import { renderDifficultySelector } from '../../../shared/components/difficultySelector';
import { showResultModal } from '../../../shared/components/resultModal';
import type { Difficulty, GameOutcome } from '../../../types/common';
import { BLACK, type Board, createEmptyBoard, type Stone, WHITE } from '../logic/board';
import { checkWin, isBoardFull } from '../logic/rules';
import { getCpuMove } from '../logic/ai';
import { BoardView } from './boardView';

const GAME_NAME = '五目並べ';
// CPUの着手を即座に反映すると考えているように見えないため、わずかに間を置く
const CPU_THINK_DELAY_MS = 300;

function main() {
  const app = document.getElementById('app');
  if (!app) return;

  app.appendChild(renderHeader({ gameTitle: GAME_NAME }));

  const container = document.createElement('div');
  container.className = 'container';
  app.appendChild(container);

  showDifficultyScreen(container);
}

function showDifficultyScreen(container: HTMLElement): void {
  container.innerHTML = '';
  container.appendChild(
    renderDifficultySelector({
      gameName: GAME_NAME,
      onSelect: (difficulty) => startGame(container, difficulty),
    }),
  );
}

function startGame(container: HTMLElement, difficulty: Difficulty): void {
  container.innerHTML = '';

  const board: Board = createEmptyBoard();
  let turn: Stone = BLACK; // プレイヤーは黒（先手）固定
  let gameOver = false;

  const status = document.createElement('p');
  status.className = 'gomoku-status';
  container.appendChild(status);

  const boardView = new BoardView((row, col) => {
    if (gameOver || turn !== BLACK || board[row][col] !== 0) return;
    playMove(row, col, BLACK);
  });
  container.appendChild(boardView.element);

  boardView.render(board, null);
  updateStatus();

  function updateStatus(): void {
    if (gameOver) return;
    status.textContent = turn === BLACK ? 'あなたの番です（黒）' : 'CPU思考中…';
  }

  function playMove(row: number, col: number, stone: Stone): void {
    board[row][col] = stone;
    boardView.render(board, { row, col });

    if (checkWin(board, row, col)) {
      finish(stone === BLACK ? 'win' : 'lose', stone === BLACK ? 'あなたの5連勝利です！' : 'CPUが5連を揃えました');
      return;
    }
    if (isBoardFull(board)) {
      finish('draw', '盤面が埋まりました');
      return;
    }

    turn = stone === BLACK ? WHITE : BLACK;
    updateStatus();

    if (turn === WHITE) {
      boardView.setInteractive(false);
      window.setTimeout(() => {
        const move = getCpuMove(board, difficulty, WHITE, BLACK);
        boardView.setInteractive(true);
        playMove(move.row, move.col, WHITE);
      }, CPU_THINK_DELAY_MS);
    }
  }

  function finish(outcome: GameOutcome, message: string): void {
    gameOver = true;
    boardView.setInteractive(false);
    status.textContent = '';
    showResultModal({
      result: { outcome, message },
      onReplay: () => showDifficultyScreen(container),
    });
  }
}

main();
