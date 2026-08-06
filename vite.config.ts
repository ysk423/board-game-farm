import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// GitHub Pages（プロジェクトサイト）配信を想定したbase pathとMulti-Page構成
export default defineConfig({
  base: '/board-game-farm/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        gomoku: resolve(__dirname, 'pages/gomoku.html'),
        gogoShogi: resolve(__dirname, 'pages/gogo-shogi.html'),
        tictactoe: resolve(__dirname, 'pages/tictactoe.html'),
        otrio: resolve(__dirname, 'pages/otrio.html'),
        yonmoku: resolve(__dirname, 'pages/yonmoku.html'),
        gobblet: resolve(__dirname, 'pages/gobblet.html'),
      },
    },
  },
});
