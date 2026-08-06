import type { RulesSection } from '../../../shared/components/rulesScreen';

// モード選択画面のルール説明と、対局中のルール確認ポップアップの両方から参照する単一の情報源
export const GAME_NAME = 'ゴブレット・ゴブラーズ';

export const RULES_SECTIONS: RulesSection[] = [
  {
    title: '基本ルール',
    body: [
      '3×3マスの盤を使います。各プレイヤーは小・中・大の駒を2個ずつ、合計6個持っています。',
      '自分の手番には「持ち駒を新しく置く」か「盤上にある自分の駒を動かす」のどちらかを行います。',
    ],
  },
  {
    title: '被せるルール',
    body: [
      '駒は、空いているマスだけでなく、自分より小さい駒の上にも被せて置けます（相手の駒でも自分の駒でも構いません）。',
      '被せられた駒はその場に残ったまま隠れます。上の駒が動けば、また見えるようになります。',
    ],
    illustration: `
      <svg viewBox="0 0 160 90" fill="none">
        <g transform="translate(10,10)">
          <rect x="0" y="34" width="26" height="26" rx="3" fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-width="1.8" stroke-dasharray="3 3" />
          <rect x="8" y="42" width="10" height="10" rx="2" fill="none" stroke="#9aa0ac" stroke-width="1.4" />
        </g>
        <g transform="translate(96,4)">
          <rect x="4" y="10" width="18" height="18" rx="2" fill="none" stroke="#9aa0ac" stroke-width="1.6" />
          <rect x="0" y="6" width="26" height="26" rx="3" fill="currentColor" />
        </g>
        <path d="M30 54 Q 70 28 96 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        <polygon points="96,20 89,20 92,26" fill="currentColor" />
      </svg>
    `,
  },
  {
    title: '移動するルール',
    body: [
      '盤上にある自分の駒（一番上に見えている駒）は、空いているマスか自分より小さい駒の上へ動かせます。',
      '駒を動かすと、元のマスに他の駒が隠れていればそれが見えるようになります。',
    ],
  },
  {
    title: '勝利条件・引き分け',
    body: [
      '一番上に見えている自分の駒が、縦・横・斜めのいずれかに3つ並ぶと勝ちです（駒のサイズが揃っている必要はありません）。',
      '同じ局面が3回繰り返された場合は引き分けとします（本来のルールにはない、対局が終わらなくなることを防ぐための措置です）。',
    ],
  },
];
