import { showResultBanner } from '../../../shared/components/resultBanner';
import { showRulesModal } from '../../../shared/components/rulesModal';
import type { GameOutcome } from '../../../types/common';
import { opponentOf, type Player, type Size } from '../logic/board';
import { getLegalMoves, type Move } from '../logic/rules';
import { resign as resignRoom, subscribeToRoom, submitMove } from '../online/roomService';
import type { RoomDoc, WinReason } from '../online/types';
import { BoardView } from './boardView';
import { InventoryView } from './inventoryView';
import { GAME_NAME, RULES_SECTIONS } from './rulesContent';

export interface OnlineGameScreenOptions {
  roomId: string;
  color: Player;
  onLeave: () => void;
}

export interface OnlineGameScreenView {
  element: HTMLElement;
  dispose: () => void;
}

function playerLabel(target: Player, room: RoomDoc): string {
  const player = room.players[target];
  if (player && player.name) return player.name;
  return `${target}P`;
}

function buildResult(room: RoomDoc, myColor: Player): { outcome: GameOutcome; message: string } {
  const reason: WinReason | null = room.winReason;

  if (reason === 'draw') {
    return { outcome: 'draw', message: '持ち駒がなくなりました' };
  }

  const iWon = room.winner === myColor;

  if (reason === 'resign') {
    return { outcome: iWon ? 'win' : 'lose', message: iWon ? '相手が投了しました' : '投了しました' };
  }

  return { outcome: iWon ? 'win' : 'lose', message: iWon ? 'あなたの勝利です！' : `${playerLabel(room.winner as Player, room)}の勝利です` };
}

// 待機画面〜対局画面〜結果表示までをFirestoreの購読1本で描画するオンライン対局画面
export function renderOnlineGameScreen(options: OnlineGameScreenOptions): OnlineGameScreenView {
  const { roomId, color, onLeave } = options;
  const opponentColor: Player = opponentOf(color);

  let selectedSize: Size | null = null;
  let latestRoom: RoomDoc | null = null;
  let resultShown = false;

  const wrapper = document.createElement('div');

  const roomInfo = document.createElement('p');
  roomInfo.className = 'online-room-info';
  roomInfo.textContent = `ルーム番号: ${roomId}`;
  wrapper.appendChild(roomInfo);

  const status = document.createElement('p');
  status.className = 'otrio-status';
  wrapper.appendChild(status);

  const layout = document.createElement('div');
  layout.className = 'otrio-layout';

  const opponentInventoryView = new InventoryView('対戦相手の持ち駒', null);
  const boardView = new BoardView((row, col) => handleCellClick(row, col), color);
  const myInventoryView = new InventoryView('あなたの持ち駒', (size) => handleSizeClick(size));

  layout.appendChild(opponentInventoryView.element);
  layout.appendChild(boardView.element);
  layout.appendChild(myInventoryView.element);
  wrapper.appendChild(layout);

  const resignButton = document.createElement('button');
  resignButton.type = 'button';
  resignButton.className = 'btn';
  resignButton.textContent = '投了する';
  resignButton.addEventListener('click', () => {
    if (!latestRoom || latestRoom.status !== 'playing') return;
    resignRoom(roomId, color).catch((error) => console.error(error));
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
  wrapper.appendChild(actions);

  function handleSizeClick(size: Size): void {
    if (!latestRoom || latestRoom.status !== 'playing' || latestRoom.turn !== color) return;
    if (latestRoom.inventory[color][size] <= 0) return;
    selectedSize = selectedSize === size ? null : size;
    render();
  }

  function handleCellClick(row: number, col: number): void {
    if (!latestRoom || latestRoom.status !== 'playing' || latestRoom.turn !== color || !selectedSize) return;
    const isLegal = getLegalMoves(latestRoom).some((m) => m.row === row && m.col === col && m.size === selectedSize);
    if (!isLegal) return;

    const move: Move = { row, col, size: selectedSize };
    selectedSize = null;
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
      status.textContent = room.turn === color ? 'あなたの番です' : `${playerLabel(room.turn, room)}の番です`;
      return;
    }
    status.textContent = '';
  }

  function render(): void {
    if (!latestRoom) return;
    boardView.render(latestRoom);
    opponentInventoryView.render(latestRoom.inventory[opponentColor], null);
    myInventoryView.render(latestRoom.inventory[color], selectedSize);
    boardView.setInteractive(latestRoom.status === 'playing' && latestRoom.turn === color);
    resignButton.disabled = latestRoom.status !== 'playing';
    updateStatus(latestRoom);

    if (latestRoom.status === 'finished' && !resultShown) {
      resultShown = true;
      boardView.setInteractive(false);
      showResultBanner({
        container: wrapper,
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
