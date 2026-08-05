import { BOARD_SIZE, type GameState } from '../logic/board';
import { getPieceLabel } from '../logic/pieces';

export type BoardClickHandler = (row: number, col: number) => void;

export interface BoardRenderOptions {
  selected?: [number, number] | null;
  highlights?: Array<readonly [number, number]>;
  lastMove?: [number, number] | null;
}

// 5x5と小さいためセルのDOMは一度だけ生成し、renderのたびに内容を書き換える
export class BoardView {
  readonly element: HTMLElement;
  private readonly cells: HTMLButtonElement[][];

  constructor(onCellClick: BoardClickHandler) {
    this.element = document.createElement('div');
    this.element.className = 'shogi-board';

    this.cells = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      const rowCells: HTMLButtonElement[] = [];
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'shogi-cell';
        cell.addEventListener('click', () => onCellClick(row, col));
        this.element.appendChild(cell);
        rowCells.push(cell);
      }
      this.cells.push(rowCells);
    }
  }

  render(state: GameState, options: BoardRenderOptions = {}): void {
    const { selected = null, highlights = [], lastMove = null } = options;

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cell = this.cells[row][col];
        const piece = state.board[row][col];

        cell.innerHTML = piece ? `<span class="shogi-piece">${getPieceLabel(piece)}</span>` : '';
        cell.classList.toggle('shogi-cell--sente', !!piece && piece.owner === 'sente');
        cell.classList.toggle('shogi-cell--gote', !!piece && piece.owner === 'gote');
        cell.classList.toggle('shogi-cell--selected', !!selected && selected[0] === row && selected[1] === col);
        cell.classList.toggle(
          'shogi-cell--highlight',
          highlights.some(([r, c]) => r === row && c === col),
        );
        cell.classList.toggle('shogi-cell--last', !!lastMove && lastMove[0] === row && lastMove[1] === col);
      }
    }
  }

  setInteractive(enabled: boolean): void {
    this.element.classList.toggle('shogi-board--thinking', !enabled);
  }
}
