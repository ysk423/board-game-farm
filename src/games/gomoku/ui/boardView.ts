import { BLACK, BOARD_SIZE, type Board, WHITE } from '../logic/board';
import type { Move } from '../logic/ai';

export type CellClickHandler = (row: number, col: number) => void;

// 盤面のDOMはゲーム開始時に一度だけ生成し、以後は`render`でクラス付け替えのみ行う
// （225マス分のボタンを毎手作り直すのは無駄なため）
export class BoardView {
  readonly element: HTMLElement;
  private readonly cells: HTMLButtonElement[][];
  private interactive = true;

  constructor(onCellClick: CellClickHandler) {
    this.element = document.createElement('div');
    this.element.className = 'gomoku-board';

    this.cells = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      const rowCells: HTMLButtonElement[] = [];
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'gomoku-cell';
        cell.addEventListener('click', () => {
          if (this.interactive) onCellClick(row, col);
        });
        this.element.appendChild(cell);
        rowCells.push(cell);
      }
      this.cells.push(rowCells);
    }
  }

  render(board: Board, lastMove: Move | null): void {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cell = this.cells[row][col];
        const stone = board[row][col];
        cell.classList.toggle('gomoku-cell--black', stone === BLACK);
        cell.classList.toggle('gomoku-cell--white', stone === WHITE);
        cell.classList.toggle('gomoku-cell--last', !!lastMove && lastMove.row === row && lastMove.col === col);
        cell.disabled = stone !== 0;
      }
    }
  }

  setInteractive(enabled: boolean): void {
    this.interactive = enabled;
    this.element.classList.toggle('gomoku-board--thinking', !enabled);
  }
}
