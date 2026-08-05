import type { Inventory, Size } from '../logic/board';

export type SizeClickHandler = (size: Size) => void;

const SIZES: Size[] = ['S', 'M', 'L'];
const SIZE_LABEL: Record<Size, string> = { S: '小', M: '中', L: '大' };

// 持ち駒（小・中・大）の表示。onClickを渡さない場合は常にクリック不可（相手側表示用）
// （オートリオのInventoryViewと同じ構成。Size/Inventoryの型がゲームごとに独立しているため個別実装している）
export class InventoryView {
  readonly element: HTMLElement;
  private readonly buttons = new Map<Size, HTMLButtonElement>();
  private readonly clickable: boolean;

  constructor(label: string, onClick: SizeClickHandler | null) {
    this.clickable = onClick !== null;

    this.element = document.createElement('div');
    this.element.className = 'gobblet-inventory';

    const labelEl = document.createElement('div');
    labelEl.className = 'gobblet-inventory__label';
    labelEl.textContent = label;
    this.element.appendChild(labelEl);

    const row = document.createElement('div');
    row.className = 'gobblet-inventory__pieces';
    for (const size of SIZES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gobblet-inventory__piece';
      if (onClick) {
        button.addEventListener('click', () => onClick(size));
      } else {
        button.disabled = true;
      }
      row.appendChild(button);
      this.buttons.set(size, button);
    }
    this.element.appendChild(row);
  }

  render(inventory: Inventory, selected: Size | null): void {
    for (const [size, button] of this.buttons) {
      const count = inventory[size];
      button.textContent = `${SIZE_LABEL[size]}×${count}`;
      if (this.clickable) {
        button.disabled = count <= 0;
      }
      button.classList.toggle('gobblet-inventory__piece--selected', selected === size);
    }
  }
}
