import type { RulesSection } from '../../../shared/components/rulesScreen';

// モード選択画面のルール説明と、対局中のルール確認ポップアップの両方から参照する単一の情報源
export const GAME_NAME = '〇×ゲーム';

export const RULES_SECTIONS: RulesSection[] = [
  {
    title: '基本ルール',
    body: [
      '3×3マスの盤に、2人が交互に○と×を置いていきます。',
      '縦・横・斜めのいずれかの方向に、自分の記号を3つ連続して並べた方が勝ちです。',
    ],
    illustration: `
      <svg viewBox="0 0 160 90" fill="none">
        <g transform="translate(41,5)">
          <g stroke="#9aa0ac" stroke-opacity="0.6" stroke-width="1.6">
            <line x1="26" y1="0" x2="26" y2="78" />
            <line x1="52" y1="0" x2="52" y2="78" />
            <line x1="0" y1="26" x2="78" y2="26" />
            <line x1="0" y1="52" x2="78" y2="52" />
          </g>
          <circle cx="13" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2.4" />
          <circle cx="39" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2.4" />
          <circle cx="65" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2.4" />
          <g stroke="#e8eaed" stroke-width="2.2" stroke-linecap="round">
            <line x1="9" y1="35" x2="17" y2="43" />
            <line x1="17" y1="35" x2="9" y2="43" />
          </g>
          <g stroke="#e8eaed" stroke-width="2.2" stroke-linecap="round">
            <line x1="61" y1="61" x2="69" y2="69" />
            <line x1="69" y1="61" x2="61" y2="69" />
          </g>
          <line x1="6" y1="6" x2="72" y2="6" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3" />
        </g>
      </svg>
    `,
  },
  {
    title: '引き分け',
    body: ['盤面がすべて埋まっても勝敗が決まらない場合は引き分けです。'],
  },
];
