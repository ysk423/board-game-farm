import { renderHeader } from '../shared/components/header';

interface GameCardData {
  id: string;
  icon: string; // 盤面をモチーフにしたSVGマークアップ（currentColorでアクセントカラーに追従）
  title: string;
  description: string;
  href: string;
  accentVar: string;
  online: boolean;
}

const GRID_LINES = `
  <line x1="2" y1="6" x2="42" y2="6" />
  <line x1="2" y1="14" x2="42" y2="14" />
  <line x1="2" y1="22" x2="42" y2="22" />
  <line x1="2" y1="30" x2="42" y2="30" />
  <line x1="2" y1="38" x2="42" y2="38" />
  <line x1="6" y1="2" x2="6" y2="42" />
  <line x1="14" y1="2" x2="14" y2="42" />
  <line x1="22" y1="2" x2="22" y2="42" />
  <line x1="30" y1="2" x2="30" y2="42" />
  <line x1="38" y1="2" x2="38" y2="42" />
`;

const GOMOKU_ICON = `
  <svg viewBox="0 0 48 48" fill="none">
    <g stroke="var(--color-text-muted)" stroke-opacity="0.35" stroke-width="1">${GRID_LINES}</g>
    <g fill="currentColor">
      <circle cx="6" cy="6" r="3.4" />
      <circle cx="14" cy="14" r="3.4" />
      <circle cx="22" cy="22" r="3.4" />
      <circle cx="30" cy="30" r="3.4" />
      <circle cx="38" cy="38" r="3.4" />
    </g>
  </svg>
`;

const GOGO_SHOGI_ICON = `
  <svg viewBox="0 0 48 48" fill="none">
    <g stroke="var(--color-text-muted)" stroke-opacity="0.35" stroke-width="1">${GRID_LINES}</g>
    <polygon points="14,3 18.4,7 17,15 11,15 9.6,7" fill="currentColor" transform="translate(0,3)" />
    <polygon points="34,27 38.4,31 37,39 31,39 29.6,31" fill="none" stroke="currentColor" stroke-width="1.6" transform="translate(0,-4)" />
  </svg>
`;

const TICTACTOE_ICON = `
  <svg viewBox="0 0 48 48" fill="none">
    <g stroke="var(--color-text-muted)" stroke-opacity="0.45" stroke-width="2" stroke-linecap="round">
      <line x1="17" y1="4" x2="17" y2="44" />
      <line x1="31" y1="4" x2="31" y2="44" />
      <line x1="4" y1="17" x2="44" y2="17" />
      <line x1="4" y1="31" x2="44" y2="31" />
    </g>
    <circle cx="10.5" cy="10.5" r="4.6" fill="none" stroke="currentColor" stroke-width="2.4" />
    <circle cx="24" cy="24" r="4.6" fill="none" stroke="currentColor" stroke-width="2.4" />
    <circle cx="37.5" cy="37.5" r="4.6" fill="none" stroke="currentColor" stroke-width="2.4" />
    <g stroke="var(--color-text-muted)" stroke-width="2.4" stroke-linecap="round">
      <line x1="33.7" y1="6.8" x2="41.3" y2="14.2" />
      <line x1="41.3" y1="6.8" x2="33.7" y2="14.2" />
      <line x1="6.7" y1="33.8" x2="14.3" y2="41.2" />
      <line x1="14.3" y1="33.8" x2="6.7" y2="41.2" />
    </g>
  </svg>
`;

const OTRIO_ICON = `
  <svg viewBox="0 0 48 48" fill="none">
    <g stroke="var(--color-text-muted)" stroke-opacity="0.45" stroke-width="2" stroke-linecap="round">
      <line x1="17" y1="4" x2="17" y2="44" />
      <line x1="31" y1="4" x2="31" y2="44" />
      <line x1="4" y1="17" x2="44" y2="17" />
      <line x1="4" y1="31" x2="44" y2="31" />
    </g>
    <g transform="translate(24,24)">
      <rect x="-10" y="-10" width="20" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="2" />
      <rect x="-6.5" y="-6.5" width="13" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="2" />
      <rect x="-3" y="-3" width="6" height="6" rx="1.5" fill="currentColor" />
    </g>
    <rect x="6" y="6" width="7" height="7" rx="1.5" fill="none" stroke="var(--color-text-muted)" stroke-width="1.6" />
  </svg>
`;

const YONMOKU_ICON = `
  <svg viewBox="0 0 48 48" fill="none">
    <g stroke="var(--color-text-muted)" stroke-opacity="0.35" stroke-width="1">${GRID_LINES}</g>
    <g fill="currentColor">
      <circle cx="9" cy="9" r="3.6" />
      <circle cx="17" cy="17" r="3.6" />
      <circle cx="25" cy="25" r="3.6" />
      <circle cx="33" cy="33" r="3.6" />
    </g>
  </svg>
`;

// 「移動」（駒が別マスへ動く矢印）＋「被覆」（移動先で相手の小さい駒に被さる）の
// 2つの固有メカニクスを1アイコンに表現し、オートリオ（同心状に重ねる）と差別化している
const GOBBLET_ICON = `
  <svg viewBox="0 0 48 48" fill="none">
    <g stroke="var(--color-text-muted)" stroke-opacity="0.45" stroke-width="2" stroke-linecap="round">
      <line x1="17" y1="4" x2="17" y2="44" />
      <line x1="31" y1="4" x2="31" y2="44" />
      <line x1="4" y1="17" x2="44" y2="17" />
      <line x1="4" y1="31" x2="44" y2="31" />
    </g>
    <rect x="6" y="30" width="9" height="9" rx="2" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.8" stroke-dasharray="2 2" />
    <rect x="30" y="8" width="8" height="8" rx="2" fill="none" stroke="var(--color-text-muted)" stroke-opacity="0.7" stroke-width="1.6" />
    <rect x="27" y="5" width="13" height="13" rx="2.5" fill="currentColor" />
    <path d="M15 32 Q 24 22 28 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    <polygon points="28,15 23,16 25,20" fill="currentColor" />
  </svg>
`;

// 4枚の盤（2×2）を表す4つの正方形＋押し出しを示す黒石→矢印→白石のモチーフ
const STONEPUSH_ICON = `
  <svg viewBox="0 0 48 48" fill="none">
    <g stroke="var(--color-text-muted)" stroke-opacity="0.45" stroke-width="1.6">
      <rect x="4" y="4" width="17" height="17" rx="2" />
      <rect x="27" y="4" width="17" height="17" rx="2" />
      <rect x="4" y="27" width="17" height="17" rx="2" />
    </g>
    <rect x="27" y="27" width="17" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="1.6" />
    <circle cx="32" cy="35.5" r="3.2" fill="currentColor" />
    <circle cx="41" cy="35.5" r="3.2" fill="none" stroke="var(--color-text-muted)" stroke-width="1.6" />
    <path d="M36.5 35.5 H 41" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    <polygon points="41,35.5 38,33.7 38,37.3" fill="currentColor" />
  </svg>
`;

// 今後ゲームが増えた場合はここに追加するだけでカードが増える
const GAMES: GameCardData[] = [
  {
    id: 'gomoku',
    icon: GOMOKU_ICON,
    title: '五目並べ',
    description: '15×15の盤で5つ石を並べたら勝ち。',
    href: './pages/gomoku.html',
    accentVar: '--color-accent-gomoku',
    online: true,
  },
  {
    id: 'gogo-shogi',
    icon: GOGO_SHOGI_ICON,
    title: '五五将棋',
    description: '5×5マスのミニ将棋。持ち駒あり。',
    href: './pages/gogo-shogi.html',
    accentVar: '--color-accent-gogo-shogi',
    online: true,
  },
  {
    id: 'tictactoe',
    icon: TICTACTOE_ICON,
    title: '〇×ゲーム',
    description: '3×3の盤に〇×を交互に置き、3つ並べたら勝ち。',
    href: './pages/tictactoe.html',
    accentVar: '--color-accent-tictactoe',
    online: true,
  },
  {
    id: 'otrio',
    icon: OTRIO_ICON,
    title: 'オートリオ',
    description: '3×3の盤に小・中・大の駒を重ねて置く陣取りゲーム。',
    href: './pages/otrio.html',
    accentVar: '--color-accent-otrio',
    online: true,
  },
  {
    id: 'yonmoku',
    icon: YONMOKU_ICON,
    title: '四目並べ',
    description: '五目並べと同じ盤で、4つ石を並べたら勝ち。',
    href: './pages/yonmoku.html',
    accentVar: '--color-accent-yonmoku',
    online: true,
  },
  {
    id: 'gobblet',
    icon: GOBBLET_ICON,
    title: 'ゴブレット・ゴブラーズ',
    description: '駒を被せて相手を隠し、動かして入れ替える陣取りゲーム。',
    href: './pages/gobblet.html',
    accentVar: '--color-accent-gobblet',
    online: true,
  },
  {
    id: 'stonepush',
    icon: STONEPUSH_ICON,
    title: 'ストーンプッシュ',
    description: '2×2に並んだ4枚の盤で、石を動かして相手を押し出す陣取りゲーム。',
    href: './pages/stonepush.html',
    accentVar: '--color-accent-stonepush',
    online: false,
  },
];

function renderGameCard(game: GameCardData): HTMLElement {
  const card = document.createElement('a');
  card.className = 'card game-card';
  card.href = game.href;
  card.style.setProperty('--card-accent', `var(${game.accentVar})`);

  const icon = document.createElement('div');
  icon.className = 'game-card__icon';
  icon.innerHTML = game.icon;
  card.appendChild(icon);

  const title = document.createElement('h2');
  title.className = 'game-card__title';
  title.textContent = game.title;
  card.appendChild(title);

  const description = document.createElement('p');
  description.className = 'game-card__description';
  description.textContent = game.description;
  card.appendChild(description);

  const tags = document.createElement('div');
  tags.className = 'game-card__tags';

  const cpuTag = document.createElement('span');
  cpuTag.className = 'game-card__tag';
  cpuTag.textContent = 'CPU対戦';
  tags.appendChild(cpuTag);

  if (game.online) {
    const onlineTag = document.createElement('span');
    onlineTag.className = 'game-card__tag game-card__tag--online';
    onlineTag.textContent = 'オンライン対戦';
    tags.appendChild(onlineTag);
  }

  card.appendChild(tags);

  return card;
}

function main() {
  const app = document.getElementById('app');
  if (!app) return;

  app.appendChild(renderHeader({}));

  const container = document.createElement('div');
  container.className = 'container';

  const hero = document.createElement('div');
  hero.className = 'portal-hero';
  hero.innerHTML = `
    <h1 class="portal-hero__title">遊びたいゲームを選んでください！</h1>
    <a class="portal-hero__link" href="./pages/history.html">プレイ記録を見る →</a>
  `;
  container.appendChild(hero);

  const grid = document.createElement('div');
  grid.className = 'game-grid';
  for (const game of GAMES) {
    grid.appendChild(renderGameCard(game));
  }
  container.appendChild(grid);

  app.appendChild(container);
}

main();
