import { BOARD_SIZE, type Board, type Player, topOf } from '../logic/board';

export type CellClickHandler = (row: number, col: number) => void;

export interface BoardHighlight {
  selected: { row: number; col: number } | null;
  legal: ReadonlySet<string>; // "row-col" 形式。現在選択中の持ち駒/盤上の駒を置ける・動かせるマス
}

// 各マスは一番上に見えている駒だけを描画する（オートリオの入れ子3層描画とは異なり、
// 「被せると下の駒が隠れる」表現のため最上段のみ表示する）。
// 盤面のDOMは一度だけ生成し、以降はrender()でクラス付け替えのみ行う
export class BoardView {
  readonly element: HTMLElement;
  private readonly cells: HTMLButtonElement[][];
  private readonly pieces: HTMLElement[][];
  private interactive = true;
  private readonly viewer: Player;

  constructor(onCellClick: CellClickHandler, viewer: Player) {
    this.viewer = viewer;
    this.element = document.createElement('div');
    this.element.className = 'gobblet-board';

    this.cells = [];
    this.pieces = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      const rowCells: HTMLButtonElement[] = [];
      const rowPieces: HTMLElement[] = [];
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'gobblet-cell';
        cell.addEventListener('click', () => {
          if (this.interactive) onCellClick(row, col);
        });

        const piece = document.createElement('span');
        piece.className = 'gobblet-piece';
        cell.appendChild(piece);

        this.element.appendChild(cell);
        rowCells.push(cell);
        rowPieces.push(piece);
      }
      this.cells.push(rowCells);
      this.pieces.push(rowPieces);
    }
  }

  render(board: Board, highlight: BoardHighlight): void {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cellEl = this.cells[row][col];
        const pieceEl = this.pieces[row][col];
        const top = topOf(board[row][col]);

        pieceEl.className = 'gobblet-piece';
        if (top) {
          pieceEl.classList.add(`gobblet-piece--${top.size}`);
          pieceEl.classList.add(top.owner === this.viewer ? 'gobblet-piece--mine' : 'gobblet-piece--opponent');
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
