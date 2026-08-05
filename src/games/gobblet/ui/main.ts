import { renderHeader } from '../../../shared/components/header';
import { renderDifficultySelector } from '../../../shared/components/difficultySelector';
import { showResultBanner } from '../../../shared/components/resultBanner';
import { renderRulesScreen } from '../../../shared/components/rulesScreen';
import type { Difficulty, GameOutcome } from '../../../types/common';
import { createInitialState, topOf, type GameState, type Player, type Size } from '../logic/board';
import { applyMove, checkRepetition, checkWin, getLegalMoves, type Move } from '../logic/rules';
import { getCpuMove } from '../logic/ai';
import { BoardView } from './boardView';
import { InventoryView } from './inventoryView';
import { renderOnlineScreen } from './onlineScreen';
import { renderOnlineGameScreen } from './onlineGameScreen';

const GAME_NAME = 'ゴブレット・ゴブラーズ';
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
      sections: [
        {
          title: '基本ルール',
          body: [
            '3×3マスの盤を使います。各プレイヤーは小・中・大の駒を2個ずつ、合計6個持っています。',
            '自分の手番には「持ち駒を新しく置く」か「盤上にある自分の駒を動かす」のどちらかを行います。',
          ],
        },
        {
          title: '被せるルール',
          body: [
            '駒は、空いているマスだけでなく、自分より小さい駒の上にも被せて置けます（相手の駒でも自分の駒でも構いません）。',
            '被せられた駒はその場に残ったまま隠れます。上の駒が動けば、また見えるようになります。',
          ],
        },
        {
          title: '移動するルール',
          body: [
            '盤上にある自分の駒（一番上に見えている駒）は、空いているマスか自分より小さい駒の上へ動かせます。',
            '駒を動かすと、元のマスに他の駒が隠れていればそれが見えるようになります。',
          ],
        },
        {
          title: '勝利条件・引き分け',
          body: [
            '一番上に見えている自分の駒が、縦・横・斜めのいずれかに3つ並ぶと勝ちです（駒のサイズが揃っている必要はありません）。',
            '同じ局面が3回繰り返された場合は引き分けとします（本来のルールにはない、対局が終わらなくなることを防ぐための措置です）。',
          ],
        },
      ],
      onBack: () => showModeSelectScreen(container),
    }),
  );
}

function startGame(container: HTMLElement, difficulty: Difficulty): void {
  container.innerHTML = '';

  let state: GameState = createInitialState();
  let selectedSize: Size | null = null;
  let selectedSource: { row: number; col: number } | null = null;
  let gameOver = false;

  const status = document.createElement('p');
  status.className = 'gobblet-status';
  container.appendChild(status);

  const layout = document.createElement('div');
  layout.className = 'gobblet-layout';

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
  actions.className = 'gobblet-actions';
  actions.appendChild(resignButton);
  container.appendChild(actions);

  refresh();

  function handleSizeClick(size: Size): void {
    if (gameOver || state.turn !== HUMAN) return;
    if (state.inventory[HUMAN][size] <= 0) return;
    selectedSize = selectedSize === size ? null : size;
    selectedSource = null;
    refresh();
  }

  function handleCellClick(row: number, col: number): void {
    if (gameOver || state.turn !== HUMAN) return;

    if (selectedSize) {
      const move = getLegalMoves(state).find(
        (m): m is Extract<Move, { kind: 'place' }> =>
          m.kind === 'place' && m.row === row && m.col === col && m.size === selectedSize,
      );
      if (move) {
        selectedSize = null;
        playMove(move, HUMAN);
        return;
      }
    }

    if (selectedSource) {
      if (selectedSource.row === row && selectedSource.col === col) {
        selectedSource = null;
        refresh();
        return;
      }
      const from = selectedSource;
      const move = getLegalMoves(state).find(
        (m): m is Extract<Move, { kind: 'move' }> =>
          m.kind === 'move' && m.from.row === from.row && m.from.col === from.col && m.to.row === row && m.to.col === col,
      );
      if (move) {
        selectedSource = null;
        playMove(move, HUMAN);
        return;
      }
    }

    // 新たに盤上の自分の駒を選択する（対象外なら選択解除）
    const top = topOf(state.board[row][col]);
    selectedSize = null;
    selectedSource = top && top.owner === HUMAN ? { row, col } : null;
    refresh();
  }

  function computeLegalTargets(): Set<string> {
    const targets = new Set<string>();
    if (selectedSize) {
      for (const m of getLegalMoves(state)) {
        if (m.kind === 'place' && m.size === selectedSize) targets.add(`${m.row}-${m.col}`);
      }
    } else if (selectedSource) {
      const from = selectedSource;
      for (const m of getLegalMoves(state)) {
        if (m.kind === 'move' && m.from.row === from.row && m.from.col === from.col) {
          targets.add(`${m.to.row}-${m.to.col}`);
        }
      }
    }
    return targets;
  }

  function playMove(move: Move, mover: Player): void {
    state = applyMove(state, move);
    refresh();

    if (checkWin(state.board, mover)) {
      finish(mover === HUMAN ? 'win' : 'lose', mover === HUMAN ? 'あなたの勝利です！' : 'CPUの勝利です');
      return;
    }
    if (checkRepetition(state.history)) {
      finish('draw', '同じ局面が繰り返されたため引き分けです');
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
    boardView.render(state.board, { selected: selectedSource, legal: computeLegalTargets() });
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
