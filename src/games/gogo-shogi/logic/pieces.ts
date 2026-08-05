export type Player = 'sente' | 'gote';

export type PieceType =
  | 'OU' // 王将(先手)/玉将(後手)
  | 'HI'
  | 'KAKU'
  | 'GIN'
  | 'KIN'
  | 'FU'
  | 'RYU' // 飛車の成り(竜王)
  | 'UMA' // 角行の成り(竜馬)
  | 'NARIGIN' // 銀将の成り(成銀)
  | 'TOKIN'; // 歩兵の成り(と金)

export interface Piece {
  type: PieceType;
  owner: Player;
}

/** 持ち駒になり得る駒種（成駒は取られると元の種類に戻る） */
export type HandPieceType = 'HI' | 'KAKU' | 'GIN' | 'KIN' | 'FU';

export function opponentOf(player: Player): Player {
  return player === 'sente' ? 'gote' : 'sente';
}

// 方向ベクトルは「先手にとっての前」を dr=-1 として定義する。
// 後手は getStepDirections 内で dr の符号を反転させて使う
// （どの駒も列方向は左右対称な定義になっているため dc の反転は不要）
const OU_DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];
const KIN_DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0],
];
const GIN_DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 1],
];
const FU_DIRS: ReadonlyArray<readonly [number, number]> = [[-1, 0]];
const DIAG_DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [-1, 1], [1, -1], [1, 1],
];
const ORTHO_DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
];

// 1マスだけ動ける方向（王・金・銀・歩・成銀・と金、および竜王/竜馬の追加分＝王将化した1マス移動）
const STEP_DIRS: Partial<Record<PieceType, ReadonlyArray<readonly [number, number]>>> = {
  OU: OU_DIRS,
  KIN: KIN_DIRS,
  GIN: GIN_DIRS,
  FU: FU_DIRS,
  TOKIN: KIN_DIRS,
  NARIGIN: KIN_DIRS,
  RYU: DIAG_DIRS, // 竜王: 飛車の動き＋斜め1マス
  UMA: ORTHO_DIRS, // 竜馬: 角行の動き＋縦横1マス
};

// 何マスでも動ける方向（飛車・角行・竜王・竜馬）
const SLIDE_DIRS: Partial<Record<PieceType, ReadonlyArray<readonly [number, number]>>> = {
  HI: ORTHO_DIRS,
  KAKU: DIAG_DIRS,
  RYU: ORTHO_DIRS,
  UMA: DIAG_DIRS,
};

export function getStepDirections(type: PieceType, owner: Player): ReadonlyArray<readonly [number, number]> {
  const dirs = STEP_DIRS[type];
  if (!dirs) return [];
  const sign = owner === 'sente' ? 1 : -1;
  return dirs.map(([dr, dc]) => [dr * sign, dc] as const);
}

export function getSlideDirections(type: PieceType): ReadonlyArray<readonly [number, number]> {
  return SLIDE_DIRS[type] ?? [];
}

const PROMOTION_MAP: Partial<Record<PieceType, PieceType>> = {
  HI: 'RYU',
  KAKU: 'UMA',
  GIN: 'NARIGIN',
  FU: 'TOKIN',
};
const DEMOTION_MAP: Partial<Record<PieceType, PieceType>> = {
  RYU: 'HI',
  UMA: 'KAKU',
  NARIGIN: 'GIN',
  TOKIN: 'FU',
};

/** 王将・玉将・金将は成れない */
export function isPromotable(type: PieceType): boolean {
  return type in PROMOTION_MAP;
}

export function promote(type: PieceType): PieceType {
  return PROMOTION_MAP[type] ?? type;
}

/** 駒を取ったときに持ち駒に加える元の種類（成駒は元の駒に戻って持ち駒になる） */
export function demote(type: PieceType): HandPieceType {
  return (DEMOTION_MAP[type] ?? type) as HandPieceType;
}

// AI評価用の駒の点数（目安。調整はここだけで完結する）
export const POINT_VALUE: Record<PieceType, number> = {
  FU: 1,
  GIN: 5,
  KIN: 6,
  KAKU: 8,
  HI: 10,
  TOKIN: 7,
  NARIGIN: 6,
  UMA: 12,
  RYU: 13,
  OU: 0, // 玉は評価値の合算には含めない（詰みで勝敗が決まるため）
};

const KANJI: Record<PieceType, string> = {
  OU: '王',
  HI: '飛',
  KAKU: '角',
  GIN: '銀',
  KIN: '金',
  FU: '歩',
  RYU: '竜',
  UMA: '馬',
  NARIGIN: '全',
  TOKIN: 'と',
};

export function getPieceLabel(piece: Piece): string {
  if (piece.type === 'OU' && piece.owner === 'gote') return '玉';
  return KANJI[piece.type];
}
