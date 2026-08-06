import { describe, expect, it } from 'vitest';
import { createInitialState } from './board';
import { chooseCpuTurn } from './ai';
import { applyAggressiveMove, applyPassiveMove, legalAggressiveMoves, legalPassiveMoves } from './rules';

describe('chooseCpuTurn', () => {
  it.each(['easy', 'medium', 'hard'] as const)('%sいずれも初期局面から合法な手を返す', (difficulty) => {
    const state = createInitialState(difficulty);
    const turn = chooseCpuTurn(state);

    expect(legalPassiveMoves(state)).toContainEqual(turn.passiveMove);
    expect(legalAggressiveMoves(state, turn.passiveMove)).toContainEqual(turn.aggressiveMove);

    // 実際に適用してもエラーにならないこと
    const afterPassive = applyPassiveMove(state, turn.passiveMove);
    const afterAggressive = applyAggressiveMove(afterPassive, turn.aggressiveMove);
    expect(afterAggressive.phase === 'passiveSelect' || afterAggressive.phase === 'gameOver').toBe(true);
  });
});
