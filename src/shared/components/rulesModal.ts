import type { RulesSection } from './rulesScreen';

export interface RulesModalOptions {
  gameName: string;
  sections: RulesSection[];
}

// 対局中でもルールを再確認できるよう、盤面・持ち駒の状態を保ったまま被さるポップアップで表示する。
// 五五将棋の成り選択ポップアップ（promotionPrompt.ts）と同じ.modal-overlayを流用しつつ、
// 長文のルール説明を収めるためスクロール可能な専用パネル（.rules-modal）を使う
export function showRulesModal({ gameName, sections }: RulesModalOptions): void {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const panel = document.createElement('div');
  panel.className = 'rules-modal';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'rules-modal__close';
  closeButton.setAttribute('aria-label', '閉じる');
  closeButton.textContent = '×';
  closeButton.addEventListener('click', close);
  panel.appendChild(closeButton);

  const title = document.createElement('h2');
  title.className = 'rules-screen__title';
  title.textContent = `${gameName}のルール`;
  panel.appendChild(title);

  for (const section of sections) {
    const heading = document.createElement('h3');
    heading.className = 'rules-screen__section-title';
    heading.textContent = section.title;
    panel.appendChild(heading);

    for (const paragraph of section.body) {
      const p = document.createElement('p');
      p.className = 'rules-screen__paragraph';
      p.textContent = paragraph;
      panel.appendChild(p);
    }
  }

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  document.addEventListener('keydown', onKeydown);

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') close();
  }

  function close(): void {
    document.removeEventListener('keydown', onKeydown);
    overlay.remove();
  }
}
