import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Cloudflare Pages（ルート配信）を想定したbase pathとMulti-Page構成
export default defineConfig({
  base: '/',
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
        stonepush: resolve(__dirname, 'pages/stonepush.html'),
        history: resolve(__dirname, 'pages/history.html'),
      },
    },
  },
});
