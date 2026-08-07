import { renderHeader } from '../../../shared/components/header';
import { renderDifficultySelector } from '../../../shared/components/difficultySelector';
import { recordCpuPlay } from '../../../shared/playRecords';
import { showResultBanner } from '../../../shared/components/resultBanner';
import { renderRulesScreen } from '../../../shared/components/rulesScreen';
import { showRulesModal } from '../../../shared/components/rulesModal';
import type { Difficulty, GameOutcome } from '../../../types/common';
import { BATSU, type Board, createEmptyBoard, MARU, type Stone } from '../logic/board';
import { checkWin, isBoardFull } from '../logic/rules';
import { getCpuMove } from '../logic/ai';
import { BoardView } from './boardView';
import { renderOnlineScreen } from './onlineScreen';
import { renderOnlineGameScreen } from './onlineGameScreen';
import { GAME_NAME, RULES_SECTIONS } from './rulesContent';
import type { StoneColor } from '../online/types';

// CPUの着手を即座に反映すると考えているように見えないため、わずかに間を置く
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

function main() {
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

function showOnlineGameScreen(container: HTMLElement, roomId: string, color: StoneColor): void {
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
  const rulesButton = document.createElement('button');
  rulesButton.type = 'button';
  rulesButton.className = 'btn';
  rulesButton.textContent = 'ルール';
  rulesButton.addEventListener('click', () => showRulesModal({ gameName: GAME_NAME, sections: RULES_SECTIONS }));

  const actions = document.createElement('div');
  actions.className = 'tictactoe-actions';
  actions.appendChild(resignButton);
  actions.appendChild(rulesButton);
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
    recordCpuPlay('tictactoe', difficulty, outcome).catch((error) => console.error(error));
    showResultBanner({
      container,
      result: { outcome, message },
      onReplay: () => showTopScreen(container),
    });
  }
}

main();
