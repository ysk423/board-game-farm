import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../shared/firebase';
import { renderHeader } from '../shared/components/header';
import { DIFFICULTY_LABELS, type Difficulty } from '../types/common';
import { GAME_TITLES, PLAY_RECORDS_COLLECTION, type GameId, type PlayRecord } from '../shared/playRecords';

const ALL_GAMES = Object.keys(GAME_TITLES) as GameId[];
const DIFFICULTIES = Object.keys(DIFFICULTY_LABELS) as Difficulty[];

// 直近500件のみ集計対象にする（無制限に読み込むとFirestoreの読み取り件数が際限なく増えるため）
const LOG_LIMIT = 500;

interface DifficultyStat {
  total: number;
  win: number;
  lose: number;
  draw: number;
}

interface GameSummary {
  cpuByDifficulty: Record<Difficulty, DifficultyStat>;
  onlineTotal: number;
  onlineSenteWin: number;
  onlineGoteWin: number;
  onlineDraw: number;
}

function createEmptyDifficultyStat(): DifficultyStat {
  return { total: 0, win: 0, lose: 0, draw: 0 };
}

function createEmptySummary(): GameSummary {
  return {
    cpuByDifficulty: Object.fromEntries(DIFFICULTIES.map((d) => [d, createEmptyDifficultyStat()])) as Record<Difficulty, DifficultyStat>,
    onlineTotal: 0,
    onlineSenteWin: 0,
    onlineGoteWin: 0,
    onlineDraw: 0,
  };
}

// ゴブレット・ゴブラーズ/オートリオは勝者ラベルが「先手/後手」ではなく「1P/2P」（部屋作成者が
// 自由に選べる役名）で記録される。ただしゲームロジック上1Pは必ず先手番として開始するため、
// 集計上は1P=先手・2P=後手とみなして他ゲームと合算する
function isSenteLabel(winnerLabel: string): boolean {
  return winnerLabel === '先手' || winnerLabel === '1P';
}

function sumDifficultyStats(summary: GameSummary): DifficultyStat {
  return DIFFICULTIES.reduce((acc, difficulty) => {
    const stat = summary.cpuByDifficulty[difficulty];
    return {
      total: acc.total + stat.total,
      win: acc.win + stat.win,
      lose: acc.lose + stat.lose,
      draw: acc.draw + stat.draw,
    };
  }, createEmptyDifficultyStat());
}

function summarize(records: PlayRecord[]): Record<GameId, GameSummary> {
  const summaries = Object.fromEntries(ALL_GAMES.map((game) => [game, createEmptySummary()])) as Record<GameId, GameSummary>;

  for (const record of records) {
    const summary = summaries[record.game];
    if (record.mode === 'cpu') {
      const stat = summary.cpuByDifficulty[record.difficulty];
      stat.total++;
      if (record.outcome === 'win') stat.win++;
      else if (record.outcome === 'lose') stat.lose++;
      else stat.draw++;
    } else {
      summary.onlineTotal++;
      if (record.winnerLabel === null) {
        summary.onlineDraw++;
      } else if (isSenteLabel(record.winnerLabel)) {
        summary.onlineSenteWin++;
      } else {
        summary.onlineGoteWin++;
      }
    }
  }

  return summaries;
}

function formatCpuStatCell(stat: DifficultyStat): string {
  if (stat.total === 0) return '記録なし';
  const parts = [`${stat.win}勝${stat.lose}敗`];
  if (stat.draw > 0) parts.push(`${stat.draw}分`);
  return parts.join('');
}

function appendOnlineCells(row: HTMLTableRowElement, summary: GameSummary): void {
  if (summary.onlineTotal === 0) {
    const emptyCell = document.createElement('td');
    emptyCell.className = 'history-table__col-divider history-table__empty';
    emptyCell.colSpan = 2;
    emptyCell.textContent = '記録なし';
    row.appendChild(emptyCell);
    return;
  }

  const senteCell = document.createElement('td');
  senteCell.className = 'history-table__col-divider history-table__win history-table__win--sente';
  senteCell.textContent = `${summary.onlineSenteWin}勝`;
  row.appendChild(senteCell);

  const goteCell = document.createElement('td');
  goteCell.className = 'history-table__win history-table__win--gote';
  goteCell.textContent = `${summary.onlineGoteWin}勝`;
  if (summary.onlineDraw > 0) {
    const drawNote = document.createElement('span');
    drawNote.className = 'history-table__draw-note';
    drawNote.textContent = ` ・分${summary.onlineDraw}`;
    goteCell.appendChild(drawNote);
  }
  row.appendChild(goteCell);
}

function renderSummaryTable(records: PlayRecord[]): HTMLElement {
  const summaries = summarize(records);

  const table = document.createElement('table');
  table.className = 'history-table';

  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th rowspan="2">ゲーム</th>
      <th colspan="4" class="history-table__group">CPU対戦</th>
      <th colspan="2" class="history-table__group history-table__group--online history-table__col-divider">オンライン対戦</th>
    </tr>
    <tr>
      ${DIFFICULTIES.map((d) => `<th>${DIFFICULTY_LABELS[d]}</th>`).join('')}
      <th>Total</th>
      <th class="history-table__col-divider">先手</th>
      <th>後手</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const game of ALL_GAMES) {
    const summary = summaries[game];
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    nameCell.textContent = GAME_TITLES[game];
    row.appendChild(nameCell);

    for (const difficulty of DIFFICULTIES) {
      const cell = document.createElement('td');
      cell.textContent = formatCpuStatCell(summary.cpuByDifficulty[difficulty]);
      row.appendChild(cell);
    }

    const totalCell = document.createElement('td');
    totalCell.className = 'history-table__total';
    totalCell.textContent = formatCpuStatCell(sumDifficultyStats(summary));
    row.appendChild(totalCell);

    appendOnlineCells(row, summary);

    tbody.appendChild(row);
  }
  table.appendChild(tbody);

  const wrap = document.createElement('div');
  wrap.className = 'history-table-wrap';
  wrap.appendChild(table);
  return wrap;
}

function formatModeCell(record: PlayRecord): string {
  return record.mode === 'cpu' ? `CPU対戦（${DIFFICULTY_LABELS[record.difficulty]}）` : 'オンライン対戦';
}

function formatResultCell(record: PlayRecord): string {
  if (record.mode === 'cpu') {
    return record.outcome === 'win' ? '勝ち' : record.outcome === 'lose' ? '負け' : '引き分け';
  }
  return record.winnerLabel ? `${record.winnerLabel}の勝ち` : '引き分け';
}

function renderLogTable(records: PlayRecord[]): HTMLElement {
  const table = document.createElement('table');
  table.className = 'history-table';

  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>日時</th><th>ゲーム</th><th>形式</th><th>結果</th></tr>';
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const record of records) {
    const row = document.createElement('tr');

    const dateCell = document.createElement('td');
    dateCell.textContent = record.playedAt.toDate().toLocaleString('ja-JP');
    row.appendChild(dateCell);

    const gameCell = document.createElement('td');
    gameCell.textContent = GAME_TITLES[record.game];
    row.appendChild(gameCell);

    const modeCell = document.createElement('td');
    modeCell.textContent = formatModeCell(record);
    row.appendChild(modeCell);

    const resultCell = document.createElement('td');
    resultCell.textContent = formatResultCell(record);
    row.appendChild(resultCell);

    tbody.appendChild(row);
  }
  table.appendChild(tbody);

  const wrap = document.createElement('div');
  wrap.className = 'history-table-wrap';
  wrap.appendChild(table);
  return wrap;
}

async function main(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) return;

  app.appendChild(renderHeader({ gameTitle: 'プレイ記録' }));

  const container = document.createElement('div');
  container.className = 'container';

  const hero = document.createElement('div');
  hero.className = 'portal-hero';
  hero.innerHTML = `
    <h1 class="portal-hero__title">プレイ記録</h1>
    <p class="portal-hero__subtitle">全ゲーム共通のプレイ結果を集計・一覧表示します（直近${LOG_LIMIT}件）</p>
  `;
  container.appendChild(hero);

  const loading = document.createElement('p');
  loading.textContent = '読み込み中…';
  container.appendChild(loading);
  app.appendChild(container);

  const snapshot = await getDocs(query(collection(db, PLAY_RECORDS_COLLECTION), orderBy('playedAt', 'desc'), limit(LOG_LIMIT)));
  const records = snapshot.docs.map((docSnap) => docSnap.data() as PlayRecord);

  loading.remove();

  const summaryTitle = document.createElement('h2');
  summaryTitle.className = 'rules-screen__section-title';
  summaryTitle.textContent = 'サマリ';
  container.appendChild(summaryTitle);
  container.appendChild(renderSummaryTable(records));

  const logTitle = document.createElement('h2');
  logTitle.className = 'rules-screen__section-title';
  logTitle.textContent = 'ログ';
  container.appendChild(logTitle);

  if (records.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'portal-hero__subtitle';
    empty.textContent = 'まだプレイ記録がありません。';
    container.appendChild(empty);
  } else {
    container.appendChild(renderLogTable(records));
  }
}

main();
