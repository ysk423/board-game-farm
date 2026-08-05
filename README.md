# ボードゲームファーム（仮称）

複数のミニボードゲームをCPU対戦で遊べるポータルサイト（Phase 1）。
詳細仕様は [`board_game_portal_requirements.md`](./board_game_portal_requirements.md) を参照。

## セットアップ

```bash
npm install
npm run dev       # 開発サーバ
npm run build     # 本番ビルド（dist/）
npm run preview   # 本番ビルドのプレビュー
npm run test      # ロジック層のユニットテスト（Vitest）
```

## デプロイ

`main` ブランチへのpushで `.github/workflows/deploy.yml` が自動実行され、GitHub Pagesへデプロイされる。
**初回のみ**、リポジトリの Settings → Pages → Source を「GitHub Actions」に設定する必要がある。

## 未確定事項・TODO

- サイトの正式名称（現在は仮称「ボードゲームファーム」のまま）
- 既存の五目並べ実装コードは `work/code` 配下に見つからなかったため、本プロジェクトでは五目並べも含め全ゲームを新規実装した
- Phase 2（オンライン対戦・Firebase Firestore導入）、Phase 3（新規ゲーム追加）は未着手
