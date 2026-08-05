import { BOARD_SIZE, type GameState } from '../logic/board';
import { getPieceLabel, type Player } from '../logic/pieces';

export type BoardClickHandler = (row: number, col: number) => void;

export interface BoardRenderOptions {
  selected?: [number, number] | null;
  highlights?: Array<readonly [number, number]>;
  lastMove?: [number, number] | null;
}

// 5x5と小さいためセルのDOMは一度だけ生成し、renderのたびに内容を書き換える。
// DOMは常に論理座標(this.cells[row][col])で保持し、後手視点(perspective='gote')の場合は
// 表示上の並び順だけを反転させて生成する（render()やクリックハンドラは論理座標のまま扱えばよい）
export class BoardView {
  readonly element: HTMLElement;
  private readonly cells: HTMLButtonElement[][];
  private readonly perspective: Player;

  constructor(onCellClick: BoardClickHandler, perspective: Player = 'sente') {
    this.element = document.createElement('div');
    this.element.className = 'shogi-board';
    this.perspective = perspective;

    this.cells = Array.from({ length: BOARD_SIZE }, () => new Array<HTMLButtonElement>(BOARD_SIZE));

    for (let vr = 0; vr < BOARD_SIZE; vr++) {
      for (let vc = 0; vc < BOARD_SIZE; vc++) {
        const row = perspective === 'gote' ? BOARD_SIZE - 1 - vr : vr;
        const col = perspective === 'gote' ? BOARD_SIZE - 1 - vc : vc;

        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'shogi-cell';
        cell.addEventListener('click', () => onCellClick(row, col));
        this.element.appendChild(cell);
        this.cells[row][col] = cell;
      }
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
        cell.classList.toggle('shogi-cell--flipped-piece', !!piece && piece.owner !== this.perspective);
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
