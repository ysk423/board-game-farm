export interface HeaderOptions {
  /** ゲーム画面の場合はゲーム名、ポータルトップの場合はundefined */
  gameTitle?: string;
}

// ポータル共通ヘッダー。ゲーム画面ではトップへ戻る導線を表示する。
export function renderHeader({ gameTitle }: HeaderOptions): HTMLElement {
  const header = document.createElement('header');
  header.className = 'site-header';

  // ゲームのHTMLは pages/ 配下にあり階層が異なるため、相対パスではなく
  // Viteのbase設定（'/'）から解決されるポータルトップの絶対パスを使う
  const portalTopUrl = import.meta.env.BASE_URL;

  const brand = document.createElement('a');
  brand.className = 'site-header__brand';
  brand.href = portalTopUrl;
  brand.textContent = '🌾 ボードゲームファーム';
  header.appendChild(brand);

  if (gameTitle) {
    const back = document.createElement('a');
    back.className = 'site-header__back';
    back.href = portalTopUrl;
    back.textContent = `← ${gameTitle} / ポータルトップへ`;
    header.appendChild(back);
  }

  return header;
}
