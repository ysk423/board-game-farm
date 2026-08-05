# ローカル動作確認ガイド

開発中にローカル環境でこのプロジェクトを動かし、動作確認する手順をまとめる。全体の仕様は `Docs/spec.md`、設計は `Docs/design.md` を参照。

## セットアップ（初回のみ）

```bash
npm install
```

## 開発サーバーの起動

```bash
npm run dev
```

起動後、`http://localhost:5173/board-game-farm/` を開く。

- ポータルトップ（ゲーム一覧）
- `http://localhost:5173/board-game-farm/gomoku.html`（五目並べ）
- `http://localhost:5173/board-game-farm/gogo-shogi.html`（五五将棋）
- `http://localhost:5173/board-game-farm/tictactoe.html`（〇×ゲーム）
- `http://localhost:5173/board-game-farm/otrio.html`（オートリオ）
- `http://localhost:5173/board-game-farm/yonmoku.html`（四目並べ）
- `http://localhost:5173/board-game-farm/gobblet.html`（ゴブレット・ゴブラーズ）

## 本番ビルドの確認

GitHub Pages配信時と同じbase path（`/board-game-farm/`）での動作を確認する場合:

```bash
npm run build
npm run preview
```

`http://localhost:4173/board-game-farm/` で確認できる。

## テストの実行

ゲームロジック層（`src/games/*/logic/`）のユニットテスト。

```bash
npm run test
```

## CPU対戦の動作確認

各ゲームの画面で難易度（弱・中・強）を選んで対局する。CPU対戦はどのゲームもFirebaseを使わずブラウザ内で完結するため、`npm run dev` を起動するだけで確認できる。

## オンライン対戦の動作確認（Phase 2・6ゲーム共通の手順）

オンライン対戦はFirestore（プロジェクト: `board-game-farm`）を使って2人のプレイヤーの状態をリアルタイム同期する。ゲームごとに別コレクションを使う（五目並べ=`games`、五五将棋=`shogiGames`、〇×ゲーム=`tictactoeGames`、オートリオ=`otrioGames`、四目並べ=`yonmokuGames`、ゴブレット・ゴブラーズ=`gobbletGames`）が、実装・データモデルは別でもUIの操作感・確認手順は共通。**1人で確認する場合はブラウザタブを2つ（またはシークレットウィンドウ＋通常ウィンドウなど別セッション扱いになるもの）を開き、両方から同じゲームのページにアクセスして片方が先手側、もう片方が後手側として参加する。**

確認手順の例（`gomoku.html` の場合。他のゲームでも同じ流れ）:

1. タブA: 対象ページ → 「オンライン対戦」→ 名前を入力（未入力でも可）→「手番」「公開設定」をそれぞれ選び →「ルームを作成」
2. 表示されたルーム番号を確認（公開ルームならタブB側の一覧に自動的に表示される）
3. タブB: 対象ページ → 「オンライン対戦」→ 一覧から参加、またはルーム番号を入力して「参加する」（タブAが選ばなかった方の色に自動で入る）
4. 両タブが対局画面に切り替わり、交互に着手できることを確認（片方の手番中はもう片方の盤面はクリック不可になる）
5. 決着まで対局し、両タブに正しい結果バナーが表示されること、かつ最終盤面が結果バナーに隠されず完全に見えることを確認

追加で確認したい観点:

- 非公開ルームが公開ルーム一覧に出ないこと
- 対局中のルームに3つ目のタブから参加しようとすると「満員です」と表示されること
- 名前を入力しなかった場合、色や手番に応じた表示（「先手」「後手」等）になること
- （五五将棋のみ）駒を取った際に持ち駒が両タブに正しく反映されること、成りが必要な手を指した際に成り選択ポップアップが表示され選択結果が両タブに反映されること
- （オートリオのみ）持ち駒・盤面の駒の積み重ねが両タブに正しく反映されること、トリオ（同一マスに小中大が揃う）での勝利判定が機能すること
- （四目並べのみ）5連ではなく4連で決着すること
- （ゴブレット・ゴブラーズのみ）自分より小さい駒に被せて配置できること、盤上の自分の駒を選んで動かせること（移動元に隠れていた駒があれば現れること）、被せられて隠れた駒の色は勝敗判定に影響しないこと
- 投了ボタンで正しく決着すること（全ゲーム共通）

### Firebase側の設定・デプロイ

Firebase CLIは `devDependencies` の `firebase-tools` として導入済みなので、`npx firebase <command>` で実行できる。

```bash
# ログイン状態の確認
npx firebase login:list

# 現在のプロジェクト確認（.firebaserc で board-game-farm に固定済み）
npx firebase use

# Security Rules / インデックス定義を変更した場合はデプロイが必要
npx firebase deploy --only firestore:rules
npx firebase deploy --only firestore:indexes
```

`firestore.rules` / `firestore.indexes.json` を変更したときは、上記のデプロイを忘れず実行すること（ローカルのファイルを直しただけでは本番のFirestoreには反映されない）。

Firestoreの複合クエリ（例: 公開ルーム一覧の `visibility` + `status` + `createdAt` によるクエリ）を新たに追加した場合、対応するインデックスが存在しないと `failed-precondition: The query requires an index` というエラーがブラウザのコンソールに出る。エラーメッセージ中のリンクからインデックスを作成するか、`firestore.indexes.json` に定義を追記して `firebase deploy --only firestore:indexes` する。**インデックスの作成には数分かかる**（ビルド中は同じエラーが「currently building」という文言で表示され続ける）。

### ルームの有効期限（TTL）

放置ルームは作成から3時間で自動削除される想定（`expiresAt`フィールド）。TTLポリシー自体はFirebase CLIに専用コマンドがないため、Google Cloud Console（Firestore → TTLポリシー）で手動設定が必要。**`games`・`shogiGames`・`tictactoeGames`・`otrioGames`・`yonmokuGames`・`gobbletGames`の6コレクションすべて**に対して、フィールド`expiresAt`でTTLポリシーを設定すること。

## トラブルシューティング

- **公開ルーム一覧が「読み込み中…」のまま止まる**: ブラウザのDevToolsコンソールを確認。`failed-precondition` エラーが出ていれば上記のインデックス未作成/ビルド中が原因。
- **オンライン対戦で相手の着手が反映されない**: Firestoreの該当コレクション（`games`=五目並べ、`shogiGames`=五五将棋、`tictactoeGames`=〇×ゲーム、`otrioGames`=オートリオ、`yonmokuGames`=四目並べ、`gobbletGames`=ゴブレット・ゴブラーズ）の `{roomId}` ドキュメントをFirebase Consoleで直接確認し、`board` や `turn` が更新されているかを見ると切り分けやすい。
