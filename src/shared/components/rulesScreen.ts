export interface RulesSection {
  title: string;
  body: string[];
  /** ルールを図解するSVGマークアップ（任意）。currentColorでそのゲームのアクセントカラーに追従する */
  illustration?: string;
}

export interface RulesScreenOptions {
  gameName: string;
  sections: RulesSection[];
  onBack: () => void;
}

// 両ゲーム共通のルール説明画面。ゲームごとのルール文言だけを渡して使う
export function renderRulesScreen(options: RulesScreenOptions): HTMLElement {
  const section = document.createElement('section');
  section.className = 'card rules-screen';

  const title = document.createElement('h2');
  title.className = 'rules-screen__title';
  title.textContent = `${options.gameName}のルール`;
  section.appendChild(title);

  for (const rulesSection of options.sections) {
    const heading = document.createElement('h3');
    heading.className = 'rules-screen__section-title';
    heading.textContent = rulesSection.title;
    section.appendChild(heading);

    for (const paragraph of rulesSection.body) {
      const p = document.createElement('p');
      p.className = 'rules-screen__paragraph';
      p.textContent = paragraph;
      section.appendChild(p);
    }

    if (rulesSection.illustration) {
      const figure = document.createElement('div');
      figure.className = 'rules-illustration';
      figure.innerHTML = rulesSection.illustration;
      section.appendChild(figure);
    }
  }

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'btn rules-screen__back';
  backButton.textContent = '← 戻る';
  backButton.addEventListener('click', () => options.onBack());
  section.appendChild(backButton);

  return section;
}
