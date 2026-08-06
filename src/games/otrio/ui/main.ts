import { renderHeader } from '../../../shared/components/header';
import { renderDifficultySelector } from '../../../shared/components/difficultySelector';
import { showResultBanner } from '../../../shared/components/resultBanner';
import { renderRulesScreen } from '../../../shared/components/rulesScreen';
import { showRulesModal } from '../../../shared/components/rulesModal';
import type { Difficulty, GameOutcome } from '../../../types/common';
import { createInitialState, type GameState, type Player, type Size } from '../logic/board';
import { applyMove, checkWin, getLegalMoves, isGameOver, type Move } from '../logic/rules';
import { getCpuMove } from '../logic/ai';
import { BoardView } from './boardView';
import { InventoryView } from './inventoryView';
import { renderOnlineScreen } from './onlineScreen';
import { renderOnlineGameScreen } from './onlineGameScreen';
import { GAME_NAME, RULES_SECTIONS } from './rulesContent';

const HUMAN: Player = 1; // プレイヤーは先手固定
const CPU: Player = 2;
const CPU_THINK_DELAY_MS = 300;

// オンライン対戦画面はFirestoreの購読(onSnapshot)を持つため、画面遷移のたびに解除する
let activeDispose: (() => void) | null = null;

function clearScreen(container: HTMLElement): void {
  if (activeDispose) {
    activeDispose();
    activeDispose = null;
  }
  container.innerHTML = '';
}

function main(): void {
  const app = document.getElementById('app');
  if (!app) return;

  app.appendChild(renderHeader({ gameTitle: GAME_NAME }));

  const container = document.createElement('div');
  container.className = 'container';
  app.appendChild(container);

  showModeSelectScreen(container);
}

function showModeSelectScreen(container: HTMLElement): void {
  clearScreen(container);

  const section = document.createElement('section');
  section.className = 'card difficulty-selector';

  const title = document.createElement('h2');
  title.className = 'difficulty-selector__title';
  title.textContent = `${GAME_NAME} - 対戦相手を選んでください`;
  section.appendChild(title);

  const buttonRow = document.createElement('div');
  buttonRow.className = 'difficulty-selector__buttons';

  const cpuButton = document.createElement('button');
  cpuButton.type = 'button';
  cpuButton.className = 'btn btn-primary';
  cpuButton.textContent = 'CPU対戦';
  cpuButton.addEventListener('click', () => showTopScreen(container));
  buttonRow.appendChild(cpuButton);

  const onlineButton = document.createElement('button');
  onlineButton.type = 'button';
  onlineButton.className = 'btn btn-primary';
  onlineButton.textContent = 'オンライン対戦';
  onlineButton.addEventListener('click', () => showOnlineScreen(container));
  buttonRow.appendChild(onlineButton);

  const rulesButton = document.createElement('button');
  rulesButton.type = 'button';
  rulesButton.className = 'btn';
  rulesButton.textContent = 'ルール説明';
  rulesButton.addEventListener('click', () => showRulesScreen(container));
  buttonRow.appendChild(rulesButton);

  section.appendChild(buttonRow);
  container.appendChild(section);
}

function showTopScreen(container: HTMLElement): void {
  clearScreen(container);
  container.appendChild(
    renderDifficultySelector({
      gameName: GAME_NAME,
      onSelect: (difficulty) => startGame(container, difficulty),
    }),
  );
}

function showOnlineScreen(container: HTMLElement): void {
  clearScreen(container);
  const view = renderOnlineScreen({
    onRoomReady: (roomId, color) => showOnlineGameScreen(container, roomId, color),
  });
  container.appendChild(view.element);
  activeDispose = view.dispose;
}

function showOnlineGameScreen(container: HTMLElement, roomId: string, color: Player): void {
  clearScreen(container);
  const view = renderOnlineGameScreen({
    roomId,
    color,
    onLeave: () => showOnlineScreen(container),
  });
  container.appendChild(view.element);
  activeDispose = view.dispose;
}

function showRulesScreen(container: HTMLElement): void {
  clearScreen(container);
  container.appendChild(
    renderRulesScreen({
      gameName: GAME_NAME,
      sections: RULES_SECTIONS,
      onBack: () => showModeSelectScreen(container),
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
  const rulesButton = document.createElement('button');
  rulesButton.type = 'button';
  rulesButton.className = 'btn';
  rulesButton.textContent = 'ルール';
  rulesButton.addEventListener('click', () => showRulesModal({ gameName: GAME_NAME, sections: RULES_SECTIONS }));

  const actions = document.createElement('div');
  actions.className = 'otrio-actions';
  actions.appendChild(resignButton);
  actions.appendChild(rulesButton);
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
    showResultBanner({
      container,
      result: { outcome, message },
      onReplay: () => showTopScreen(container),
    });
  }
}

main();
