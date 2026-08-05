import type { HandPieceType, Player } from '../logic/pieces';

export type HandClickHandler = (owner: Player, pieceType: HandPieceType) => void;

const HAND_TYPES: HandPieceType[] = ['HI', 'KAKU', 'GIN', 'KIN', 'FU'];
const HAND_LABEL: Record<HandPieceType, string> = { HI: '飛', KAKU: '角', GIN: '銀', KIN: '金', FU: '歩' };

export class HandView {
  readonly element: HTMLElement;
  private readonly labelEl: HTMLElement;
  private readonly buttons: Map<HandPieceType, HTMLButtonElement> = new Map();

  constructor(owner: Player, initialLabel: string, onClick: HandClickHandler) {
    this.element = document.createElement('div');
    this.element.className = `shogi-hand shogi-hand--${owner}`;

    this.labelEl = document.createElement('div');
    this.labelEl.className = 'shogi-hand__label';
    this.labelEl.textContent = initialLabel;
    this.element.appendChild(this.labelEl);

    const row = document.createElement('div');
    row.className = 'shogi-hand__pieces';
    for (const type of HAND_TYPES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'shogi-hand__piece';
      button.addEventListener('click', () => onClick(owner, type));
      row.appendChild(button);
      this.buttons.set(type, button);
    }
    this.element.appendChild(row);
  }

  setLabel(text: string): void {
    this.labelEl.textContent = text;
  }

  render(hand: Record<HandPieceType, number>, selected: HandPieceType | null): void {
    for (const [type, button] of this.buttons) {
      const count = hand[type];
      button.textContent = count > 0 ? `${HAND_LABEL[type]}×${count}` : HAND_LABEL[type];
      button.disabled = count <= 0;
      button.classList.toggle('shogi-hand__piece--selected', selected === type);
    }
  }
}
