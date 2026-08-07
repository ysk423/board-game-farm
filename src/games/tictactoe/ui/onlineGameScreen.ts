import { renderReactionPanel } from '../../../shared/components/reactionPanel';
import { showResultBanner } from '../../../shared/components/resultBanner';
import { showRulesModal } from '../../../shared/components/rulesModal';
import type { GameOutcome } from '../../../types/common';
import { resign as resignRoom, sendReaction, subscribeToRoom, submitMove } from '../online/roomService';
import type { RoomDoc, StoneColor, WinReason } from '../online/types';
import { BoardView } from './boardView';
import { GAME_NAME, RULES_SECTIONS } from './rulesContent';

export interface OnlineGameScreenOptions {
  roomId: string;
  color: StoneColor;
  onLeave: () => void;
}

export interface OnlineGameScreenView {
  element: HTMLElement;
  dispose: () => void;
}

function colorLabel(target: StoneColor, room: RoomDoc): string {
  const player = room.players[target];
  if (player && player.name) return player.name;
  return target === 'maru' ? '先手' : '後手';
}

function buildResult(room: RoomDoc, myColor: StoneColor): { outcome: GameOutcome; message: string } {
  if (room.winner === 'draw') {
    return { outcome: 'draw', message: '引き分けです' };
  }
  const iWon = room.winner === myColor;
  const reason: WinReason | null = room.winReason;

  if (reason === 'resign') {
    return { outcome: iWon ? 'win' : 'lose', message: iWon ? '相手が投了しました' : '投了しました' };
  }

  const winnerColor = room.winner as StoneColor;
  return {
    outcome: iWon ? 'win' : 'lose',
    message: iWon ? 'あなたの3並び勝利です！' : `${colorLabel(winnerColor, room)}が3並びを揃えました`,
  };
}

// 待機画面〜対局画面〜結果表示までをFirestoreの購読1本で描画するオンライン対局画面
export function renderOnlineGameScreen(options: OnlineGameScreenOptions): OnlineGameScreenView {
  const { roomId, color, onLeave } = options;
  let resultShown = false;
  let latestRoom: RoomDoc | null = null;
  let lastReactionSentAt = 0;
  let reactionInitialized = false;

  const wrapper = document.createElement('div');

  const roomInfo = document.createElement('p');
  roomInfo.className = 'online-room-info';
  roomInfo.textContent = `ルーム番号: ${roomId}`;
  wrapper.appendChild(roomInfo);

  const status = document.createElement('p');
  status.className = 'tictactoe-status';
  wrapper.appendChild(status);

  const reactionPanel = renderReactionPanel({
    onSend: (emoji) => {
      sendReaction(roomId, color, emoji).catch((error) => console.error(error));
    },
  });
  wrapper.appendChild(reactionPanel.opponentZone);

  const boardView = new BoardView((row, col) => {
    if (!latestRoom || latestRoom.status !== 'playing' || latestRoom.turn !== color) return;
    if (latestRoom.board[row][col] !== 0) return;
    submitMove(roomId, row, col, color).catch((error) => {
      console.error(error);
    });
  });
  wrapper.appendChild(boardView.element);

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
  actions.className = 'tictactoe-actions';
  actions.appendChild(resignButton);
  actions.appendChild(reactionPanel.control);
  actions.appendChild(rulesButton);
  wrapper.appendChild(actions);
  wrapper.appendChild(reactionPanel.ownZone);

  function updateView(room: RoomDoc): void {
    latestRoom = room;
    boardView.render(room.board, null);
    resignButton.disabled = room.status !== 'playing';
    reactionPanel.setEnabled(room.status === 'playing');

    if (room.status === 'waiting') {
      status.textContent = 'ルーム番号を伝えて、対戦相手を待っています…';
      boardView.setInteractive(false);
      return;
    }

    const myTurn = room.turn === color;
    boardView.setInteractive(room.status === 'playing' && myTurn);

    if (room.status === 'playing') {
      status.textContent = myTurn ? 'あなたの番です' : `${colorLabel(room.turn, room)}の番です`;
      return;
    }

    if (room.status === 'finished' && !resultShown) {
      resultShown = true;
      status.textContent = '';
      showResultBanner({
        container: wrapper,
        result: buildResult(room, color),
        onReplay: onLeave,
      });
    }
  }

  // 初回スナップショットで既にreactionが入っていても再表示しないよう、初回はsentAtの基準値を記録するだけにする
  function handleReaction(room: RoomDoc): void {
    if (!reactionInitialized) {
      lastReactionSentAt = room.reaction?.sentAt ?? 0;
      reactionInitialized = true;
      return;
    }
    const reaction = room.reaction;
    if (reaction && reaction.sentAt > lastReactionSentAt) {
      lastReactionSentAt = reaction.sentAt;
      reactionPanel.showReaction(reaction.by === color ? 'own' : 'opponent', reaction.emoji);
    }
  }

  const unsubscribe = subscribeToRoom(roomId, (room) => {
    if (!room) {
      status.textContent = 'ルームが見つかりませんでした（削除された可能性があります）';
      boardView.setInteractive(false);
      return;
    }
    handleReaction(room);
    updateView(room);
  });

  return {
    element: wrapper,
    dispose: () => {
      unsubscribe();
      reactionPanel.dispose();
    },
  };
}
