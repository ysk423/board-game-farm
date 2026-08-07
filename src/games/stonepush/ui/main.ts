import { renderHeader } from '../../../shared/components/header';
import { renderDifficultySelector } from '../../../shared/components/difficultySelector';
import { recordCpuPlay } from '../../../shared/playRecords';
import { showResultBanner } from '../../../shared/components/resultBanner';
import { renderRulesScreen } from '../../../shared/components/rulesScreen';
import { showRulesModal } from '../../../shared/components/rulesModal';
import type { Difficulty, GameOutcome } from '../../../types/common';
import {
  ALL_BOARD_POSITIONS,
  BOARD_COLOR_OF,
  BOARD_SIZE,
  type BoardPosition,
  createInitialState,
  type GameState,
  type Player,
  posKey,
  type Pos,
} from '../logic/board';
import {
  applyAggressiveMove,
  applyPassiveMove,
  cancelAggressiveAndRevertPassive,
  cancelAggressiveSelection,
  cancelPassiveSelection,
  legalAggressiveMoves,
  legalPassiveMoves,
  selectAggressiveStone,
  selectPassiveStone,
} from '../logic/rules';
import { chooseCpuTurn } from '../logic/ai';
import { BoardView, type BoardHighlight } from './boardView';
import { GAME_NAME, RULES_SECTIONS } from './rulesContent';

const HUMAN: Player = 'black'; // プレイヤーは黒（先手）固定
const CPU: Player = 'white';
const CPU_THINK_DELAY_MS = 300;
// フォロー（アグレッシブ移動）確定前ならリードをやり直せるようにする対象フェーズ
const AGGRESSIVE_PHASES: ReadonlySet<GameState['phase']> = new Set(['aggressiveSelect', 'aggressiveConfirm']);

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
  container.innerHTML = '';

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
  cpuButton.addEventListener('click', () => showDifficultyScreen(container));
  buttonRow.appendChild(cpuButton);

  const rulesButton = document.createElement('button');
  rulesButton.type = 'button';
  rulesButton.className = 'btn';
  rulesButton.textContent = 'ルール説明';
  rulesButton.addEventListener('click', () => showRulesScreen(container));
  buttonRow.appendChild(rulesButton);

  section.appendChild(buttonRow);
  container.appendChild(section);
}

function showRulesScreen(container: HTMLElement): void {
  container.innerHTML = '';
  container.appendChild(
    renderRulesScreen({
      gameName: GAME_NAME,
      sections: RULES_SECTIONS,
      onBack: () => showModeSelectScreen(container),
    }),
  );
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

function cellKey(bp: BoardPosition, pos: Pos): string {
  return `${bp}-${pos.row}-${pos.col}`;
}

function startGame(container: HTMLElement, difficulty: Difficulty): void {
  container.innerHTML = '';

  let state: GameState = createInitialState(difficulty);
  let gameOver = false;

  const status = document.createElement('p');
  status.className = 'stonepush-status';
  container.appendChild(status);

  const boardView = new BoardView((bp, pos) => handleCellClick(bp, pos));
  container.appendChild(boardView.element);

  const resignButton = document.createElement('button');
  resignButton.type = 'button';
  resignButton.className = 'btn';
  resignButton.textContent = '投了する';
  resignButton.addEventListener('click', () => {
    if (gameOver) return;
    finish('lose', '投了しました');
  });

  const undoLeadButton = document.createElement('button');
  undoLeadButton.type = 'button';
  undoLeadButton.className = 'btn';
  undoLeadButton.textContent = 'リードをやり直す';
  undoLeadButton.addEventListener('click', () => {
    if (gameOver || state.currentPlayer !== HUMAN || !AGGRESSIVE_PHASES.has(state.phase)) return;
    state = cancelAggressiveAndRevertPassive(state);
    refresh();
  });

  const rulesButton = document.createElement('button');
  rulesButton.type = 'button';
  rulesButton.className = 'btn';
  rulesButton.textContent = 'ルール';
  rulesButton.addEventListener('click', () => showRulesModal({ gameName: GAME_NAME, sections: RULES_SECTIONS }));

  const actions = document.createElement('div');
  actions.className = 'stonepush-actions';
  actions.appendChild(resignButton);
  actions.appendChild(undoLeadButton);
  actions.appendChild(rulesButton);
  container.appendChild(actions);

  refresh();

  function handleCellClick(bp: BoardPosition, pos: Pos): void {
    if (gameOver || state.currentPlayer !== HUMAN) return;

    switch (state.phase) {
      case 'passiveSelect': {
        const isSelectable = legalPassiveMoves(state).some(
          (m) => m.boardPosition === bp && m.from.row === pos.row && m.from.col === pos.col,
        );
        if (isSelectable) {
          state = selectPassiveStone(state, bp, pos);
          refresh();
        }
        return;
      }
      case 'passiveConfirm': {
        const sel = state.selectedPassiveFrom;
        if (!sel) return;
        if (sel.boardPosition === bp && sel.pos.row === pos.row && sel.pos.col === pos.col) {
          state = cancelPassiveSelection(state);
          refresh();
          return;
        }
        const move = legalPassiveMoves(state).find(
          (m) =>
            m.boardPosition === sel.boardPosition &&
            m.from.row === sel.pos.row &&
            m.from.col === sel.pos.col &&
            m.boardPosition === bp &&
            m.to.row === pos.row &&
            m.to.col === pos.col,
        );
        if (move) {
          state = applyPassiveMove(state, move);
          refresh();
        }
        return;
      }
      case 'aggressiveSelect': {
        if (!state.passiveMove) return;
        const isSelectable = legalAggressiveMoves(state, state.passiveMove).some(
          (m) => m.boardPosition === bp && m.from.row === pos.row && m.from.col === pos.col,
        );
        state = isSelectable ? selectAggressiveStone(state, bp, pos) : cancelAggressiveAndRevertPassive(state);
        refresh();
        return;
      }
      case 'aggressiveConfirm': {
        const sel = state.selectedAggressiveFrom;
        if (!sel || !state.passiveMove) return;
        if (sel.boardPosition === bp && sel.pos.row === pos.row && sel.pos.col === pos.col) {
          state = cancelAggressiveSelection(state);
          refresh();
          return;
        }
        const move = legalAggressiveMoves(state, state.passiveMove).find(
          (m) =>
            m.boardPosition === sel.boardPosition &&
            m.from.row === sel.pos.row &&
            m.from.col === sel.pos.col &&
            m.boardPosition === bp &&
            m.to.row === pos.row &&
            m.to.col === pos.col,
        );
        if (move) {
          finalizeAggressive(move);
        } else {
          state = cancelAggressiveAndRevertPassive(state);
          refresh();
        }
        return;
      }
    }
  }

  function finalizeAggressive(move: Parameters<typeof applyAggressiveMove>[1]): void {
    state = applyAggressiveMove(state, move);
    refresh();

    if (state.phase === 'gameOver') {
      endGame();
      return;
    }

    if (state.currentPlayer === CPU) {
      boardView.setInteractive(false);
      window.setTimeout(() => {
        const turn = chooseCpuTurn(state);
        state = applyPassiveMove(state, turn.passiveMove);
        state = applyAggressiveMove(state, turn.aggressiveMove);
        refresh();
        if (state.phase === 'gameOver') endGame();
      }, CPU_THINK_DELAY_MS);
    }
  }

  function endGame(): void {
    const winner = state.winner;
    finish(winner === HUMAN ? 'win' : 'lose', winner === HUMAN ? 'あなたの勝利です！' : 'CPUの勝利です');
  }

  function computeHighlight(): BoardHighlight {
    const movable = new Set<string>();
    const dimmedOwn = new Set<string>();
    const destinations = new Set<string>();
    const dimmedBoards = new Set<BoardPosition>();
    let selected: BoardHighlight['selected'] = null;

    if (gameOver || state.currentPlayer !== HUMAN) {
      return { movable, dimmedOwn, selected, destinations, dimmedBoards };
    }

    if (state.phase === 'passiveSelect') {
      for (const m of legalPassiveMoves(state)) {
        movable.add(cellKey(m.boardPosition, m.from));
      }
      for (const bp of ALL_BOARD_POSITIONS) {
        for (let row = 0; row < BOARD_SIZE; row++) {
          for (let col = 0; col < BOARD_SIZE; col++) {
            if (state.boards[bp].stones[posKey({ row, col })] !== HUMAN) continue;
            const key = cellKey(bp, { row, col });
            if (!movable.has(key)) dimmedOwn.add(key);
          }
        }
      }
    } else if (state.phase === 'passiveConfirm' && state.selectedPassiveFrom) {
      selected = state.selectedPassiveFrom;
      for (const m of legalPassiveMoves(state)) {
        if (m.boardPosition === selected.boardPosition && m.from.row === selected.pos.row && m.from.col === selected.pos.col) {
          destinations.add(cellKey(m.boardPosition, m.to));
        }
      }
    } else if (state.phase === 'aggressiveSelect' && state.passiveMove) {
      for (const m of legalAggressiveMoves(state, state.passiveMove)) {
        movable.add(cellKey(m.boardPosition, m.from));
      }
      const passiveColor = BOARD_COLOR_OF[state.passiveMove.boardPosition];
      for (const bp of ALL_BOARD_POSITIONS) {
        if (BOARD_COLOR_OF[bp] === passiveColor) dimmedBoards.add(bp);
      }
    } else if (state.phase === 'aggressiveConfirm' && state.selectedAggressiveFrom && state.passiveMove) {
      selected = state.selectedAggressiveFrom;
      for (const m of legalAggressiveMoves(state, state.passiveMove)) {
        if (m.boardPosition === selected.boardPosition && m.from.row === selected.pos.row && m.from.col === selected.pos.col) {
          destinations.add(cellKey(m.boardPosition, m.to));
        }
      }
      const passiveColor = BOARD_COLOR_OF[state.passiveMove.boardPosition];
      for (const bp of ALL_BOARD_POSITIONS) {
        if (BOARD_COLOR_OF[bp] === passiveColor) dimmedBoards.add(bp);
      }
    }

    return { movable, dimmedOwn, selected, destinations, dimmedBoards };
  }

  function updateStatus(): void {
    if (gameOver) {
      status.textContent = '';
      return;
    }
    if (state.currentPlayer !== HUMAN) {
      status.textContent = 'CPU思考中…';
      return;
    }
    const isPassivePhase = state.phase === 'passiveSelect' || state.phase === 'passiveConfirm';
    status.textContent = isPassivePhase ? 'あなたの番です（リード）' : 'あなたの番です（フォロー：押し出し）';
  }

  function refresh(): void {
    boardView.render(state, computeHighlight());
    boardView.setInteractive(!gameOver && state.currentPlayer === HUMAN);
    resignButton.disabled = gameOver;
    const canUndoLead = !gameOver && state.currentPlayer === HUMAN && AGGRESSIVE_PHASES.has(state.phase);
    undoLeadButton.style.display = canUndoLead ? '' : 'none';
    updateStatus();
  }

  function finish(outcome: GameOutcome, message: string): void {
    gameOver = true;
    boardView.setInteractive(false);
    resignButton.disabled = true;
    status.textContent = '';
    recordCpuPlay('stonepush', difficulty, outcome).catch((error) => console.error(error));
    showResultBanner({
      container,
      result: { outcome, message },
      onReplay: () => showDifficultyScreen(container),
    });
  }
}

main();
