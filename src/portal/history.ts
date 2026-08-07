import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../shared/firebase';
import { renderHeader } from '../shared/components/header';
import { DIFFICULTY_LABELS } from '../types/common';
import { GAME_TITLES, PLAY_RECORDS_COLLECTION, type GameId, type PlayRecord } from '../shared/playRecords';

const ALL_GAMES = Object.keys(GAME_TITLES) as GameId[];

// 直近500件のみ集計対象にする（無制限に読み込むとFirestoreの読み取り件数が際限なく増えるため）
const LOG_LIMIT = 500;

interface GameSummary {
  cpuTotal: number;
  cpuWin: number;
  cpuLose: number;
  cpuDraw: number;
  onlineTotal: number;
  onlineDraw: number;
  onlineWinnerCounts: Map<string, number>;
}

function createEmptySummary(): GameSummary {
  return { cpuTotal: 0, cpuWin: 0, cpuLose: 0, cpuDraw: 0, onlineTotal: 0, onlineDraw: 0, onlineWinnerCounts: new Map() };
}

function summarize(records: PlayRecord[]): Record<GameId, GameSummary> {
  const summaries = Object.fromEntries(ALL_GAMES.map((game) => [game, createEmptySummary()])) as Record<GameId, GameSummary>;

  for (const record of records) {
    const summary = summaries[record.game];
    if (record.mode === 'cpu') {
      summary.cpuTotal++;
      if (record.outcome === 'win') summary.cpuWin++;
      else if (record.outcome === 'lose') summary.cpuLose++;
      else summary.cpuDraw++;
    } else {
      summary.onlineTotal++;
      if (record.winnerLabel === null) {
        summary.onlineDraw++;
      } else {
        summary.onlineWinnerCounts.set(record.winnerLabel, (summary.onlineWinnerCounts.get(record.winnerLabel) ?? 0) + 1);
      }
    }
  }

  return summaries;
}

function formatCpuCell(summary: GameSummary): string {
  if (summary.cpuTotal === 0) return '記録なし';
  const parts = [`${summary.cpuTotal}戦`, `${summary.cpuWin}勝${summary.cpuLose}敗`];
  if (summary.cpuDraw > 0) parts.push(`${summary.cpuDraw}分`);
  return parts.join(' ');
}

function formatOnlineCell(summary: GameSummary): string {
  if (summary.onlineTotal === 0) return '記録なし';
  const breakdown = [...summary.onlineWinnerCounts.entries()].map(([label, count]) => `${label}${count}`);
  if (summary.onlineDraw > 0) breakdown.push(`引き分け${summary.onlineDraw}`);
  return `${summary.onlineTotal}戦（${breakdown.join(' / ')}）`;
}

function renderSummaryTable(records: PlayRecord[]): HTMLElement {
  const summaries = summarize(records);

  const table = document.createElement('table');
  table.className = 'history-table';

  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>ゲーム</th><th>CPU対戦</th><th>オンライン対戦</th></tr>';
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const game of ALL_GAMES) {
    const summary = summaries[game];
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    nameCell.textContent = GAME_TITLES[game];
    row.appendChild(nameCell);

    const cpuCell = document.createElement('td');
    cpuCell.textContent = formatCpuCell(summary);
    row.appendChild(cpuCell);

    const onlineCell = document.createElement('td');
    onlineCell.textContent = formatOnlineCell(summary);
    row.appendChild(onlineCell);

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
