import { BOARD_SIZE, type Board, type Player, SIZES, topOf } from '../logic/board';

export type CellClickHandler = (row: number, col: number) => void;

export interface BoardHighlight {
  selected: { row: number; col: number } | null;
  legal: ReadonlySet<string>; // "row-col" 形式。現在選択中の持ち駒/盤上の駒を置ける・動かせるマス
}

// 各マスは小・中・大の駒をそれぞれ表す<span>を固定で持つ。一番上（現在有効）の駒は塗りつぶし、
// それより下に隠れている駒は線だけで描画することで、被せた後も何が隠れているか常に見えるようにする
// （盤面のDOMは一度だけ生成し、以降はrender()でクラス付け替え・表示切り替えのみ行う）
export class BoardView {
  readonly element: HTMLElement;
  private readonly cells: HTMLButtonElement[][];
  private readonly slots = new Map<string, HTMLElement>();
  private interactive = true;
  private readonly viewer: Player;

  constructor(onCellClick: CellClickHandler, viewer: Player) {
    this.viewer = viewer;
    this.element = document.createElement('div');
    this.element.className = 'gobblet-board';

    this.cells = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      const rowCells: HTMLButtonElement[] = [];
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'gobblet-cell';
        cell.addEventListener('click', () => {
          if (this.interactive) onCellClick(row, col);
        });

        for (const size of SIZES) {
          const slot = document.createElement('span');
          slot.className = `gobblet-piece gobblet-piece--${size}`;
          cell.appendChild(slot);
          this.slots.set(`${row}-${col}-${size}`, slot);
        }

        this.element.appendChild(cell);
        rowCells.push(cell);
      }
      this.cells.push(rowCells);
    }
  }

  render(board: Board, highlight: BoardHighlight): void {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cellEl = this.cells[row][col];
        const stack = board[row][col];
        const top = topOf(stack);

        for (const size of SIZES) {
          const slot = this.slots.get(`${row}-${col}-${size}`);
          if (!slot) continue;

          const piece = stack.find((p) => p.size === size) ?? null;
          slot.className = `gobblet-piece gobblet-piece--${size}`;
          if (piece) {
            slot.classList.add(piece.owner === this.viewer ? 'gobblet-piece--mine' : 'gobblet-piece--opponent');
            slot.classList.add(top && piece.size === top.size ? 'gobblet-piece--top' : 'gobblet-piece--hidden');
          }
        }

        const isSelected = !!highlight.selected && highlight.selected.row === row && highlight.selected.col === col;
        cellEl.classList.toggle('gobblet-cell--selected', isSelected);
        cellEl.classList.toggle('gobblet-cell--legal', highlight.legal.has(`${row}-${col}`));
      }
    }
  }

  setInteractive(enabled: boolean): void {
    this.interactive = enabled;
    this.element.classList.toggle('gobblet-board--thinking', !enabled);
  }
}
