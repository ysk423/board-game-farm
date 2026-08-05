// 0/O/1/Iなど紛らわしい文字を除いたルーム番号用の文字集合
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;

// ゲーム間で共通のルーム番号生成（オンライン対戦の各ゲームのroomServiceから利用する）
export function generateRoomId(): string {
  let id = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    id += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return id;
}
