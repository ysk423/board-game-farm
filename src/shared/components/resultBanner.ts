import type { GameResult } from '../../types/common';

export interface ResultBannerOptions {
  container: HTMLElement;
  result: GameResult;
  onReplay: () => void;
}

const OUTCOME_TITLES: Record<GameResult['outcome'], string> = {
  win: 'あなたの勝ちです！',
  lose: 'あなたの負けです',
  draw: '引き分けです',
};

// 対局結果バナー。全画面オーバーレイにはせず、呼び出し元のcontainerの先頭に挿入することで
// 盤面・持ち駒表示など最終局面を隠さないようにする
export function showResultBanner({ container, result, onReplay }: ResultBannerOptions): void {
  const banner = document.createElement('div');
  banner.className = `result-banner result-banner--${result.outcome}`;

  const text = document.createElement('div');
  text.className = 'result-banner__text';

  const title = document.createElement('p');
  title.className = 'result-banner__title';
  title.textContent = OUTCOME_TITLES[result.outcome];
  text.appendChild(title);

  const message = document.createElement('p');
  message.className = 'result-banner__message';
  message.textContent = result.message;
  text.appendChild(message);

  banner.appendChild(text);

  const actions = document.createElement('div');
  actions.className = 'result-banner__actions';

  const replayButton = document.createElement('button');
  replayButton.type = 'button';
  replayButton.className = 'btn btn-primary';
  replayButton.textContent = 'もう一度対局する';
  replayButton.addEventListener('click', () => {
    onReplay();
  });
  actions.appendChild(replayButton);

  const topLink = document.createElement('a');
  topLink.className = 'btn';
  // ゲームのHTMLはpages/配下にあり階層が異なるため、Viteのbase設定から解決される絶対パスを使う
  topLink.href = import.meta.env.BASE_URL;
  topLink.textContent = 'ポータルトップへ';
  actions.appendChild(topLink);

  banner.appendChild(actions);
  container.insertBefore(banner, container.firstChild);
}
