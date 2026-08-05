import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// GitHub Pages（プロジェクトサイト）配信を想定したbase pathとMulti-Page構成
export default defineConfig({
  base: '/board-game-farm/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        gomoku: resolve(__dirname, 'gomoku.html'),
        gogoShogi: resolve(__dirname, 'gogo-shogi.html'),
      },
    },
  },
});
