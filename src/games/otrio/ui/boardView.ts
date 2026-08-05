import { BOARD_SIZE, type GameState, type Player, SIZES } from '../logic/board';

export type CellClickHandler = (row: number, col: number) => void;

// 各マスに小・中・大3つの入れ子の四角形を重ねて描画する。盤面のDOMは一度だけ生成し、
// 以降はrender()でスロットの色分けだけを更新する
export class BoardView {
  readonly element: HTMLElement;
  private readonly slots = new Map<string, HTMLElement>();
  private interactive = true;
  private readonly viewer: Player;

  constructor(onCellClick: CellClickHandler, viewer: Player) {
    this.viewer = viewer;
    this.element = document.createElement('div');
    this.element.className = 'otrio-board';

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'otrio-cell';
        cell.addEventListener('click', () => {
          if (this.interactive) onCellClick(row, col);
        });

        for (const size of SIZES) {
          const slot = document.createElement('span');
          slot.className = `otrio-slot otrio-slot--${size}`;
          cell.appendChild(slot);
          this.slots.set(`${row}-${col}-${size}`, slot);
        }

        this.element.appendChild(cell);
      }
    }
  }

  render(state: GameState): void {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cellData = state.board[row][col];
        for (const size of SIZES) {
          const slot = this.slots.get(`${row}-${col}-${size}`);
          if (!slot) continue;
          const owner = cellData[size];
          slot.classList.toggle('otrio-slot--mine', owner === this.viewer);
          slot.classList.toggle('otrio-slot--opponent', owner !== null && owner !== this.viewer);
        }
      }
    }
  }

  setInteractive(enabled: boolean): void {
    this.interactive = enabled;
    this.element.classList.toggle('otrio-board--thinking', !enabled);
  }
}
