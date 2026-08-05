# ボードゲームポータルサイト 設計書（現状版）

`Docs/spec.md` に記載の仕様を実現するための、実装済みアーキテクチャ・データモデル・アルゴリズムの解説。実装方針の意図（なぜこの設計にしたか）を中心に記載する。

---

## 1. アーキテクチャ方針

- **構成方式**: Vite の Multi-Page Application（MPA）構成。`index.html`（ポータルトップ）、`gomoku.html`、`gogo-shogi.html` の3エントリを `vite.config.ts` の `build.rollupOptions.input` に登録している。SPAルーティングを使わないことで、ゲームごとに必要なJSのみを読み込む軽量な構成にしている。
- **UI技術**: フレームワーク不使用のVanilla TypeScript。DOM操作は素の `document.createElement` 等で行う。依存を最小限にし、GitHub Pagesでの静的配信・軽量なゲームUIとの相性を優先した。
- **base path**: GitHub Pagesのプロジェクトサイト配信（`https://ysk423.github.io/board-game-farm/`）に合わせ、`vite.config.ts` で `base: '/board-game-farm/'` を設定している。

## 2. ディレクトリ構成

```
/
├─ index.html                 # ポータルトップ
├─ gomoku.html                # 五目並べのエントリHTML
├─ gogo-shogi.html            # 五五将棋のエントリHTML
├─ vite.config.ts             # base path・Multi-Page構成
├─ tsconfig.json
├─ vitest.config.ts
├─ package.json
├─ .github/workflows/deploy.yml   # main push時にGitHub Pagesへ自動デプロイ
├─ Docs/                      # 本ドキュメント一式
├─ src/
│  ├─ types/
│  │  └─ common.ts            # Difficulty, GameOutcome, GameResult など全ゲーム共通の型
│  ├─ shared/
│  │  ├─ components/          # header / difficultySelector / resultModal（DOMを組み立てて返す関数群）
│  │  └─ styles/theme.css     # デザイントークン（色・角丸・フォント）と共通UIパーツのCSS
│  ├─ portal/
│  │  ├─ main.ts              # トップページのゲームカード描画（配列駆動）
│  │  └─ portal.css
│  └─ games/
│     ├─ gomoku/
│     │  ├─ logic/            # board.ts / rules.ts / ai.ts（DOMに依存しない純粋なロジック）
│     │  └─ ui/                # boardView.ts / main.ts / gomoku.css（logicを使って画面を組み立てる）
│     └─ gogo-shogi/
│        ├─ logic/            # pieces.ts / board.ts / moveGenerator.ts / rules.ts / ai.ts
│        └─ ui/                # boardView.ts / handView.ts / main.ts / gogo-shogi.css
```

「ゲームごとにロジックを分離し、共通部分をshared化する」「logic層はDOM非依存の純粋関数群にし、ui層がそれを使って画面を組み立てる」という2つの方針を一貫させている。これによりロジック層はVitestで単体テストしやすく、UI層はlogic層のAPIを呼び出すだけのシンプルな構成になっている。

## 3. 共通基盤（shared / portal / types）

### types/common.ts
`Difficulty`（'easy' | 'medium' | 'hard'、表示ラベルは弱/中/強）、`GameOutcome`（'win' | 'lose' | 'draw'）、`GameResult` を定義。両ゲームで共通利用する。

### shared/components
DOM要素を組み立てて返す関数として実装（クラスではなく関数ベース）。
- `header.ts`: `renderHeader({ gameTitle? })` — ゲーム画面では戻り導線を追加表示。
- `difficultySelector.ts`: `renderDifficultySelector({ gameName, onSelect })` — 弱/中/強ボタンを描画し、選択時にコールバック。
- `resultModal.ts`: `showResultModal({ result, onReplay })` — オーバーレイ＋モーダルを`document.body`に直接追加し、「もう一度対局する」でコールバック、「ポータルトップへ」リンクを提供。

### shared/styles/theme.css
CSSカスタムプロパティでデザイントークンを定義（`--color-bg`, `--color-surface`, `--color-accent` 等）。各ゲームのCSSは `:root { --color-accent: var(--color-accent-gomoku); }` のように自身のアクセントカラーで上書きするだけで、`.btn-primary` 等の共通クラスが自動的にそのゲームの配色になる。

### portal/main.ts
`GameCardData[]` の配列にゲームを追加するだけでトップページのカード一覧に反映される設計（今後のゲーム追加を見据えた拡張性）。

## 4. 五目並べのロジック設計

### board.ts
`BOARD_SIZE = 15`。`Stone = 0 | 1 | 2`（空/黒/白）の2次元配列として盤面を表現。

### rules.ts
`checkWin(board, row, col)`: 直近に置いた石を起点に4方向（横・縦・斜め2種）を走査し5つ以上連続しているか判定。`isBoardFull`で引き分け判定。

### ai.ts
共通の評価関数を軸に3難易度を実装:
- **パターン評価**: 石を置いたときにできる連続数と両端の空き状況（開いているか塞がっているか）から `SCORE`（five=100000, openFour=10000, four=1000, openThree=500, three=100, openTwo=50, two=10, one=1）に基づきスコアリング。
- **候補手の絞り込み**: 既存の石から半径2マス以内のみを候補とし、15×15盤でも現実的な探索空間に抑制（`getCandidateCells`）。
- **弱**: 候補手の中から「即勝ち」「即阻止」を優先探索し、なければランダム。
- **中**: 候補手ごとに自分の攻撃スコア＋相手の防御スコア（0.9倍）を合算し、最大の手を選ぶ貪欲法。
- **強**: 中と同じ評価関数をベースに、ミニマックス＋αβ枝刈りで探索。`HARD_SEARCH_DEPTH = 4`、候補手は評価スコア上位 `HARD_BRANCH_LIMIT = 8` 手に絞って各ノードを展開。葉ノードは盤面全体の評価関数`evaluateBoard`（既存の全ラインを走査し、連の「先頭」でのみ加点することで重複計上を防止）で評価。

## 4.5 五目並べのオンライン対戦（Phase 2）

CPU対戦の`logic/`（`board.ts`, `rules.ts`）はそのまま再利用し、Firestore連携部分だけを`online/`ディレクトリに分離している。

### shared/firebase.ts
Firebase App / Firestoreインスタンスの初期化。SDK設定値（`apiKey`等）はクライアント公開前提のためハードコードしている。

### games/gomoku/online/types.ts
`RoomDoc`（Firestoreの`games/{roomId}`ドキュメントに対応するアプリ内表現。`board`は`Board`型＝2次元配列として扱う）、`RoomSummary`（ロビー一覧用）、`Visibility`, `StoneColor`, `JoinRoomResult`を定義。

### games/gomoku/online/roomService.ts
- `createRoom(playerName, visibility)`: 6文字のルーム番号（`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`から生成、紛らわしい文字を除外）を発行し、`games/{roomId}`を新規作成。`expiresAt`に作成時刻+3時間を設定（Firestore TTLポリシーでの自動削除に使う）。
- `joinRoom(roomId, playerName)`: `runTransaction`で「waiting状態か」「白が空いているか」を確認してから参加させる（満員・不存在をレースなく判定するため）。
- `subscribeToOpenRooms(callback)` / `subscribeToRoom(roomId, callback)`: `onSnapshot`によるリアルタイム購読。ロビーの公開ルーム一覧・対局画面の盤面同期の両方をこれで実現しており、ポーリングは行わない。
- `submitMove(roomId, row, col, color)`: `runTransaction`内で「手番か」「空きマスか」を再確認してから着手し、`checkWin`/`isBoardFull`（既存のgomoku/logic/rules.tsを再利用）で勝敗判定して`status`/`winner`/`turn`を同一トランザクションで更新する。Cloud Functions等のサーバーサイドロジックは持たない。

**Firestoreはネスト配列（配列の配列）を直接サポートしていない**ため、15×15の`Board`型をそのまま保存できない（`setDoc`が`Nested arrays are not supported`で失敗する）。そのため`roomService.ts`内に`toWireBoard`/`fromWireBoard`というシリアライズ関数を用意し、Firestoreへの書き込み時は225要素のフラット配列に変換し、読み込み時に2次元配列へ復元している。この変換は`roomService.ts`の中だけで完結させ、呼び出し側（UI層）は常に`Board`型として扱える。

### games/gomoku/ui/onlineScreen.ts / onlineGameScreen.ts
- `onlineScreen.ts`: ロビー画面（名前入力・公開/非公開ルーム作成・公開ルーム一覧・ルーム番号入力）。`subscribeToOpenRooms`のunsubscribe関数を`dispose`として呼び出し元に返す。
- `onlineGameScreen.ts`: 待機〜対局〜結果表示を1つの`subscribeToRoom`購読で処理する。既存の`BoardView`（CPU対戦と共通）をそのまま再利用し、`status`（waiting/playing/finished）に応じて表示を出し分ける。
- `ui/main.ts`側で`activeDispose`という単一の変数を持ち、画面遷移（モード選択⇄CPU対戦⇄オンライン対戦）のたびに前の画面のFirestore購読を解除してから新しい画面を描画する。これを怠るとタブを離れても購読が残り続け、無駄な読み取り課金や、存在しないDOMを更新しようとする空振り処理が発生するため。

### firestore.rules / firestore.indexes.json
認証なし・性善説ベースの簡易ルール（「今が誰の手番か」はルール側では判別できないため、手番制御はクライアントの自己申告に依存する）。最低限のガードとして、`board`が225要素の配列であること、`visibility`/`status`が想定値であること、`status`が`finished`になったドキュメントへの追加更新を禁止すること、を`firestore.rules`でチェックしている。

ロビーの公開ルーム一覧クエリ（`visibility`と`status`の等価条件2つ＋`createdAt`の`orderBy`）はFirestoreの複合インデックスを要求するため、`firestore.indexes.json`に定義してデプロイしている（未定義のままだとブラウザコンソールに`failed-precondition: The query requires an index`エラーが出る）。

## 5. 五五将棋のロジック設計

五目並べに比べてルールが複雑なため、責務を5ファイルに分割している。

### pieces.ts
駒種（`OU/HI/KAKU/GIN/KIN/FU` と成駒 `RYU/UMA/NARIGIN/TOKIN`）、方向ベクトル定義、成り/成り解除のマッピング、AI評価用の駒点数（`POINT_VALUE`: 歩1・銀5・金6・角8・飛10・と金7・成銀6・馬12・竜13）、表示用の漢字ラベル（後手の王将は「玉」と表示）を定義。

方向ベクトルは「先手にとっての前」を`dr=-1`として定義し、後手はdrの符号を反転して利用する（列方向はどの駒も左右対称のためdcの反転は不要、という盤面の点対称性を利用した簡略化）。

### board.ts
5×5の `BoardGrid`、持ち駒 `Hand`、`GameState { board, hand, turn }` を定義。`createInitialState()` で仕様書どおりの初期配置を生成。

### moveGenerator.ts
**幾何学的に可能な手**（疑似合法手）を生成する層。自玉が王手されたままになる手や打ち歩詰めは、あえてこの層ではフィルタしない（後述のrules.tsの責務にすることで、"王手されている自分の駒がどこを攻撃できるか"という判定と"それが最終的に合法か"という判定を分離している）。
- `getReachableSquares`: 1マス駒・スライド駒（飛車・角行・竜王・竜馬）の到達可能マスを計算。王手判定にも流用。
- `isSquareAttacked`: 指定マスが特定プレイヤーに攻撃されているかを判定（王手判定の基礎）。
- 二歩・行き所のない駒（最奥段への歩打ち）はこの層で静的にチェック可能なため、ここで除外。
- 歩が最奥段に進む手は成りを必須にする（`buildBoardMoveVariants`）。

### rules.ts
- `isInCheck`: 自玉の位置が相手に攻撃されているかを判定。
- `applyMove`: 手を適用した新しい `GameState` を返す（合法性の判定はしない、純粋な状態遷移関数）。
- `generateLegalMoves`: 疑似合法手を1つずつ`applyMove`でシミュレートし、「自玉が王手されたままになる手」を除外。さらに歩打ちについては、適用後に相手が詰みになるかを`isCheckmate`で判定し、打ち歩詰めとなる手を除外。
- `isCheckmate`: 王手されており、かつ合法手が0件であることで判定。
- `positionKey` / `checkRepetition`: 盤面・持ち駒・手番から局面キーを生成し、同一局面が4回出現した場合の千日手判定を行う。繰り返し区間内で片方の手番側の指し手が全て王手だった場合は「連続王手の千日手」としてその側の負け、そうでなければ五五将棋の慣例ルールどおり先手の負けとする（簡易実装である旨をコード内コメントに明記）。

### ai.ts
- **評価関数**: `evaluateMaterial`（盤上駒＋持ち駒の点数差）、`evaluateKingSafety`（玉周囲8マスのうち相手に利かされているマス数の差）、`evaluateMobility`（疑似合法手ベースの可動域数の差、盤面支配の簡易指標）を組み合わせ。
- **弱**: `generateLegalMoves`からランダム選択（王手放置や自玉を即座に取られる手は合法手生成の時点で除外済みのため追加実装不要）。
- **中**: 駒得＋玉安全度のみを使い、ネガマックス＋αβ枝刈りで`MEDIUM_DEPTH = 3`手読み。
- **強**: 駒得＋玉安全度＋可動域（盤面支配）を使い、`HARD_DEPTH = 4`手読み。着手前に現在の評価値が`RESIGN_THRESHOLD = -2500`を下回っていれば投了を選択。
- 探索の効率化として、着手候補は「捕獲した駒の価値×10＋成りボーナス」で降順に並べ替えてから探索することで、αβ枝刈りの効きを良くしている（`moveHeuristic` / `orderedLegalMoves`）。

## 5.5 五五将棋のオンライン対戦（Phase 2）

五目並べのオンライン対戦（4.5節）と同じ構成・同じ関数分割（`online/types.ts`, `online/roomService.ts`, `ui/onlineScreen.ts`, `ui/onlineGameScreen.ts`）を踏襲している。差分のみ記載する。

- **コレクション分離**: `shogiGames`という別コレクションを使う。五目並べの`games`とはスキーマ（`hand`, `history`, `winReason`等の有無）が大きく異なるため、`firestore.rules`・`firestore.indexes.json`ともに別ブロック/別インデックスとして定義している。
- **盤面のシリアライズ**: `BoardGrid`（`(Piece | null)[][]`、5x5）も5目並べと同じ理由（Firestoreのネスト配列非対応）で25要素にフラット化する。要素が数値でなくオブジェクト（`Piece | null`）になった以外は`toWireBoard`/`fromWireBoard`のロジックは同一パターン。
- **持ち駒（hand）**: `Record<Player, Record<HandPieceType, number>>`はネストしたオブジェクト（マップ）であり配列ではないため、Firestoreにそのまま保存できる。変換不要。
- **成り選択の共通化**: CPU対戦の`ui/main.ts`にあった`showPromotionPrompt`を`ui/promotionPrompt.ts`として切り出し、CPU対戦・オンライン対戦の両方から呼び出す形にリファクタした（成り選択のUIロジックはローカル/オンラインで完全に同一のため）。
- **`roomService.submitMove(roomId, move, color)`**: `runTransaction`内で「手番か」を確認した後、`applyMove`→`positionKey`/`isInCheck`で履歴エントリを1件作成→`checkRepetition`（千日手）→`isCheckmate`（詰み）の順に既存rules.tsの関数をそのまま呼び出して決着を判定し、`board`/`hand`/`turn`/`history`/`status`/`winner`/`winReason`を1回の`tx.update`で書き込む。これはCPU対戦の`ui/main.ts`にあった`recordHistoryAndCheckEnd`とほぼ同じロジックである（呼び出し場所がFirestoreトランザクションの中になっただけ）。
- **`roomService.resign(roomId, color)`**: 単純に`status: 'finished'`, `winner: 相手`, `winReason: 'resign'`を書き込むだけ。
- **結果表示**: `winReason`（`checkmate` / `resign` / `sennichite` / `perpetual-check`）ごとにメッセージを出し分ける`buildResult`関数を`onlineGameScreen.ts`に実装。CPU対戦の`endGame`が使っていたメッセージ文言をそのまま踏襲している。

### ルーム番号生成の共通化
五目並べ実装時は`roomService.ts`内にルーム番号生成ロジックを直接書いていたが、五五将棋でも全く同じロジックが必要になったため`src/shared/onlineRoomCode.ts`に`generateRoomId()`として抽出し、両ゲームの`roomService.ts`から利用する形にリファクタした。ロビー画面（`ui/onlineScreen.ts`）自体は五目並べ・五五将棋で内容がほぼ同一だが、型（`StoneColor`と`Player`など）が異なりゲームごとの`roomService`を直接呼ぶ薄いUIであるため、あえて共通化せず各ゲームディレクトリに個別実装している（無理な汎用化よりシンプルさを優先）。

## 6. UI層の設計パターン

両ゲームともUI層は以下の責務分担で統一している。
- `boardView.ts`: 盤面のDOM（ボタン要素）を初回に一度だけ生成し、以降は`render()`呼び出しでクラス付け替え・テキスト書き換えのみを行う（毎手DOMを作り直さない）。CPU対戦・オンライン対戦の両方から同じ`BoardView`/`HandView`を再利用する。
- `ui/main.ts`: モード選択（CPU対戦/オンライン対戦）→難易度選択→対局→結果モーダルの画面遷移、盤面クリックのハンドリング、CPU手番の遅延実行（`window.setTimeout`でUIの描画を挟んでから計算することで、思考中の表示が一瞬でも見えるようにしている）、勝敗判定後の`showResultModal`呼び出しを担当する「コントローラ」的な役割。オンライン対戦画面（Firestore購読を持つ）への遷移時は、`activeDispose`という単一の変数で前の画面の購読を解除してから次の画面を描画する（4.5節参照、五五将棋の`ui/main.ts`も同じパターン）。

五五将棋はさらに以下を管理する（CPU対戦は`ui/main.ts`、オンライン対戦は`ui/onlineGameScreen.ts`がそれぞれ独立して持つ。ロジックは同じだが状態の出どころ＝ローカルの`GameState`かFirestoreの`RoomDoc`か、が異なる）:
- 選択状態（盤上の駒を選択中／持ち駒を選択中／未選択）と、それに応じた合法手ハイライトの計算。
- 成り／不成りの両方が合法手として存在する場合の選択ポップアップ（`showPromotionPrompt`）表示。
- 千日手判定用の着手履歴（`HistoryEntry[]`）の記録と、`checkRepetition`の呼び出し（CPU対戦はローカル変数、オンライン対戦はFirestoreドキュメントの`history`フィールドとして保持）。

## 7. テスト戦略

Vitestでロジック層（`logic/*.ts`）のみを対象にユニットテストを作成している（UI層のE2Eテストは対象外）。

- 五目並べ: `rules.test.ts`（5連判定・引き分け判定）、`ai.test.ts`（弱/強AIの必勝手発見）
- 五五将棋: `rules.test.ts`（初期局面の王手なし判定、二歩、行き所のない駒、歩の成り強制、王手放置の禁止、詰み判定、`applyMove`の持ち駒変換）、`ai.test.ts`（各難易度が初期局面から合法手を返すスモークテスト、`checkRepetition`の千日手・連続王手判定）

特に五五将棋は「二歩」「打ち歩詰め」「行き所のない駒」「千日手の特殊ルール」など見落としやすいルールが多いため、実装時に個別のテストケースを用意して正しさを担保した。

## 8. ビルド・デプロイ構成

- `vite.config.ts`: `base: '/board-game-farm/'`、3エントリのMulti-Page構成。
- `.github/workflows/deploy.yml`: `main`ブランチへのpushをトリガーに、`npm ci` → `npm run build` → `actions/upload-pages-artifact` → `actions/deploy-pages` を実行。GitHub Pages側の設定（Settings → Pages → Source: GitHub Actions）は運用開始時に手動で1回設定済み。
- ブランチへのpushや Pull Request 作成だけではワークフローは実行されない（`main`へのpushのみがトリガー）。

## 9. 今後の拡張ポイント（Phase 3向けメモ）

五目並べ・五五将棋ともにオンライン対戦まで実装済み（Phase 2完了）。新規ゲームを追加する場合は `src/games/<game-id>/{logic,ui}` を追加し、`src/portal/main.ts` の `GAMES` 配列にカードを1件追加し、`vite.config.ts` の `rollupOptions.input` にHTMLエントリを追加すればよい。オンライン対戦まで追加する場合は、以下のパターンが2ゲーム分実証済みなのでそのまま踏襲できる:

- `shared/firebase.ts`（Firestore初期化）は共通利用し、`shared/onlineRoomCode.ts`（ルーム番号生成）も共通利用する。
- ゲーム固有の状態はそのゲーム専用のFirestoreコレクションに保存する（`games`, `shogiGames`のように分離）。
- 盤面が2次元配列の場合はFirestoreがネスト配列を扱えないため、`toWireBoard`/`fromWireBoard`パターンでフラット配列化する（4.5節・5.5節参照）。
- ロビー画面（`ui/onlineScreen.ts`）・対局画面（`ui/onlineGameScreen.ts`）はゲームごとに個別実装し、`ui/main.ts`側で`activeDispose`パターンによりFirestore購読のライフサイクルを管理する。
