import { describe, expect, it } from 'vitest';
import {
  ALL_BOARD_POSITIONS,
  ALL_DIRECTIONS,
  createInitialState,
  type GameState,
  type Player,
  posKey,
} from './board';
import { applyAggressiveMove, legalAggressiveMoves, legalPassiveMoves } from './rules';

// 全マス空の状態から、テストごとに必要な石だけを手動で配置する
function emptyState(currentPlayer: Player = 'black'): GameState {
  const state = createInitialState('easy');
  for (const bp of ALL_BOARD_POSITIONS) state.boards[bp].stones = {};
  state.currentPlayer = currentPlayer;
  return state;
}

describe('legalAggressiveMoves（押し出し判定）', () => {
  it('相手の石を1個だけなら押し出せる', () => {
    const state = emptyState('black');
    state.boards.bottomLeft.stones[posKey({ row: 1, col: 1 })] = 'black';
    state.boards.bottomLeft.stones[posKey({ row: 1, col: 2 })] = 'white';

    const passiveMove = {
      boardPosition: 'bottomRight' as const, // dark。逆色(light)のbottomLeft/topRightが対象になる
      from: { row: 3, col: 0 },
      to: { row: 3, col: 1 },
      direction: { dr: 0, dc: 1 },
      steps: 1 as const,
    };
    const moves = legalAggressiveMoves(state, passiveMove);

    expect(moves).toContainEqual({
      boardPosition: 'bottomLeft',
      from: { row: 1, col: 1 },
      to: { row: 1, col: 2 },
      direction: { dr: 0, dc: 1 },
      steps: 1,
    });
  });

  it('相手の石が2個連続していると押し出せない', () => {
    const state = emptyState('black');
    state.boards.bottomLeft.stones[posKey({ row: 1, col: 0 })] = 'black';
    state.boards.bottomLeft.stones[posKey({ row: 1, col: 1 })] = 'white';
    state.boards.bottomLeft.stones[posKey({ row: 1, col: 2 })] = 'white';

    const passiveMove = {
      boardPosition: 'bottomRight' as const,
      from: { row: 3, col: 0 },
      to: { row: 3, col: 2 },
      direction: { dr: 0, dc: 1 },
      steps: 2 as const,
    };
    const moves = legalAggressiveMoves(state, passiveMove);

    expect(moves.some((m) => m.boardPosition === 'bottomLeft' && m.from.row === 1 && m.from.col === 0)).toBe(false);
  });

  it('押し出し先が盤外なら消滅として合法になる', () => {
    const state = emptyState('black');
    state.boards.bottomLeft.stones[posKey({ row: 1, col: 2 })] = 'black';
    state.boards.bottomLeft.stones[posKey({ row: 1, col: 3 })] = 'white'; // 盤端

    const passiveMove = {
      boardPosition: 'bottomRight' as const,
      from: { row: 3, col: 0 },
      to: { row: 3, col: 1 },
      direction: { dr: 0, dc: 1 },
      steps: 1 as const,
    };
    const moves = legalAggressiveMoves(state, passiveMove);

    expect(moves).toContainEqual({
      boardPosition: 'bottomLeft',
      from: { row: 1, col: 2 },
      to: { row: 1, col: 3 },
      direction: { dr: 0, dc: 1 },
      steps: 1,
    });
  });

  it('押し出し先のマスに別の石があれば2個同時押しになり不可', () => {
    const state = emptyState('black');
    state.boards.bottomLeft.stones[posKey({ row: 1, col: 0 })] = 'black';
    state.boards.bottomLeft.stones[posKey({ row: 1, col: 1 })] = 'white';
    state.boards.bottomLeft.stones[posKey({ row: 1, col: 2 })] = 'white'; // 押し出し先が占有済み

    const passiveMove = {
      boardPosition: 'bottomRight' as const,
      from: { row: 3, col: 0 },
      to: { row: 3, col: 1 },
      direction: { dr: 0, dc: 1 },
      steps: 1 as const,
    };
    const moves = legalAggressiveMoves(state, passiveMove);

    expect(moves.some((m) => m.boardPosition === 'bottomLeft' && m.from.row === 1 && m.from.col === 0)).toBe(false);
  });
});

describe('legalPassiveMoves（デッドエンドフィルタ）', () => {
  it('対応するアグレッシブ移動が1つも無いパッシブ移動は候補に出ない', () => {
    const state = emptyState('black');
    // bottomRight(dark)に黒を1個だけ配置。逆色(light)のbottomLeft/topRightには黒が1つも無いため、
    // このボードでのどのパッシブ移動も対応するアグレッシブ移動が存在しない
    state.boards.bottomRight.stones[posKey({ row: 2, col: 2 })] = 'black';

    expect(legalPassiveMoves(state)).toEqual([]);
  });

  it('逆色ボードに自分の石があれば合法なパッシブ移動が出る', () => {
    const state = emptyState('black');
    state.boards.bottomRight.stones[posKey({ row: 2, col: 2 })] = 'black';
    state.boards.bottomLeft.stones[posKey({ row: 0, col: 0 })] = 'black'; // 逆色(light)側に黒を配置

    expect(legalPassiveMoves(state).length).toBeGreaterThan(0);
  });
});

describe('applyAggressiveMove（勝敗判定）', () => {
  it('あるボードで相手の石が0個になれば勝利', () => {
    const state = emptyState('black');
    // 他3ボードは黒白どちらも0個にならないよう1個ずつ配置（勝敗判定の誤爆防止）
    for (const bp of ['topLeft', 'topRight', 'bottomLeft'] as const) {
      state.boards[bp].stones[posKey({ row: 0, col: 0 })] = 'white';
      state.boards[bp].stones[posKey({ row: 3, col: 3 })] = 'black';
    }
    // bottomRight: 黒が盤端の白を押し出せば白が消滅して0個になる
    state.boards.bottomRight.stones[posKey({ row: 1, col: 2 })] = 'black';
    state.boards.bottomRight.stones[posKey({ row: 1, col: 3 })] = 'white';

    const result = applyAggressiveMove(state, {
      boardPosition: 'bottomRight',
      from: { row: 1, col: 2 },
      to: { row: 1, col: 3 },
      direction: { dr: 0, dc: 1 },
      steps: 1,
    });

    expect(result.phase).toBe('gameOver');
    expect(result.winner).toBe('black');
  });

  it('次の手番に合法なパッシブ移動が1つも無ければ、その場で反則負けになる', () => {
    const state = emptyState('black');

    // 黒側ホームボード：誤爆防止に両色を配置しつつ、bottomRightに実際に動かす黒石を置く
    state.boards.bottomLeft.stones[posKey({ row: 0, col: 0 })] = 'white';
    state.boards.bottomLeft.stones[posKey({ row: 3, col: 3 })] = 'black';
    state.boards.bottomRight.stones[posKey({ row: 0, col: 0 })] = 'white';
    state.boards.bottomRight.stones[posKey({ row: 2, col: 0 })] = 'black';

    // 白側ホームボード（topLeft・topRight）：白を1個ずつ8方向とも黒で囲み、身動きできなくする
    for (const bp of ['topLeft', 'topRight'] as const) {
      state.boards[bp].stones[posKey({ row: 1, col: 1 })] = 'white';
      for (const dir of ALL_DIRECTIONS) {
        state.boards[bp].stones[posKey({ row: 1 + dir.dr, col: 1 + dir.dc })] = 'black';
      }
    }

    const result = applyAggressiveMove(state, {
      boardPosition: 'bottomRight',
      from: { row: 2, col: 0 },
      to: { row: 2, col: 1 },
      direction: { dr: 0, dc: 1 },
      steps: 1,
    });

    expect(result.phase).toBe('gameOver');
    expect(result.winner).toBe('black');
    expect(legalPassiveMoves({ ...result, currentPlayer: 'white' })).toEqual([]);
  });
});
