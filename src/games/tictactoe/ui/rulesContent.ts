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
  },
  {
    title: '引き分け',
    body: ['盤面がすべて埋まっても勝敗が決まらない場合は引き分けです。'],
  },
];
