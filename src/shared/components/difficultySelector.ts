import { DIFFICULTY_LABELS, type Difficulty } from '../../types/common';

export interface DifficultySelectorOptions {
  gameName: string;
  onSelect: (difficulty: Difficulty) => void;
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

// 弱/中/強の共通難易度選択UI。選択されたら onSelect を呼ぶだけの単純な部品。
export function renderDifficultySelector(options: DifficultySelectorOptions): HTMLElement {
  const section = document.createElement('section');
  section.className = 'card difficulty-selector';

  const title = document.createElement('h2');
  title.className = 'difficulty-selector__title';
  title.textContent = `${options.gameName} - 難易度を選んでください`;
  section.appendChild(title);

  const buttonRow = document.createElement('div');
  buttonRow.className = 'difficulty-selector__buttons';

  for (const difficulty of DIFFICULTIES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-primary difficulty-selector__button';
    button.textContent = DIFFICULTY_LABELS[difficulty];
    button.addEventListener('click', () => options.onSelect(difficulty));
    buttonRow.appendChild(button);
  }

  section.appendChild(buttonRow);
  return section;
}
