export type ReactionSide = 'own' | 'opponent';

export interface ReactionPanelOptions {
  onSend: (emoji: string) => void;
}

export interface ReactionPanelView {
  control: HTMLElement; // 「スタンプ」ボタン＋パレット。actionsのボタン列に追加する
  opponentZone: HTMLElement; // 相手が送ったスタンプの表示先。盤面より上（相手側）に配置する
  ownZone: HTMLElement; // 自分が送ったスタンプの表示先。操作ボタン付近（手前側）に配置する
  showReaction: (side: ReactionSide, emoji: string) => void;
  setEnabled: (enabled: boolean) => void; // 対局中（status: 'playing'）以外では非表示にする
  dispose: () => void;
}

const REACTION_EMOJIS = ['👍', '😲', '😢', '😆', '🙏'];
const COOLDOWN_MS = 3000;
const DISPLAY_MS = 3000;

// オンライン対戦中に感情を伝えるスタンプ機能。Firestoreのroomドキュメントに乗せて配信するため
// 送信自体はroomService側のsendReaction()が担い、このコンポーネントはUIのみを持つ。
// 表示は「誰が送ったか」で自分側/相手側のゾーンを分け、3秒でフェードアウトして消える一過性演出
export function renderReactionPanel({ onSend }: ReactionPanelOptions): ReactionPanelView {
  const control = document.createElement('div');
  control.className = 'reaction-control';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn';
  button.textContent = 'スタンプ';
  control.appendChild(button);

  const palette = document.createElement('div');
  palette.className = 'reaction-palette';
  // CSS側で.reaction-paletteにdisplay:flexを指定しているため、hidden属性ではなくstyle.displayで
  // 開閉を制御する（hidden属性はUAスタイルの優先度が低く、クラスのdisplay指定に負けて機能しない）
  palette.style.display = 'none';
  for (const emoji of REACTION_EMOJIS) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'reaction-palette__item';
    item.textContent = emoji;
    item.addEventListener('click', () => {
      closePalette();
      startCooldown();
      onSend(emoji);
    });
    palette.appendChild(item);
  }
  control.appendChild(palette);

  button.addEventListener('click', () => {
    palette.style.display = palette.style.display === 'none' ? 'flex' : 'none';
  });

  function closePalette(): void {
    palette.style.display = 'none';
  }

  function onOutsideClick(event: MouseEvent): void {
    if (!control.contains(event.target as Node)) closePalette();
  }
  document.addEventListener('click', onOutsideClick);

  let cooldownTimer: number | undefined;
  function startCooldown(): void {
    button.disabled = true;
    window.clearTimeout(cooldownTimer);
    cooldownTimer = window.setTimeout(() => {
      button.disabled = false;
    }, COOLDOWN_MS);
  }

  const opponentZone = document.createElement('div');
  opponentZone.className = 'reaction-zone reaction-zone--opponent';

  const ownZone = document.createElement('div');
  ownZone.className = 'reaction-zone reaction-zone--own';

  const zoneTimers: Partial<Record<ReactionSide, number>> = {};

  function showReaction(side: ReactionSide, emoji: string): void {
    const zone = side === 'own' ? ownZone : opponentZone;
    zone.innerHTML = '';

    const bubble = document.createElement('span');
    bubble.className = 'reaction-bubble';
    bubble.textContent = emoji;
    zone.appendChild(bubble);

    window.clearTimeout(zoneTimers[side]);
    zoneTimers[side] = window.setTimeout(() => {
      bubble.remove();
    }, DISPLAY_MS);
  }

  function setEnabled(enabled: boolean): void {
    control.style.display = enabled ? '' : 'none';
    if (!enabled) closePalette();
  }

  function dispose(): void {
    document.removeEventListener('click', onOutsideClick);
    window.clearTimeout(cooldownTimer);
    window.clearTimeout(zoneTimers.own);
    window.clearTimeout(zoneTimers.opponent);
  }

  return { control, opponentZone, ownZone, showReaction, setEnabled, dispose };
}
