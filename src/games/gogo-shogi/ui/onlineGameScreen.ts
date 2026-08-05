import { showResultModal } from '../../../shared/components/resultModal';
import type { GameOutcome } from '../../../types/common';
import type { HandPieceType, Player } from '../logic/pieces';
import type { Move } from '../logic/moveGenerator';
import { generateLegalMoves, isInCheck } from '../logic/rules';
import { resign as resignRoom, subscribeToRoom, submitMove } from '../online/roomService';
import type { RoomDoc, WinReason } from '../online/types';
import { BoardView } from './boardView';
import { HandView } from './handView';
import { showPromotionPrompt } from './promotionPrompt';

export interface OnlineGameScreenOptions {
  roomId: string;
  color: Player;
  onLeave: () => void;
}

export interface OnlineGameScreenView {
  element: HTMLElement;
  dispose: () => void;
}

type Selection = { type: 'board'; pos: [number, number] } | { type: 'hand'; pieceType: HandPieceType } | null;

function playerLabel(target: Player, room: RoomDoc): string {
  const player = room.players[target];
  if (player && player.name) return player.name;
  return target === 'sente' ? '先手' : '後手';
}

function buildResult(room: RoomDoc, myColor: Player): { outcome: GameOutcome; message: string } {
  const iWon = room.winner === myColor;
  const reason: WinReason | null = room.winReason;

  if (reason === 'checkmate') {
    return { outcome: iWon ? 'win' : 'lose', message: iWon ? '相手玉を詰ませました！' : 'あなたの玉が詰みました' };
  }
  if (reason === 'resign') {
    return { outcome: iWon ? 'win' : 'lose', message: iWon ? '相手が投了しました' : '投了しました' };
  }
  if (reason === 'perpetual-check') {
    return { outcome: iWon ? 'win' : 'lose', message: '連続王手の千日手が成立しました' };
  }
  return { outcome: iWon ? 'win' : 'lose', message: '同一局面が4回出現しました（五五将棋のルールにより先手の負け）' };
}

// 待機画面〜対局画面〜結果表示までをFirestoreの購読1本で描画する（五目並べのonlineGameScreen.tsと同じ構成）
export function renderOnlineGameScreen(options: OnlineGameScreenOptions): OnlineGameScreenView {
  const { roomId, color, onLeave } = options;
  const opponentColor: Player = color === 'sente' ? 'gote' : 'sente';

  let selection: Selection = null;
  let latestRoom: RoomDoc | null = null;
  let resultShown = false;

  const wrapper = document.createElement('div');

  const roomInfo = document.createElement('p');
  roomInfo.className = 'online-room-info';
  roomInfo.textContent = `ルーム番号: ${roomId}`;
  wrapper.appendChild(roomInfo);

  const status = document.createElement('p');
  status.className = 'shogi-status';
  wrapper.appendChild(status);

  const layout = document.createElement('div');
  layout.className = 'shogi-layout';

  const opponentHandView = new HandView(opponentColor, () => {
    /* 相手の持ち駒はクリック不可 */
  });
  const myHandView = new HandView(color, (owner, pieceType) => handleHandClick(owner, pieceType));
  const boardView = new BoardView((row, col) => handleCellClick(row, col));

  const resignButton = document.createElement('button');
  resignButton.type = 'button';
  resignButton.className = 'btn';
  resignButton.textContent = '投了する';
  resignButton.addEventListener('click', () => {
    if (!latestRoom || latestRoom.status !== 'playing') return;
    resignRoom(roomId, color).catch((error) => console.error(error));
  });
  const actions = document.createElement('div');
  actions.className = 'shogi-actions';
  actions.appendChild(resignButton);

  layout.appendChild(opponentHandView.element);
  layout.appendChild(boardView.element);
  layout.appendChild(myHandView.element);

  wrapper.appendChild(layout);
  wrapper.appendChild(actions);

  function getLegalDestinations(): Array<readonly [number, number]> {
    if (!selection || !latestRoom || latestRoom.turn !== color) return [];
    const legal = generateLegalMoves(latestRoom);
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
    if (!latestRoom || latestRoom.status !== 'playing' || latestRoom.turn !== color) return;
    const clickedPiece = latestRoom.board[row][col];

    if (selection?.type === 'board' && selection.pos[0] === row && selection.pos[1] === col) {
      selection = null;
      render();
      return;
    }

    const destinations = getLegalDestinations();
    const isLegalDestination = destinations.some(([r, c]) => r === row && c === col);

    if (selection && isLegalDestination) {
      finalizeMove(row, col);
      return;
    }

    if (clickedPiece && clickedPiece.owner === color) {
      selection = { type: 'board', pos: [row, col] };
      render();
      return;
    }

    selection = null;
    render();
  }

  function handleHandClick(owner: Player, pieceType: HandPieceType): void {
    if (!latestRoom || latestRoom.status !== 'playing' || latestRoom.turn !== color || owner !== color) return;
    if (latestRoom.hand[color][pieceType] <= 0) return;
    selection = { type: 'hand', pieceType };
    render();
  }

  function finalizeMove(row: number, col: number): void {
    if (!selection || !latestRoom) return;
    const currentSelection = selection;
    const legal = generateLegalMoves(latestRoom);
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
      render();
      return;
    }
    if (candidates.length === 1) {
      sendMove(candidates[0]);
      return;
    }

    showPromotionPrompt((promote) => {
      const chosen = candidates.find((m) => m.kind === 'board' && m.promote === promote) ?? candidates[0];
      sendMove(chosen);
    });
  }

  function sendMove(move: Move): void {
    submitMove(roomId, move, color).catch((error) => {
      console.error(error);
    });
  }

  function updateStatus(room: RoomDoc): void {
    if (room.status === 'waiting') {
      status.textContent = 'ルーム番号を伝えて、対戦相手を待っています…';
      return;
    }
    if (room.status === 'playing') {
      const myTurn = room.turn === color;
      status.textContent = myTurn
        ? isInCheck(room, color)
          ? 'あなたの番です（王手されています）'
          : 'あなたの番です'
        : `${playerLabel(room.turn, room)}の番です`;
      return;
    }
    status.textContent = '';
  }

  function render(): void {
    if (!latestRoom) return;
    const highlights = getLegalDestinations();
    const selectedBoardPos = selection?.type === 'board' ? selection.pos : null;
    boardView.render(latestRoom, { selected: selectedBoardPos, highlights, lastMove: null });
    opponentHandView.render(latestRoom.hand[opponentColor], null);
    myHandView.render(latestRoom.hand[color], selection?.type === 'hand' ? selection.pieceType : null);
    boardView.setInteractive(latestRoom.status === 'playing' && latestRoom.turn === color);
    resignButton.disabled = latestRoom.status !== 'playing';
    updateStatus(latestRoom);

    if (latestRoom.status === 'finished' && !resultShown) {
      resultShown = true;
      boardView.setInteractive(false);
      showResultModal({
        result: buildResult(latestRoom, color),
        onReplay: onLeave,
      });
    }
  }

  const unsubscribe = subscribeToRoom(roomId, (room) => {
    if (!room) {
      status.textContent = 'ルームが見つかりませんでした（削除された可能性があります）';
      boardView.setInteractive(false);
      return;
    }
    latestRoom = room;
    render();
  });

  return { element: wrapper, dispose: unsubscribe };
}
