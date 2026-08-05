import { describe, expect, it } from 'vitest';
import type { GameState } from './board';
import { createInitialState } from './board';
import { applyMove, generateLegalMoves, isCheckmate, isInCheck } from './rules';
import type { Move } from './moveGenerator';

function emptyState(turn: 'sente' | 'gote' = 'sente'): GameState {
  return {
    board: Array.from({ length: 5 }, () => Array(5).fill(null)),
    hand: {
      sente: { HI: 0, KAKU: 0, GIN: 0, KIN: 0, FU: 0 },
      gote: { HI: 0, KAKU: 0, GIN: 0, KIN: 0, FU: 0 },
    },
    turn,
  };
}

describe('createInitialState', () => {
  it('初期局面ではどちらの玉も王手されていない', () => {
    const state = createInitialState();
    expect(isInCheck(state, 'sente')).toBe(false);
    expect(isInCheck(state, 'gote')).toBe(false);
  });

  it('初期局面の合法手が生成できる', () => {
    const state = createInitialState();
    const moves = generateLegalMoves(state);
    expect(moves.length).toBeGreaterThan(0);
  });
});

describe('二歩', () => {
  it('同じ筋に自分の歩が既にある場合は打てない', () => {
    const state = emptyState('sente');
    state.board[4][4] = { type: 'OU', owner: 'sente' };
    state.board[0][0] = { type: 'OU', owner: 'gote' };
    state.board[3][2] = { type: 'FU', owner: 'sente' }; // 3筋(col2)に自分の歩
    state.hand.sente.FU = 1;

    const moves = generateLegalMoves(state);
    const nifu = moves.some((m) => m.kind === 'drop' && m.pieceType === 'FU' && m.to[1] === 2);
    expect(nifu).toBe(false);
  });
});

describe('行き所のない駒（歩の最奥段打ち）', () => {
  it('先手が1段目(row0)に歩を打つことはできない', () => {
    const state = emptyState('sente');
    state.board[4][4] = { type: 'OU', owner: 'sente' };
    state.board[0][0] = { type: 'OU', owner: 'gote' };
    state.hand.sente.FU = 1;

    const moves = generateLegalMoves(state);
    const illegalDrop = moves.some((m) => m.kind === 'drop' && m.pieceType === 'FU' && m.to[0] === 0);
    expect(illegalDrop).toBe(false);
  });
});

describe('歩の成り強制', () => {
  it('最奥段に進む歩は成る手のみが合法手になる', () => {
    const state = emptyState('sente');
    state.board[4][4] = { type: 'OU', owner: 'sente' };
    state.board[0][4] = { type: 'OU', owner: 'gote' };
    state.board[1][0] = { type: 'FU', owner: 'sente' };

    const moves = generateLegalMoves(state);
    const pawnMoves = moves.filter((m) => m.kind === 'board' && m.from[0] === 1 && m.from[1] === 0);
    expect(pawnMoves).toHaveLength(1);
    expect(pawnMoves[0]).toMatchObject({ to: [0, 0], promote: true });
  });
});

describe('王手放置の禁止', () => {
  it('自玉が王手されたままになる手は合法手に含まれない', () => {
    const state = emptyState('sente');
    state.board[4][4] = { type: 'OU', owner: 'sente' };
    state.board[0][4] = { type: 'HI', owner: 'gote' }; // 竜列(4筋)に飛車で王手
    state.board[0][0] = { type: 'OU', owner: 'gote' };

    expect(isInCheck(state, 'sente')).toBe(true);

    const moves = generateLegalMoves(state);
    // 王が4筋から逃げない手（王手を放置する手）が含まれていないことを確認
    for (const move of moves) {
      const next = applyMove(state, move);
      expect(isInCheck(next, 'sente')).toBe(false);
    }
  });
});

describe('詰み判定', () => {
  it('金2枚で挟まれ逃げ場のない玉は詰みと判定される', () => {
    // 後手玉(0,0)を先手の金(1,0)(1,1)(0,1)で囲み、動ける場所も王手を防ぐ場所もない状態を作る
    const state = emptyState('gote');
    state.board[0][0] = { type: 'OU', owner: 'gote' };
    state.board[1][0] = { type: 'KIN', owner: 'sente' };
    state.board[1][1] = { type: 'KIN', owner: 'sente' };
    state.board[0][1] = { type: 'GIN', owner: 'sente' };
    state.board[4][4] = { type: 'OU', owner: 'sente' };

    expect(isInCheck(state, 'gote')).toBe(true);
    expect(isCheckmate(state)).toBe(true);
  });
});

describe('applyMove', () => {
  it('駒を取ると持ち駒に加わり、成駒は元の種類に戻る', () => {
    const state = emptyState('sente');
    state.board[4][4] = { type: 'OU', owner: 'sente' };
    state.board[0][0] = { type: 'OU', owner: 'gote' };
    state.board[2][2] = { type: 'RYU', owner: 'sente' };
    state.board[1][2] = { type: 'FU', owner: 'gote' };

    const move: Move = { kind: 'board', from: [2, 2], to: [1, 2], promote: false };
    const next = applyMove(state, move);
    expect(next.hand.sente.FU).toBe(1);
    expect(next.board[1][2]).toMatchObject({ type: 'RYU', owner: 'sente' });
  });
});
