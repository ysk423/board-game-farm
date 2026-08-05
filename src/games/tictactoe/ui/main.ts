import { renderHeader } from '../../../shared/components/header';
import { renderDifficultySelector } from '../../../shared/components/difficultySelector';
import { showResultModal } from '../../../shared/components/resultModal';
import { renderRulesScreen } from '../../../shared/components/rulesScreen';
import type { Difficulty, GameOutcome } from '../../../types/common';
import { BATSU, type Board, createEmptyBoard, MARU, type Stone } from '../logic/board';
import { checkWin, isBoardFull } from '../logic/rules';
import { getCpuMove } from '../logic/ai';
import { BoardView } from './boardView';

const GAME_NAME = '〇×ゲーム';
// CPUの着手を即座に反映すると考えているように見えないため、わずかに間を置く
const CPU_THINK_DELAY_MS = 300;

function main() {
  const app = document.getElementById('app');
  if (!app) return;

  app.appendChild(renderHeader({ gameTitle: GAME_NAME }));

  const container = document.createElement('div');
  container.className = 'container';
  app.appendChild(container);

  showTopScreen(container);
}

function showTopScreen(container: HTMLElement): void {
  container.innerHTML = '';
  container.appendChild(
    renderDifficultySelector({
      gameName: GAME_NAME,
      onSelect: (difficulty) => startGame(container, difficulty),
    }),
  );

  const rulesButton = document.createElement('button');
  rulesButton.type = 'button';
  rulesButton.className = 'btn tictactoe-rules-button';
  rulesButton.textContent = 'ルール説明';
  rulesButton.addEventListener('click', () => showRulesScreen(container));
  container.appendChild(rulesButton);
}

function showRulesScreen(container: HTMLElement): void {
  container.innerHTML = '';
  container.appendChild(
    renderRulesScreen({
      gameName: GAME_NAME,
      sections: [
        {
          title: '基本ルール',
          body: [
            '3×3マスの盤に、2人が交互に○と×を置いていきます。',
            '縦・横・斜めのいずれかの方向に、自分の記号を3つ連続して並べた方が勝ちです。',
          ],
        },
        {
          title: '引き分け',
          body: ['盤面がすべて埋まっても勝敗が決まらない場合は引き分けです。'],
        },
      ],
      onBack: () => showTopScreen(container),
    }),
  );
}

function startGame(container: HTMLElement, difficulty: Difficulty): void {
  container.innerHTML = '';

  const board: Board = createEmptyBoard();
  let turn: Stone = MARU; // プレイヤーは○（先手）固定
  let gameOver = false;

  const status = document.createElement('p');
  status.className = 'tictactoe-status';
  container.appendChild(status);

  const boardView = new BoardView((row, col) => {
    if (gameOver || turn !== MARU || board[row][col] !== 0) return;
    playMove(row, col, MARU);
  });
  container.appendChild(boardView.element);

  const resignButton = document.createElement('button');
  resignButton.type = 'button';
  resignButton.className = 'btn';
  resignButton.textContent = '投了する';
  resignButton.addEventListener('click', () => {
    if (gameOver) return;
    finish('lose', '投了しました');
  });
  const actions = document.createElement('div');
  actions.className = 'tictactoe-actions';
  actions.appendChild(resignButton);
  container.appendChild(actions);

  boardView.render(board, null);
  updateStatus();

  function updateStatus(): void {
    if (gameOver) return;
    status.textContent = turn === MARU ? 'あなたの番です（○）' : 'CPU思考中…';
  }

  function playMove(row: number, col: number, stone: Stone): void {
    board[row][col] = stone;
    boardView.render(board, { row, col });

    if (checkWin(board, row, col)) {
      finish(stone === MARU ? 'win' : 'lose', stone === MARU ? 'あなたの3並び勝利です！' : 'CPUが3並びを揃えました');
      return;
    }
    if (isBoardFull(board)) {
      finish('draw', '盤面が埋まりました');
      return;
    }

    turn = stone === MARU ? BATSU : MARU;
    updateStatus();

    if (turn === BATSU) {
      boardView.setInteractive(false);
      window.setTimeout(() => {
        const move = getCpuMove(board, difficulty, BATSU, MARU);
        boardView.setInteractive(true);
        playMove(move.row, move.col, BATSU);
      }, CPU_THINK_DELAY_MS);
    }
  }

  function finish(outcome: GameOutcome, message: string): void {
    gameOver = true;
    boardView.setInteractive(false);
    resignButton.disabled = true;
    status.textContent = '';
    showResultModal({
      result: { outcome, message },
      onReplay: () => showTopScreen(container),
    });
  }
}

main();
