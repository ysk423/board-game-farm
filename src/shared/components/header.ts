export interface HeaderOptions {
  /** ゲーム画面の場合はゲーム名、ポータルトップの場合はundefined */
  gameTitle?: string;
}

// ポータル共通ヘッダー。ゲーム画面ではトップへ戻る導線を表示する。
export function renderHeader({ gameTitle }: HeaderOptions): HTMLElement {
  const header = document.createElement('header');
  header.className = 'site-header';

  const brand = document.createElement('a');
  brand.className = 'site-header__brand';
  brand.href = './index.html';
  brand.textContent = '🌾 ボードゲームファーム';
  header.appendChild(brand);

  if (gameTitle) {
    const back = document.createElement('a');
    back.className = 'site-header__back';
    back.href = './index.html';
    back.textContent = `← ${gameTitle} / ポータルトップへ`;
    header.appendChild(back);
  }

  return header;
}
