import type { RulesSection } from '../../../shared/components/rulesScreen';

// モード選択画面のルール説明と、対局中のルール確認ポップアップの両方から参照する単一の情報源
export const GAME_NAME = '五五将棋';

export const RULES_SECTIONS: RulesSection[] = [
  {
    title: '盤・駒',
    body: [
      '5×5マスの盤を使う、本将棋のミニチュア版です。桂馬・香車は使いません。',
      '駒の動き方は本将棋と同じです（王将/玉将は全方向1マス、飛車は縦横、角行は斜め、金将は前・斜め前・横・後、銀将は前・斜め前・斜め後、歩兵は前に1マス）。',
    ],
  },
  {
    title: '持ち駒',
    body: ['取った相手の駒は自分の持ち駒になり、自分の手番に空いているマスへ打つことができます。'],
  },
  {
    title: '成り',
    body: [
      '最も奥の1列（敵陣）に入る、またはそこから動く手を指した際に、その駒を成ることができます。',
      '王将・玉将・金将は成れません。飛車→竜王、角行→竜馬、銀将→成銀、歩兵→と金になります。',
    ],
    illustration: `
      <svg viewBox="0 0 160 90" fill="none">
        <line x1="16" y1="20" x2="16" y2="70" stroke="#383d48" stroke-width="1" />
        <line x1="144" y1="20" x2="144" y2="70" stroke="#383d48" stroke-width="1" />
        <polygon points="16,58 22,64 20,74 12,74 10,64" fill="currentColor" transform="translate(0,-4)" />
        <line x1="4" y1="30" x2="28" y2="30" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 3" />
        <path d="M40 45 Q 80 20 118 45" fill="none" stroke="#9aa0ac" stroke-width="1.8" stroke-linecap="round" />
        <polygon points="118,45 111,42 112,48" fill="#9aa0ac" />
        <polygon points="144,58 150,64 148,74 140,74 138,64" fill="none" stroke="currentColor" stroke-width="1.8" transform="translate(0,-4)" />
      </svg>
    `,
  },
  {
    title: '禁止事項',
    body: [
      '二歩（同じ筋に自分の歩を2枚にする手）は禁止です。',
      '打ち歩詰め（歩を打って詰ませる手）は禁止です。',
      '行き所のない駒を打つ・進める手（最奥段への歩打ちなど）は禁止です。',
    ],
  },
  {
    title: '勝敗',
    body: [
      '相手の玉を詰ませたら勝ちです。投了ボタンでも終局できます。',
      '同一局面が4回出現する千日手は先手の負けになります（ただし片方が王手をかけ続けていた場合はその側の負けになります）。',
    ],
  },
];
