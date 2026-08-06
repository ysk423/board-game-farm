import type { RulesSection } from '../../../shared/components/rulesScreen';

// モード選択画面のルール説明と、対局中のルール確認ポップアップの両方から参照する単一の情報源
export const GAME_NAME = 'オートリオ';

export const RULES_SECTIONS: RulesSection[] = [
  {
    title: '基本ルール',
    body: [
      '3×3マスの盤を使い、各マスには小・中・大それぞれのサイズの駒を1つずつ重ねて置くことができます。',
      '各プレイヤーは小・中・大の駒を3個ずつ、合計9個持っています。自分の手番に、持ち駒の中から好きなサイズを選び、そのサイズがまだ空いているマスへ置きます。',
    ],
  },
  {
    title: '勝利条件',
    body: [
      '同じサイズの駒が縦・横・斜めのいずれかに3つ並ぶと勝ちです。',
      'また、1つのマスに自分の小・中・大の駒すべてが揃う（トリオ）と、それだけでも勝ちになります。',
    ],
    illustration: `
      <svg viewBox="0 0 160 90" fill="none">
        <g transform="translate(41,5)">
          <g stroke="#9aa0ac" stroke-opacity="0.5" stroke-width="1.4">
            <line x1="26" y1="0" x2="26" y2="78" />
            <line x1="52" y1="0" x2="52" y2="78" />
            <line x1="0" y1="26" x2="78" y2="26" />
            <line x1="0" y1="52" x2="78" y2="52" />
          </g>
          <g transform="translate(39,39)">
            <rect x="-11" y="-11" width="22" height="22" rx="3" fill="none" stroke="currentColor" stroke-width="2" />
            <rect x="-7" y="-7" width="14" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="2" />
            <rect x="-3" y="-3" width="6" height="6" rx="1.5" fill="currentColor" />
          </g>
        </g>
      </svg>
    `,
  },
  {
    title: '引き分け',
    body: ['両者の持ち駒がすべてなくなっても勝敗が決まらない場合は引き分けです。'],
  },
];
