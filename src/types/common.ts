export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '弱',
  medium: '中',
  hard: '強',
};

export type GameOutcome = 'win' | 'lose' | 'draw';

export interface GameResult {
  outcome: GameOutcome;
  message: string;
}
