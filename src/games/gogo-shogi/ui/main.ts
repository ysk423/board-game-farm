import { renderHeader } from '../../../shared/components/header';
import { renderDifficultySelector } from '../../../shared/components/difficultySelector';
import { showResultModal } from '../../../shared/components/resultModal';
import type { Difficulty, GameOutcome } from '../../../types/common';
import { type GameState, createInitialState } from '../logic/board';
import { type HandPieceType, type Player, opponentOf } from '../logic/pieces';
import type { Move } from '../logic/moveGenerator';
import { applyMove, checkRepetition, generateLegalMoves, type HistoryEntry, isCheckmate, isInCheck, positionKey } from '../logic/rules';
import { getCpuMove } from '../logic/ai';
import { BoardView } from './boardView';
import { HandView } from './handView';

const GAME_NAME = '五五将棋';
const HUMAN: Player = 'sente'; // プレイヤーは先手（王将）固定
const CPU: Player = 'gote';
const CPU_THINK_DELAY_MS = 400;

type Selection = { type: 'board'; pos: [number, number] } | { type: 'hand'; pieceType: HandPieceType } | null;

function main(): void {
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

  let state: GameState = createInitialState();
  const history: HistoryEntry[] = [];
  let selection: Selection = null;
  let gameOver = false;
  let lastMove: [number, number] | null = null;

  const status = document.createElement('p');
  status.className = 'shogi-status';

  const layout = document.createElement('div');
  layout.className = 'shogi-layout';

  const goteHandView = new HandView('gote', () => {
    /* CPUの持ち駒はクリック不可 */
  });
  const senteHandView = new HandView('sente', (owner, pieceType) => handleHandClick(owner, pieceType));
  const boardView = new BoardView((row, col) => handleCellClick(row, col));

  const resignButton = document.createElement('button');
  resignButton.type = 'button';
  resignButton.className = 'btn';
  resignButton.textContent = '投了する';
  resignButton.addEventListener('click', () => {
    if (gameOver) return;
    endGame('lose', '投了しました');
  });
  const actions = document.createElement('div');
  actions.className = 'shogi-actions';
  actions.appendChild(resignButton);

  layout.appendChild(goteHandView.element);
  layout.appendChild(boardView.element);
  layout.appendChild(senteHandView.element);

  container.appendChild(status);
  container.appendChild(layout);
  container.appendChild(actions);

  refresh();

  function getLegalDestinations(): Array<readonly [number, number]> {
    if (!selection) return [];
    const legal = generateLegalMoves(state);
    if (selection.type === 'board') {
      const [fromRow, fromCol] = selection.pos;
      return legal
        .filter((m): m is Move & { kind: 'board' } => m.kind === 'board' && m.from[0] === fromRow && m.from[1] === fromCol)
        .map((m) => m.to);
    }
    const pieceType = selection.pieceType;
    return legal
      .filter((m): m is Move & { kind: 'drop' } => m.kind === 'drop' && m.pieceType === pieceType)
      .map((m) => m.to);
  }

  function handleCellClick(row: number, col: number): void {
    if (gameOver || state.turn !== HUMAN) return;
    const clickedPiece = state.board[row][col];

    if (selection?.type === 'board' && selection.pos[0] === row && selection.pos[1] === col) {
      selection = null;
      refresh();
      return;
    }

    const destinations = getLegalDestinations();
    const isLegalDestination = destinations.some(([r, c]) => r === row && c === col);

    if (selection && isLegalDestination) {
      finalizeMove(row, col);
      return;
    }

    if (clickedPiece && clickedPiece.owner === HUMAN) {
      selection = { type: 'board', pos: [row, col] };
      refresh();
      return;
    }

    selection = null;
    refresh();
  }

  function handleHandClick(owner: Player, pieceType: HandPieceType): void {
    if (gameOver || state.turn !== HUMAN || owner !== HUMAN) return;
    if (state.hand[HUMAN][pieceType] <= 0) return;
    selection = { type: 'hand', pieceType };
    refresh();
  }

  function finalizeMove(row: number, col: number): void {
    if (!selection) return;
    const currentSelection = selection;
    const legal = generateLegalMoves(state);
    const candidates =
      currentSelection.type === 'board'
        ? legal.filter(
            (m): m is Move & { kind: 'board' } =>
              m.kind === 'board' &&
              m.from[0] === currentSelection.pos[0] &&
              m.from[1] === currentSelection.pos[1] &&
              m.to[0] === row &&
              m.to[1] === col,
          )
        : legal.filter(
            (m): m is Move & { kind: 'drop' } =>
              m.kind === 'drop' && m.pieceType === currentSelection.pieceType && m.to[0] === row && m.to[1] === col,
          );

    selection = null;

    if (candidates.length === 0) {
      refresh();
      return;
    }
    if (candidates.length === 1) {
      commitMove(candidates[0]);
      return;
    }

    // 成る/成らないの両方が選べる場合は選択させる
    showPromotionPrompt((promote) => {
      const chosen = candidates.find((m) => m.kind === 'board' && m.promote === promote) ?? candidates[0];
      commitMove(chosen);
    });
  }

  function commitMove(move: Move): void {
    state = applyMove(state, move);
    lastMove = [...move.to] as [number, number];
    recordHistoryAndCheckEnd();
    refresh();

    if (!gameOver && state.turn === CPU) {
      scheduleCpuMove();
    }
  }

  function recordHistoryAndCheckEnd(): void {
    const mover = opponentOf(state.turn);
    history.push({ key: positionKey(state), mover, isCheck: isInCheck(state, state.turn) });

    const repetition = checkRepetition(history);
    if (repetition.type !== 'none') {
      const loser = repetition.loser;
      const message =
        repetition.type === 'perpetual-check'
          ? `連続王手の千日手が成立しました（${loser === 'sente' ? 'あなた' : 'CPU'}の負け）`
          : '同一局面が4回出現しました（五五将棋のルールにより先手の負け）';
      endGame(loser === HUMAN ? 'lose' : 'win', message);
      return;
    }

    if (isCheckmate(state)) {
      const winner = opponentOf(state.turn);
      endGame(winner === HUMAN ? 'win' : 'lose', winner === HUMAN ? '相手玉を詰ませました！' : 'あなたの玉が詰みました');
    }
  }

  function scheduleCpuMove(): void {
    boardView.setInteractive(false);
    window.setTimeout(() => {
      if (gameOver) return;
      const result = getCpuMove(state, difficulty);
      if (result.type === 'resign') {
        endGame('win', 'CPUが投了しました');
        return;
      }
      state = applyMove(state, result.move);
      lastMove = [...result.move.to] as [number, number];
      recordHistoryAndCheckEnd();
      refresh();
    }, CPU_THINK_DELAY_MS);
  }

  function updateStatus(): void {
    if (gameOver) {
      status.textContent = '';
      return;
    }
    if (state.turn === HUMAN) {
      status.textContent = isInCheck(state, HUMAN) ? 'あなたの番です（王手されています）' : 'あなたの番です';
    } else {
      status.textContent = 'CPU思考中…';
    }
  }

  function refresh(): void {
    const highlights = getLegalDestinations();
    const selectedBoardPos = selection?.type === 'board' ? selection.pos : null;
    boardView.render(state, { selected: selectedBoardPos, highlights, lastMove });
    goteHandView.render(state.hand.gote, null);
    senteHandView.render(state.hand.sente, selection?.type === 'hand' ? selection.pieceType : null);
    updateStatus();
  }

  function endGame(outcome: GameOutcome, message: string): void {
    gameOver = true;
    boardView.setInteractive(false);
    refresh();
    showResultModal({
      result: { outcome, message },
      onReplay: () => showDifficultyScreen(container),
    });
  }
}

function showPromotionPrompt(onChoice: (promote: boolean) => void): void {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const title = document.createElement('h2');
  title.className = 'modal__title';
  title.textContent = '成りますか？';
  modal.appendChild(title);

  const actions = document.createElement('div');
  actions.className = 'modal__actions';

  const yesButton = document.createElement('button');
  yesButton.type = 'button';
  yesButton.className = 'btn btn-primary';
  yesButton.textContent = '成る';
  yesButton.addEventListener('click', () => {
    overlay.remove();
    onChoice(true);
  });

  const noButton = document.createElement('button');
  noButton.type = 'button';
  noButton.className = 'btn';
  noButton.textContent = '成らない';
  noButton.addEventListener('click', () => {
    overlay.remove();
    onChoice(false);
  });

  actions.appendChild(yesButton);
  actions.appendChild(noButton);
  modal.appendChild(actions);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

main();
