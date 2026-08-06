import type { RulesSection } from '../../../shared/components/rulesScreen';

// モード選択画面のルール説明と、対局中のルール確認ポップアップの両方から参照する単一の情報源
export const GAME_NAME = 'ストーンプッシュ';

export const RULES_SECTIONS: RulesSection[] = [
  {
    title: '盤面構成',
    body: [
      '4×4マスの盤が4枚、2×2に並んでいます。盤にはDARK（濃い色）とLIGHT（薄い色）の2色があり、対角の2枚が同じ色になっています。',
      '上段2枚が相手（白）のホームボード、下段2枚があなた（黒）のホームボードです。',
    ],
  },
  {
    title: 'ターンの流れ：リード',
    body: [
      '1回の手番で「リード」と「フォロー」を必ず両方行います。',
      'リードでは、自分のホームボード（下段2枚のどちらか）で自分の石を1つ選び、縦・横・斜めのいずれかへ1〜2マス動かします。経路上（1〜2マス目とも）に石があると、その方向には動かせません。',
    ],
  },
  {
    title: 'ターンの流れ：フォロー（押し出し）',
    body: [
      'フォローは、リードで使ったボードと逆の色のボードで行います。動かす方向・歩数はリードと同じに固定されるため、動かす石を選ぶだけで移動先が決まります。',
      '進路上に相手の石が1個だけあれば、その石をさらに1マス先へ押し出せます（2個以上連続では押し出せません）。押し出された石が盤の外に出ると、その石は消滅します。',
    ],
    illustration: `
      <svg viewBox="0 0 160 90" fill="none">
        <rect x="0" y="30" width="24" height="24" rx="4" fill="none" stroke="#383d48" stroke-width="1.4" />
        <rect x="26" y="30" width="24" height="24" rx="4" fill="none" stroke="#383d48" stroke-width="1.4" />
        <rect x="52" y="30" width="24" height="24" rx="4" fill="none" stroke="#383d48" stroke-width="1.4" stroke-dasharray="3 3" />
        <circle cx="12" cy="42" r="7" fill="#14161a" stroke="#4a4f5c" />
        <circle cx="38" cy="42" r="7" fill="#e8eaed" />
        <path d="M82 42 H 98" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        <polygon points="98,42 91,38 91,46" fill="currentColor" />
        <rect x="104" y="30" width="24" height="24" rx="4" fill="none" stroke="#383d48" stroke-width="1.4" />
        <rect x="130" y="30" width="24" height="24" rx="4" fill="none" stroke="#383d48" stroke-width="1.4" />
        <circle cx="116" cy="42" r="7" fill="#14161a" stroke="#4a4f5c" />
        <circle cx="142" cy="42" r="7" fill="#e8eaed" />
      </svg>
    `,
  },
  {
    title: '勝利条件',
    body: [
      '4枚の盤のうち、いずれか1枚から相手の石をすべて押し出せば勝ちです。',
      'リードできる石が1つも無くなった場合は、その時点で反則負けになります。',
    ],
  },
];
