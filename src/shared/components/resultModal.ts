import type { GameResult } from '../../types/common';

export interface ResultModalOptions {
  result: GameResult;
  onReplay: () => void;
}

const OUTCOME_TITLES: Record<GameResult['outcome'], string> = {
  win: 'あなたの勝ちです！',
  lose: 'あなたの負けです',
  draw: '引き分けです',
};

// 対局結果モーダル。「もう一度対局する」を押すと閉じてonReplayを呼ぶ（難易度選択に戻る想定）。
export function showResultModal({ result, onReplay }: ResultModalOptions): void {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const title = document.createElement('h2');
  title.className = 'modal__title';
  title.textContent = OUTCOME_TITLES[result.outcome];
  modal.appendChild(title);

  const message = document.createElement('p');
  message.className = 'modal__message';
  message.textContent = result.message;
  modal.appendChild(message);

  const actions = document.createElement('div');
  actions.className = 'modal__actions';

  const replayButton = document.createElement('button');
  replayButton.type = 'button';
  replayButton.className = 'btn btn-primary';
  replayButton.textContent = 'もう一度対局する';
  replayButton.addEventListener('click', () => {
    overlay.remove();
    onReplay();
  });
  actions.appendChild(replayButton);

  const topLink = document.createElement('a');
  topLink.className = 'btn';
  topLink.href = './index.html';
  topLink.textContent = 'ポータルトップへ';
  actions.appendChild(topLink);

  modal.appendChild(actions);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
