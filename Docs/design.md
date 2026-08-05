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
├─ tictactoe.html             # 〇×ゲームのエントリHTML
├─ otrio.html                 # オートリオのエントリHTML
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
│  │  ├─ components/          # header / difficultySelector / resultBanner / rulesScreen（DOMを組み立てて返す関数群）
│  │  ├─ onlineRoomCode.ts    # ルーム番号生成（全オンライン対戦ゲーム共通）
│  │  ├─ firebase.ts          # Firebase App / Firestore初期化
│  │  └─ styles/theme.css     # デザイントークン（色・角丸・フォント）と共通UIパーツのCSS
│  ├─ portal/
│  │  ├─ main.ts              # トップページのゲームカード描画（配列駆動）
│  │  └─ portal.css
│  └─ games/
│     ├─ gomoku/
│     │  ├─ logic/            # board.ts / rules.ts / ai.ts（DOMに依存しない純粋なロジック）
│     │  ├─ online/            # types.ts / roomService.ts（Firestore連携。collection: games）
│     │  └─ ui/                # boardView.ts / main.ts / onlineScreen.ts / onlineGameScreen.ts / gomoku.css
│     ├─ gogo-shogi/
│     │  ├─ logic/            # pieces.ts / board.ts / moveGenerator.ts / rules.ts / ai.ts
│     │  ├─ online/            # types.ts / roomService.ts（collection: shogiGames）
│     │  └─ ui/                # boardView.ts / handView.ts / main.ts / onlineScreen.ts / onlineGameScreen.ts / promotionPrompt.ts / gogo-shogi.css
│     ├─ tictactoe/            # 〇×ゲーム（五目並べのlogic/uiとほぼ同型）
│     │  ├─ logic/
│     │  ├─ online/            # types.ts / roomService.ts（collection: tictactoeGames）
│     │  └─ ui/                # boardView.ts / main.ts / onlineScreen.ts / onlineGameScreen.ts
│     ├─ otrio/                 # オートリオ
│     │  ├─ logic/
│     │  ├─ online/            # types.ts / roomService.ts（collection: otrioGames）
│     │  └─ ui/                # boardView.ts / inventoryView.ts / main.ts / onlineScreen.ts / onlineGameScreen.ts / otrio.css
│     ├─ yonmoku/               # 四目並べ（gomokuのlogic/uiとほぼ同型、勝利条件のみ4連）
│     │  ├─ logic/
│     │  ├─ online/            # types.ts / roomService.ts（collection: yonmokuGames）
│     │  └─ ui/                # boardView.ts / main.ts / onlineScreen.ts / onlineGameScreen.ts / yonmoku.css
│     └─ gobblet/               # ゴブレット・ゴブラーズ
│        ├─ logic/
│        ├─ online/            # types.ts / roomService.ts（collection: gobbletGames）
│        └─ ui/                # boardView.ts / inventoryView.ts / main.ts / onlineScreen.ts / onlineGameScreen.ts / gobblet.css
```

「ゲームごとにロジックを分離し、共通部分をshared化する」「logic層はDOM非依存の純粋関数群にし、ui層がそれを使って画面を組み立てる」という2つの方針を一貫させている。これによりロジック層はVitestで単体テストしやすく、UI層はlogic層のAPIを呼び出すだけのシンプルな構成になっている。

## 3. 共通基盤（shared / portal / types）

### types/common.ts
`Difficulty`（'easy' | 'medium' | 'hard'、表示ラベルは弱/中/強）、`GameOutcome`（'win' | 'lose' | 'draw'）、`GameResult` を定義。両ゲームで共通利用する。

### shared/components
DOM要素を組み立てて返す関数として実装（クラスではなく関数ベース）。
- `header.ts`: `renderHeader({ gameTitle? })` — ゲーム画面では戻り導線を追加表示。
- `difficultySelector.ts`: `renderDifficultySelector({ gameName, onSelect })` — 弱/中/強ボタンを描画し、選択時にコールバック。
- `resultBanner.ts`: `showResultBanner({ container, result, onReplay })` — 呼び出し元が指定した`container`の先頭（`insertBefore(banner, container.firstChild)`）に結果バナーを挿入する。「もう一度対局する」でコールバック、「ポータルトップへ」リンクを提供。当初は`resultModal.ts`という名前で`document.body`に`position: fixed`のオーバーレイを追加する実装だったが、勝敗確定後に最終盤面が見えなくなる問題があったため、盤面を隠さない非モーダルのバナー方式にリネーム・再実装した（詳細は後述）。
- `rulesScreen.ts`: `renderRulesScreen({ gameName, sections, onBack })` — 各ゲームのルール説明画面を共通レイアウトで描画。

なお五五将棋の成り選択ポップアップ（`src/games/gogo-shogi/ui/promotionPrompt.ts`）は「選択を強制する」用途のブロッキングモーダルであるため、`resultBanner.ts`への変更後も`.modal-overlay`/`.modal`クラス（`document.body`への全画面オーバーレイ）を引き続き使用している。結果表示とは目的が異なるため、あえて統一しなかった。

### shared/styles/theme.css
CSSカスタムプロパティでデザイントークンを定義（`--color-bg`, `--color-surface`, `--color-accent` 等）。各ゲームのCSSは `:root { --color-accent: var(--color-accent-gomoku); }` のように自身のアクセントカラーで上書きするだけで、`.btn-primary` 等の共通クラスが自動的にそのゲームの配色になる。

### portal/main.ts
`GameCardData[]` の配列にゲームを追加するだけでトップページのカード一覧に反映される設計（今後のゲーム追加を見据えた拡張性）。

### オンライン対戦ロビー画面（`ui/onlineScreen.ts`）の「ルームを作成する」UI
全6ゲームで共通のDOM構造・CSSクラス（`online-panel*`）を使う設計だが、各ゲームディレクトリに個別実装している（型がゲームごとに異なる薄いUIのため、無理な共通コンポーネント化はしていない）。当初は「手番」トグルボタン列の直下に「公開ルームを作成」「非公開ルームを作成」という**即実行ボタン**を並べていたが、UXの見直しにより以下の構成に変更した（4.5節のgomokuの実装が基準形で、他5ゲームも同一パターン）。

- `creatorColor`（先手/後手など）と`visibility`（公開/非公開）を、どちらも同じ見た目の**選択トグル**として`online-panel__group`（`online-panel__group-label`のラベル付き）でグルーピングする。
- 実行は末尾の単一の「ルームを作成」ボタン（`online-panel__create-button`）でのみ行う。
- `theme.css`に`.online-panel__group`（`margin-top`でグループ間の縦間隔を確保）を追加し、複数の`.online-panel__buttons`を縦に並べたときに隙間なく密着して見えていた問題を解消した。

## 3.5 四目並べ・ゴブレット・ゴブラーズ追加時の設計判断

`Docs/todo-feature.md`の要望を受けて追加した2ゲーム。それぞれ既存ゲームの設計パターンを踏襲しつつ、以下の点だけ新規に設計した。

- **四目並べ**: 4.6節参照。五目並べの`logic/`をほぼそのまま複製し、`WIN_LENGTH`と評価関数の点数配分だけ変更した「最小差分の新規ゲーム」。
- **ゴブレット・ゴブラーズ**: 7.2節参照。「駒を被せる」「盤上の駒を動かす」という他ゲームにないメカニクスのため、`Cell`をスタック（`Piece[]`）として設計し、Firestore保存用のシリアライズも専用方式（27要素フラット配列）を新規に用意した。

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

## 4.6 四目並べのロジック設計・オンライン対戦

`Docs/todo-feature.md`の「五目並べと同じルールでいい」という要望どおり、五目並べの`logic/`（`board.ts`, `rules.ts`, `ai.ts`）をほぼそのまま複製した最小差分の新規ゲーム。

- **`board.ts`**: gomokuと完全に同一（`BOARD_SIZE = 15`, `Stone`型など）。
- **`rules.ts`**: `WIN_LENGTH`を`5`→`4`に変更するのみ。`checkWin`（直近着手起点で4方向走査）のロジックは変更なし。
- **`ai.ts`**: `SCORE`定数のパターン評価を4連基準に1段階シフトした（`four`が最高評価点、以下`openThree`/`three`/`openTwo`/`two`/`one`）。弱/中/強の3段階構成・候補手絞り込み（`CANDIDATE_RADIUS`）・ミニマックス+αβ（`HARD_SEARCH_DEPTH`/`HARD_BRANCH_LIMIT`）はgomokuと同じ値をそのまま踏襲。
- **オンライン対戦**: gomokuの`online/`・`ui/onlineScreen.ts`・`ui/onlineGameScreen.ts`をコレクション名（`yonmokuGames`）と`winReason`（`'four-in-a-row' | 'resign'`）だけ変えて複製。盤面のシリアライズ（`toWireBoard`/`fromWireBoard`、225要素フラット配列）も同一。

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

## 6. 〇×ゲームのロジック設計

五目並べの`logic/`とほぼ同型（サイズと定数名のみ変更）。`board.ts`は`BOARD_SIZE=3`、`Stone`は`MARU`(○/プレイヤー)/`BATSU`(×/CPU)。`rules.ts`の`checkWin`は五目並べと同じ4方向走査ロジックをそのまま流用している（`WIN_LENGTH=3`）。

`ai.ts`は3×3という状態空間の小ささを活かした設計:
- **弱**: 即勝ち・即阻止を優先し、なければランダム（五目並べと同じパターン）。
- **中**: 深さ2のミニマックス＋簡易評価関数（ライン内の自分の石の数に応じたスコア、相手の石が1つでも混ざっているラインは0点）でカットオフ。
- **強**: 深さ9（＝盤面を使い切るまで）のフルミニマックス＋αβ枝刈り。3×3は全探索が一瞬で終わるため事実上の完全読みになる。実装時にブラウザ上で最善手を指し続けて引き分けになることを確認済み。

## 6.1 〇×ゲームのオンライン対戦

五目並べ・五五将棋のオンライン対戦（4.5節・5.5節）と同じ構成（`online/types.ts`, `online/roomService.ts`, `ui/onlineScreen.ts`, `ui/onlineGameScreen.ts`）を踏襲し、以降のゲームで確立した改善（作成者による先手/後手選択、`winReason`による決着理由の出し分け）を最初から組み込んでいる。

- **コレクション**: `tictactoeGames`。`RoomDoc`の`turn`/`players`は内部の`Stone`定数と統一した`'maru' | 'batsu'`で表現する。
- **盤面のシリアライズ**: `Board`（`Stone[][]`、3×3）は五目並べと同じ理由（Firestoreのネスト配列非対応）で9要素にフラット化する（`toWireBoard`/`fromWireBoard`）。`Stone`は数値のためそのままフラット化できる。
- **`roomService.createRoom(playerName, visibility, creatorColor)`**: 作成者が指定した色（`maru`/`batsu`）の枠にのみ自分の情報を入れ、もう一方を`null`のまま作成する。`joinRoom`は`!room.players.maru ? 'maru' : !room.players.batsu ? 'batsu' : null`のように**空いている方の色を動的に判定**して参加させる（作成者がどちらの色を選んでも参加者側のロジックを変えなくて済む）。
- **`roomService.submitMove(roomId, row, col, color)`**: `runTransaction`内で「手番か」「空きマスか」を確認し、`checkWin`/`isBoardFull`（CPU対戦と共通の`logic/rules.ts`）で判定して`winReason: 'three-in-a-row'`を設定する。
- **`firestore.rules`の`isValidNewTicTacToeRoom`**: 作成者がどちらの色を選んでもバリデーションが通るよう、`(players.maru is map && players.batsu == null) || (players.batsu is map && players.maru == null)`というOR条件にしている。

## 7. オートリオのロジック設計

実在のボードゲーム「Otrio」の基本ルール（マスタールールなし）を実装。

### board.ts
`Cell`を`{ S: Player | null; M: Player | null; L: Player | null }`として定義し、駒は取り除かれない・重ねて置けるという他の2ゲームにはない特徴を表現している。`GameState`は`board`に加えて`inventory`（`Record<Player, Record<Size, number>>`、各プレイヤーの残り持ち駒数）を持つ。

### rules.ts
- `getLegalMoves(state)`: 現在の手番が残数>0で持っているサイズ×そのサイズがまだ空いているマスの全組み合わせ。
- `checkWin(board, player)`: `LINES`（8ライン定義）×3サイズで同サイズの3並びを判定する`hasSameSizeLine`と、9マスそれぞれで小中大すべてが自分の駒かを判定する`hasTriStack`のOR。盤面が小さいため全走査で十分高速。
- `isGameOver(state)`: 両者の持ち駒（各9個、計18個）が尽きたら引き分け側の終局。

### ai.ts
- **弱**: 仮に手番を入れ替えた`GameState`を作って`getLegalMoves`→`applyMove`→`checkWin`を試すことで「指定プレイヤーの即勝ち手」を検出する`findWinningMove`ヘルパーを使い、自分の即勝ちを優先、なければ相手の即勝ち手と同じ（マス・サイズ）に打てるなら阻止、それ以外はランダム。
- **中/強共通の評価関数**: 8ライン×3サイズで「相手に阻害されていない自分の駒数」に応じて加点・減点するライン評価と、9マスそれぞれで「相手に阻害されていない自分のトリオ達成度（0〜3）」に応じて加点・減点するトリオ評価を合算する。
- **中**: 深さ2のネガマックス（分岐はほぼ無制限、評価関数を使用）。
- **強**: 深さ6・評価値上位10手に絞ったネガマックス＋αβ枝刈り（五目並べの`HARD_BRANCH_LIMIT`と同じ考え方で、盤面は小さいが持ち駒選択が絡み分岐数が多いため候補を絞っている）。初期局面でも1秒未満で応答することを確認済み。

### ui
持ち駒選択→盤面クリックで着手確定、という操作フローは五五将棋の持ち駒選択パターンをそのまま踏襲。`InventoryView`（`HandView`相当）で自分/相手の持ち駒を表示し、`BoardView`は各マスに小・中・大3つの入れ子の四角形（`.otrio-slot--S/M/L`）を絶対配置で重ねて描画し、所有者に応じて色分けする。

## 7.1 オートリオのオンライン対戦

〇×ゲーム（6.1節）と同じ構成・同じ改善（先手/後手選択、`winReason`）を踏襲している。五五将棋と同様「持ち駒を持つ」ゲームだが、盤面自体の視点反転（五五将棋は自陣が常に手前に来るよう盤面を回転する）は不要なため、`BoardView`/`InventoryView`はCPU対戦のものをそのまま流用している。

- **コレクション**: `otrioGames`。`turn`/`players`は`logic/board.ts`の`Player`型（`1 | 2`）をそのまま使う。Firestore上のマップキーは数値ではなく文字列になるため、`firestore.rules`側では`data.players['1']`/`['2']`とブラケット記法でアクセスする。
- **盤面のシリアライズ**: `Board`（`Cell[][]`、3×3）を9要素にフラット化するが、各要素`Cell`は`{ S, M, L }`を持つ**オブジェクト**であり配列ではないため、五目並べ等と違い要素ごとの追加変換は不要（外側の2次元→1次元の変換のみでFirestoreに保存できる）。
- **持ち駒（inventory）**: `Record<Player, Record<Size, number>>`はネストしたオブジェクト（マップ）でありFirestoreにそのまま保存できる（五五将棋の`hand`と同じ扱い）。
- **`roomService.submitMove(roomId, move, color)`**: CPU対戦と共通の`applyMove`→`checkWin`→`isGameOver`の順にロジックを適用し、勝敗が付けば`winReason: 'win'`、両者の持ち駒が尽きれば`winReason: 'draw'`を設定する。
- **結果表示**: `winReason`が`'draw'`の場合のみ`outcome: 'draw'`として引き分け専用メッセージ（「持ち駒がなくなりました」）を表示する`buildResult`を`onlineGameScreen.ts`に実装。

## 7.2 ゴブレット・ゴブラーズのロジック設計・オンライン対戦

`Docs/todo-feature.md`の要望により追加。オートリオ（`src/games/otrio/`）とはCell構造が根本的に異なる（オートリオは全サイズが共存、ゴブレットは被せる＝隠す）ため、ロジック層は新規設計した。UIの持ち駒操作パターン・ディレクトリ構成はオートリオを踏襲している。

### logic/board.ts
```ts
export interface Piece { owner: Player; size: Size; }
export type Cell = Piece[]; // 下から上へ積んだ駒のスタック。空配列=空きマス
export type Board = Cell[][];
export interface GameState { board: Board; inventory: Record<Player, Inventory>; turn: Player; history: string[]; }
```
`Cell`を配列（スタック）として表現することで、「自分より小さい駒に被せて置く」「盤上の駒を動かして下の駒を露出させる」という他ゲームにないメカニクスを自然に表現している。`topOf(cell)`ヘルパーで「一番上に見えている駒」を取得する（勝敗判定・描画・合法手判定すべてがこれを使う）。`history`は千日手（同一局面の繰り返し）判定用の局面キー履歴で、`positionKey(state)`が盤面+持ち駒+手番から文字列キーを生成する。

### logic/rules.ts
```ts
export type Move =
  | { kind: 'place'; row: number; col: number; size: Size }
  | { kind: 'move'; from: { row: number; col: number }; to: { row: number; col: number } };
```
`getLegalMoves`は「新規配置」（持ち駒があり、置き先が空きまたはより小さい駒の上）と「移動」（盤上の自分の駒を、空きまたはより小さい駒の上へ）の両方を列挙する。`checkWin`は8ライン（オートリオと同じ`LINES`定義を流用）それぞれで`topOf(cell)?.owner`が全て同一プレイヤーかを判定する（駒のサイズは問わない）。

`checkRepetition(history)`は同一局面キーが3回出現したら引き分けとする。**本家ルールには存在しない実装上のセーフガード**で、駒を動かし続けるだけで理論上は対局が終わらなくなり得るため、五五将棋の千日手判定と同じ考え方で追加した（コード内コメントにもその旨を明記）。

### logic/ai.ts
オートリオの評価関数（ライン内の「相手に阻害されていない自分の駒数」をスコア化）と同じ考え方を、`topOwner`基準に読み替えて実装。弱=即勝ち/即阻止優先+ランダム、中=深さ2ネガマックス、強=深さ4・評価値上位12手に絞ったネガマックス+αβ枝刈り（配置+移動で分岐数がオートリオより多いため、`HARD_BRANCH_LIMIT`はオートリオの10より少し多い12に設定）。

### online/roomService.ts のシリアライズ（他ゲームと異なる独自方式）
`Cell`が配列（スタック、最大3要素）であるため、他ゲームの単純な「2次元配列→1次元配列」フラット化だけでは対応できない（Firestoreはネスト配列を扱えない）。そのため、各`Cell`を**固定長3要素**の数値配列（下から上への駒を`所有者*10+サイズ番号+1`でエンコード、無ければ`0`）に変換し、9マス×3要素＝27要素のフラット配列として保存する専用の`toWireBoard`/`fromWireBoard`を実装した。`inventory`はネストしたオブジェクトのためそのまま保存でき、`history`（`string[]`）もFirestoreの通常の配列として保存できる。

### ui/boardView.ts（新規実装）
オートリオの`BoardView`は各マスに小中大3層を重ねて常時表示するが、ゴブレット・ゴブラーズは「被せると下の駒が隠れる」ため、`topOf(cell)`の結果だけを1つの図形として描画する。盤上の自分の駒をクリックして選択すると、選択中のマス（`gobblet-cell--selected`）と移動先候補（`gobblet-cell--legal`、`getLegalMoves`から動的に計算）をハイライトする。

### ui/main.ts の操作フロー
`selectedSize`（持ち駒選択）と`selectedSource`（盤上の駒選択）の2つの状態を排他的に管理し、`handleCellClick`が両方のケースを1つの関数で分岐処理する。持ち駒を選んで盤面をクリックすれば新規配置、盤上の自分の駒を選んで別マスをクリックすれば移動、という2系統の操作を同じクリックハンドラで受ける設計。オンライン対戦（`ui/onlineGameScreen.ts`）も同じ状態管理・分岐ロジックをFirestoreの`RoomDoc`に対して行う。

## 8. UI層の設計パターン

両ゲームともUI層は以下の責務分担で統一している。
- `boardView.ts`: 盤面のDOM（ボタン要素）を初回に一度だけ生成し、以降は`render()`呼び出しでクラス付け替え・テキスト書き換えのみを行う（毎手DOMを作り直さない）。CPU対戦・オンライン対戦の両方から同じ`BoardView`/`HandView`を再利用する。
- `ui/main.ts`: モード選択（CPU対戦/オンライン対戦）→難易度選択→対局→結果モーダルの画面遷移、盤面クリックのハンドリング、CPU手番の遅延実行（`window.setTimeout`でUIの描画を挟んでから計算することで、思考中の表示が一瞬でも見えるようにしている）、勝敗判定後の`showResultModal`呼び出しを担当する「コントローラ」的な役割。オンライン対戦画面（Firestore購読を持つ）への遷移時は、`activeDispose`という単一の変数で前の画面の購読を解除してから次の画面を描画する（4.5節参照、五五将棋の`ui/main.ts`も同じパターン）。

五五将棋はさらに以下を管理する（CPU対戦は`ui/main.ts`、オンライン対戦は`ui/onlineGameScreen.ts`がそれぞれ独立して持つ。ロジックは同じだが状態の出どころ＝ローカルの`GameState`かFirestoreの`RoomDoc`か、が異なる）:
- 選択状態（盤上の駒を選択中／持ち駒を選択中／未選択）と、それに応じた合法手ハイライトの計算。
- 成り／不成りの両方が合法手として存在する場合の選択ポップアップ（`showPromotionPrompt`）表示。
- 千日手判定用の着手履歴（`HistoryEntry[]`）の記録と、`checkRepetition`の呼び出し（CPU対戦はローカル変数、オンライン対戦はFirestoreドキュメントの`history`フィールドとして保持）。

## 9. テスト戦略

Vitestでロジック層（`logic/*.ts`）のみを対象にユニットテストを作成している（UI層のE2Eテストは対象外）。

- 五目並べ: `rules.test.ts`（5連判定・引き分け判定）、`ai.test.ts`（弱/強AIの必勝手発見）
- 四目並べ: `rules.test.ts`（4連判定）、`ai.test.ts`（弱/強AIの必勝手発見、5連ではなく4連基準であること）
- ゴブレット・ゴブラーズ: `rules.test.ts`（被せ配置の可否、被せ後も下の駒が残ること、移動で移動元が空く/下の駒が現れること、勝敗判定、`checkRepetition`の千日手判定）、`ai.test.ts`（各難易度が合法手を返すスモークテスト、勝てる手を見逃さないこと）
- 五五将棋: `rules.test.ts`（初期局面の王手なし判定、二歩、行き所のない駒、歩の成り強制、王手放置の禁止、詰み判定、`applyMove`の持ち駒変換）、`ai.test.ts`（各難易度が初期局面から合法手を返すスモークテスト、`checkRepetition`の千日手・連続王手判定）

特に五五将棋は「二歩」「打ち歩詰め」「行き所のない駒」「千日手の特殊ルール」など見落としやすいルールが多いため、実装時に個別のテストケースを用意して正しさを担保した。

## 10. ビルド・デプロイ構成

- `vite.config.ts`: `base: '/board-game-farm/'`、7エントリのMulti-Page構成。
- `.github/workflows/deploy.yml`: `main`ブランチへのpushをトリガーに、`npm ci` → `npm run build` → `actions/upload-pages-artifact` → `actions/deploy-pages` を実行。GitHub Pages側の設定（Settings → Pages → Source: GitHub Actions）は運用開始時に手動で1回設定済み。
- ブランチへのpushや Pull Request 作成だけではワークフローは実行されない（`main`へのpushのみがトリガー）。

## 11. 今後の拡張ポイント（Phase 3向けメモ）

6ゲームすべてでCPU対戦・オンライン対戦の両方が実装済み（Phase 2完了）。新規ゲームを追加する場合は `src/games/<game-id>/{logic,ui}` を追加し、`src/portal/main.ts` の `GAMES` 配列にカードを1件追加し、`vite.config.ts` の `rollupOptions.input` にHTMLエントリを追加すればよい。オンライン対戦まで追加する場合は、以下のパターンが6ゲーム分実証済みなのでそのまま踏襲できる:

- `shared/firebase.ts`（Firestore初期化）は共通利用し、`shared/onlineRoomCode.ts`（ルーム番号生成）も共通利用する。
- ゲーム固有の状態はそのゲーム専用のFirestoreコレクションに保存する（`games`, `shogiGames`のように分離）。
- 盤面が2次元配列の場合はFirestoreがネスト配列を扱えないため、`toWireBoard`/`fromWireBoard`パターンでフラット配列化する（4.5節・5.5節参照）。盤面の各マスが配列（スタック等）を持つ場合は単純なフラット化では対応できないため、ゴブレット・ゴブラーズ（7.2節）のような固定長エンコード方式を検討する。
- ロビー画面（`ui/onlineScreen.ts`）・対局画面（`ui/onlineGameScreen.ts`）はゲームごとに個別実装し、`ui/main.ts`側で`activeDispose`パターンによりFirestore購読のライフサイクルを管理する。「ルームを作成する」UIは設定（先手/後手・公開/非公開など）をすべて選んでから単一の実行ボタンを押す構成にする（3節参照）。
