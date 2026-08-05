import { renderHeader } from '../../../shared/components/header';
import { renderDifficultySelector } from '../../../shared/components/difficultySelector';
import { showResultModal } from '../../../shared/components/resultModal';
import { renderRulesScreen } from '../../../shared/components/rulesScreen';
import type { Difficulty, GameOutcome } from '../../../types/common';
import { createInitialState, type GameState, type Player, type Size } from '../logic/board';
import { applyMove, checkWin, getLegalMoves, isGameOver, type Move } from '../logic/rules';
import { getCpuMove } from '../logic/ai';
import { BoardView } from './boardView';
import { InventoryView } from './inventoryView';

const GAME_NAME = 'オートリオ';
const HUMAN: Player = 1; // プレイヤーは先手固定
const CPU: Player = 2;
const CPU_THINK_DELAY_MS = 300;

function main(): void {
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
  rulesButton.className = 'btn otrio-rules-button';
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
            '3×3マスの盤を使い、各マスには小・中・大それぞれのサイズの駒を1つずつ重ねて置くことができます。',
            '各プレイヤーは小・中・大の駒を3個ずつ、合計9個持っています。自分の手番に、持ち駒の中から好きなサイズを選び、そのサイズがまだ空いているマスへ置きます。',
          ],
        },
        {
          title: '勝利条件',
          body: [
            '同じサイズの駒が縦・横・斜めのいずれかに3つ並ぶと勝ちです。',
            'また、1つのマスに自分の小・中・大の駒すべてが揃う（トリオ）と、それだけでも勝ちになります。',
          ],
        },
        {
          title: '引き分け',
          body: ['両者の持ち駒がすべてなくなっても勝敗が決まらない場合は引き分けです。'],
        },
      ],
      onBack: () => showTopScreen(container),
    }),
  );
}

function startGame(container: HTMLElement, difficulty: Difficulty): void {
  container.innerHTML = '';

  let state: GameState = createInitialState();
  let selectedSize: Size | null = null;
  let gameOver = false;

  const status = document.createElement('p');
  status.className = 'otrio-status';
  container.appendChild(status);

  const layout = document.createElement('div');
  layout.className = 'otrio-layout';

  const cpuInventoryView = new InventoryView('CPUの持ち駒', null);
  const boardView = new BoardView((row, col) => handleCellClick(row, col), HUMAN);
  const humanInventoryView = new InventoryView('あなたの持ち駒', (size) => handleSizeClick(size));

  layout.appendChild(cpuInventoryView.element);
  layout.appendChild(boardView.element);
  layout.appendChild(humanInventoryView.element);
  container.appendChild(layout);

  const resignButton = document.createElement('button');
  resignButton.type = 'button';
  resignButton.className = 'btn';
  resignButton.textContent = '投了する';
  resignButton.addEventListener('click', () => {
    if (gameOver) return;
    finish('lose', '投了しました');
  });
  const actions = document.createElement('div');
  actions.className = 'otrio-actions';
  actions.appendChild(resignButton);
  container.appendChild(actions);

  refresh();

  function handleSizeClick(size: Size): void {
    if (gameOver || state.turn !== HUMAN) return;
    if (state.inventory[HUMAN][size] <= 0) return;
    selectedSize = selectedSize === size ? null : size;
    refresh();
  }

  function handleCellClick(row: number, col: number): void {
    if (gameOver || state.turn !== HUMAN || !selectedSize) return;
    const isLegal = getLegalMoves(state).some((m) => m.row === row && m.col === col && m.size === selectedSize);
    if (!isLegal) return;

    const move: Move = { row, col, size: selectedSize };
    selectedSize = null;
    playMove(move, HUMAN);
  }

  function playMove(move: Move, mover: Player): void {
    state = applyMove(state, move);
    refresh();

    if (checkWin(state.board, mover)) {
      finish(
        mover === HUMAN ? 'win' : 'lose',
        mover === HUMAN ? 'あなたの勝利です！' : 'CPUの勝利です',
      );
      return;
    }
    if (isGameOver(state)) {
      finish('draw', '持ち駒がなくなりました');
      return;
    }

    if (state.turn === CPU) {
      boardView.setInteractive(false);
      window.setTimeout(() => {
        const cpuMove = getCpuMove(state, difficulty);
        playMove(cpuMove, CPU);
      }, CPU_THINK_DELAY_MS);
    }
  }

  function updateStatus(): void {
    if (gameOver) {
      status.textContent = '';
      return;
    }
    status.textContent = state.turn === HUMAN ? 'あなたの番です' : 'CPU思考中…';
  }

  function refresh(): void {
    boardView.render(state);
    cpuInventoryView.render(state.inventory[CPU], null);
    humanInventoryView.render(state.inventory[HUMAN], selectedSize);
    boardView.setInteractive(!gameOver && state.turn === HUMAN);
    updateStatus();
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
