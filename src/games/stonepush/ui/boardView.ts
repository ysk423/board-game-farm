import { ALL_BOARD_POSITIONS, BOARD_COLOR_OF, BOARD_SIZE, type BoardPosition, type GameState, posKey, type Pos } from '../logic/board';

export type CellClickHandler = (boardPosition: BoardPosition, pos: Pos) => void;

export interface BoardHighlight {
  movable: ReadonlySet<string>; // "boardPosition-row-col" 形式。選択可能な石
  dimmedOwn: ReadonlySet<string>; // 動かせない自石（半透明。PASSIVE_SELECTのみ使用）
  selected: { boardPosition: BoardPosition; pos: Pos } | null; // 選択中の石
  destinations: ReadonlySet<string>; // 選択中の石の移動先候補
  dimmedBoards: ReadonlySet<BoardPosition>; // 現フェーズで使用できないボード（暗転）
}

function cellKey(bp: BoardPosition, pos: Pos): string {
  return `${bp}-${pos.row}-${pos.col}`;
}

// 2×2に並んだ4枚の4×4盤（計64マス）をまとめて扱う。盤面のDOMは一度だけ生成し、
// 以降はrender()でクラス付け替え・石の表示切り替えのみ行う
export class BoardView {
  readonly element: HTMLElement;
  private readonly boardEls: Record<BoardPosition, HTMLElement> = {} as Record<BoardPosition, HTMLElement>;
  private readonly cells = new Map<string, HTMLButtonElement>();
  private readonly stones = new Map<string, HTMLElement>();
  private interactive = true;

  constructor(onCellClick: CellClickHandler) {
    this.element = document.createElement('div');
    this.element.className = 'stonepush-boards';

    for (const bp of ALL_BOARD_POSITIONS) {
      const boardEl = document.createElement('div');
      boardEl.className = `stonepush-board stonepush-board--${BOARD_COLOR_OF[bp]}`;

      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const pos: Pos = { row, col };
          const cell = document.createElement('button');
          cell.type = 'button';
          cell.className = 'stonepush-cell';
          cell.addEventListener('click', () => {
            if (this.interactive) onCellClick(bp, pos);
          });

          const stone = document.createElement('span');
          stone.className = 'stonepush-stone';
          cell.appendChild(stone);

          boardEl.appendChild(cell);
          const key = cellKey(bp, pos);
          this.cells.set(key, cell);
          this.stones.set(key, stone);
        }
      }

      this.boardEls[bp] = boardEl;
      this.element.appendChild(boardEl);
    }
  }

  render(state: GameState, highlight: BoardHighlight): void {
    for (const bp of ALL_BOARD_POSITIONS) {
      this.boardEls[bp].classList.toggle('stonepush-board--dimmed', highlight.dimmedBoards.has(bp));
      const board = state.boards[bp];

      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const key = cellKey(bp, { row, col });
          const cellEl = this.cells.get(key);
          const stoneEl = this.stones.get(key);
          if (!cellEl || !stoneEl) continue;

          const owner = board.stones[posKey({ row, col })];
          stoneEl.className = 'stonepush-stone';
          if (owner) stoneEl.classList.add(`stonepush-stone--${owner}`);

          const isSelected =
            !!highlight.selected && highlight.selected.boardPosition === bp && highlight.selected.pos.row === row && highlight.selected.pos.col === col;

          cellEl.classList.toggle('stonepush-cell--movable', highlight.movable.has(key));
          cellEl.classList.toggle('stonepush-cell--dimmed', highlight.dimmedOwn.has(key));
          cellEl.classList.toggle('stonepush-cell--selected', isSelected);
          cellEl.classList.toggle('stonepush-cell--destination', highlight.destinations.has(key));
        }
      }
    }
  }

  setInteractive(enabled: boolean): void {
    this.interactive = enabled;
    this.element.classList.toggle('stonepush-boards--thinking', !enabled);
  }
}
