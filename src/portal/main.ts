import { renderHeader } from '../shared/components/header';

interface GameCardData {
  id: string;
  icon: string;
  title: string;
  description: string;
  href: string;
  accentVar: string;
}

// 今後ゲームが増えた場合はここに追加するだけでカードが増える
const GAMES: GameCardData[] = [
  {
    id: 'gomoku',
    icon: '⚫',
    title: '五目並べ',
    description: '15×15の盤で5つ石を並べたら勝ち。CPU対戦（弱・中・強）・オンライン対戦に対応。',
    href: './gomoku.html',
    accentVar: '--color-accent-gomoku',
  },
  {
    id: 'gogo-shogi',
    icon: '将',
    title: '五五将棋',
    description: '5×5マスのミニ将棋。持ち駒あり。CPU対戦（弱・中・強）・オンライン対戦に対応。',
    href: './gogo-shogi.html',
    accentVar: '--color-accent-gogo-shogi',
  },
];

function renderGameCard(game: GameCardData): HTMLElement {
  const card = document.createElement('a');
  card.className = 'card game-card';
  card.href = game.href;
  card.style.setProperty('--card-accent', `var(${game.accentVar})`);

  const icon = document.createElement('div');
  icon.className = 'game-card__icon';
  icon.textContent = game.icon;
  card.appendChild(icon);

  const title = document.createElement('h2');
  title.className = 'game-card__title';
  title.textContent = game.title;
  card.appendChild(title);

  const description = document.createElement('p');
  description.className = 'game-card__description';
  description.textContent = game.description;
  card.appendChild(description);

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
    <h1 class="portal-hero__title">遊びたいゲームを選んでください</h1>
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
