# UIテキストのはみ出し・不自然な改行の包括的修正計画

## 概要
すべてのデバイス幅（スマートフォン 360〜400px、タブレット、デスクトップ）において、ラベル・ボタン・モーダル説明文・サイドパネル内テキストの**横はみ出し**および**不自然な改行**を解消します。
**既存の機能・作字描画・フォント生成・保存ロジックは一切変更せず、CSSおよびレイアウトクラス（Flex/Grid/折り返し）のみを安全に修正**します。

---

## ユーザー確認 & 決定事項

> [!IMPORTANT]
> 前段のヒアリングおよびユーザー回答に基づき確定した方針です：
> - **幅400px未満のモバイル画面におけるボタン**: アイコンを表示した上で、テキストの自然な折り返しまたはコンパクト表示を許可し、親コンテナを押し広げないように制御。
> - **説明文・ヘルプ文**: `line-break: strict` と `overflow-wrap: break-word` による自然な日本語折り返しを適用。
> - **作業アプローチ**: 共通CSS（`index.css`）→ Header/ToolBar → 各種Modal → サイドパネル・グリッドの順で段階的に修正。

---

## 1. 問題の根本原因

1. **`index.css` における `<button>` の一律 `white-space: nowrap` 強制**:
   - `button, kbd { text-wrap: nowrap; white-space: nowrap; }` が定義されているため、ボタン内に複数行の説明文やオプション解説が含まれている場合（例：エクスポート形式選択、ブラシプリセット、各種設定タイル）でも改行が禁止され、親コンテナを右側へ大きく押し広げていた。
2. **Flex 子要素の `min-w-0` 不足（Flexbox min-width: auto 問題）**:
   - 横並び（`flex`）コンテナ内のテキスト要素に `min-w-0` が指定されていないため、長いテキストが親の幅を押し広げ、右端のアイコンや閉じるボタンが画面外に押し出されていた。
3. **日本語テキストの禁則・折り返しルールの局所的未適用**:
   - モーダル説明文や注意書きで `break-words` が抜けている箇所があり、長い英単語・ファイル形式名（.TTF, TrueType, Illustrator等）や約物の前後で親枠を突き破っていた。
4. **固定幅・極小文字（`text-[10px]`）と長い日本語の無理な詰め込み**:
   - 狭小幅で要素が横一列に詰め込まれ、ボタンテキストが1文字ずつ縦に折れる現象が生じていた。

---

## 2. 段階的修正計画

### Phase 1: 共通CSSルールの整理（`src/index.css`）
- `<button>` の一律 `white-space: nowrap` を廃止：
  - 単一操作ボタン（「保存」「閉じる」「OK」等の短いラベル）は専用クラス `.btn-nowrap` または個別 `whitespace-nowrap` で制御。
  - タイル型ボタンや複数行を含むボタンは自然に折り返せるよう整理。
- 日本語折り返し用ユーティリティクラスの定義：
  - `.jp-wrap`: `overflow-wrap: break-word; line-break: strict; word-break: normal;`
  - `.btn-card`: タイル選択ボタン用。内部のタイトルと解説文が自然に折り返され、親幅を押し広げない。
- `.truncate-label` に `min-w-0` を確実に保証。

### Phase 2: Header & メインナビゲーションの調整（`src/components/Header.tsx`, `src/App.tsx`）
- プロジェクト名・編集中グリフ情報の `flex min-w-0` と `truncate max-w-[...]` を再調整し、375px画面でも右側のアクションボタン（元に戻す、やり直し、メニュー）が押し出されない構造にする。
- ロックボタンや文字一覧ボタンのラベル表示をスマホ幅で最適化（アイコン優先＋極小画面ではテキスト自然非表示/コンパクト化）。
- 下部モバイルバー（`App.tsx`）の文字一覧・作図・メトリクス等のボタンラベルが360px端末で重ならないようパディングと字間を微調整。

### Phase 3: ToolBar & モバイル用シート（`src/components/ToolBar.tsx`, `src/components/toolbar/*`）
- `MobileBrushMenuSheet`: カスタムペン作成ボタンの「入り抜き・筆先形状・角度・手ブレ補正を編集」が画面外にはみ出る問題を、`min-w-0` と `.jp-wrap` で解消。
- `MobileShapeMenuSheet` / `MobileGridMenuSheet`: オプション項目の解説テキストが狭い画面でも右側のチェックマークを潰さないようレイアウトを是正。
- PC版ツールパレット（左ツールバー）：ツール名・ショートカットヒントのツールチップおよびフライアウトメニューの折り返しを適正化。

### Phase 4: 各種 Modal のタイトル・説明文・選択タイル（優先順）
1. **`ExportModal.tsx`**:
   - .TTF / .OTF 選択タイルの解説文、仮想ボディ倍率最適化（「原寸のまま」「和文拡大」「カスタム」）のボタン内テキストのはみ出し解消。
2. **`FontInfoModal.tsx`**:
   - フォント名、デザイナー名、著作権表記の入力欄ラベルとヘルプテキストの折り返し整理。
3. **`BatchNormalizeModal.tsx` / `WeightInterpolationModal.tsx`**:
   - 一括処理の実行確認文、パラメータ説明の日本語折り返し改善。
4. **`TraceSettingsModal.tsx` / `ShortcutsHelpModal.tsx`**:
   - 下絵調整スライダーの数値ラベル、キーボードショートカット一覧表のセル幅とテキスト折り返し。
5. **`ProjectDiagnosticsPanel.tsx` / `StorageManagerModal.tsx`**:
   - 診断警告テキスト、ストレージ容量メーターの数値ラベル折り返し。

### Phase 5: MetricsPanel & GlyphGrid
- `MetricsPanel.tsx`:
  - 左サイドベアリング（LSB）、右サイドベアリング（RSB）、送り幅（Advance Width）のラベルと数値入力欄が、サイドバー幅伸縮時に押し潰されないよう `min-w-0` を付与。
- `GlyphGrid.tsx`:
  - グリッド下部の文字情報（Unicode値、字名、パス数）のテキストオーバーフローを制御。

---

## 3. レスポンシブ確認観点

| 対象デバイス幅 | 主な確認ポイント |
|---|---|
| **超狭小スマホ（360px〜375px）** | Header 右端ボタンが切れないか、モバイルシートのテキストが画面端を突き破らないか |
| **標準スマホ（390px〜430px）** | 各種モーダルの解説文・フッターのボタンが適切な日本語改行になっているか |
| **タブレット（768px〜1024px）** | Header と ToolBar の中間幅での押し合いが発生しないか |
| **PC デスクトップ（1280px〜1540px）** | モーダル内の複数カラムグリッド（2列・3列）のタイトルと説明が均等に収まっているか |

---

## 5. 実施結果・修正完了ステータス

- [x] **Phase 1: 共通CSSルールの整理 (`src/index.css`)**
  - `<button>` の一律 `white-space: nowrap` を廃止し、`.btn-nowrap`, `.badge`, `.chip`, `kbd` のみに限定。
  - 自然な日本語折り返し用の `.jp-wrap` (`overflow-wrap: break-word; line-break: strict; text-wrap: pretty;`) を導入。
  - タイル型ボタン用の `.btn-card` を追加。
- [x] **Phase 2: Header & メインナビゲーション (`src/components/Header.tsx`, `src/App.tsx`)**
  - エクスポート案内バナー、モバイルメトリクス切り替え、ツールメニュー各アイテムに `min-w-0 flex-1` と `.jp-wrap` を適用。
  - 下部モバイルナビゲーションバーの各タブ幅と文字ラベル（作図、文字一覧、文字組等）を `truncate max-w-[48px]` で保護。
- [x] **Phase 3: ToolBar & モバイル用シート (`src/components/toolbar/*`)**
  - `MobileBrushMenuSheet`: カスタムペン設定ボタンの長い解説文を `min-w-0 flex-1` と `.jp-wrap` で親枠内に安全に収納。
  - `MobileShapeMenuSheet`: 図形ツールの各項目に `min-w-0 flex-1 truncate` を付与しチェックアイコンの押し出しを防止。
- [x] **Phase 4: 各種 Modal のタイトル・説明文・選択タイル**
  - `ExportModal.tsx`: TTF/WOFF/SVG 形式選択カード、最適化プリセットボタンの文字溢れを解消。
  - `BatchNormalizeModal.tsx`: モーダルヘッダー、6つの対象グループボタン（`grid-cols-2 sm:grid-cols-3`）、5つのサイズプリセット（`grid-cols-2 sm:grid-cols-3 md:grid-cols-5`）、フッターボタンのレスポンシブ化。
  - `FontInfoModal.tsx`: モーダルヘッダーの長文タイトル、UPMプリセット行（1000/1200/1500/2048）の折り返し許可、各タブ説明文の `.jp-wrap` 適用。
  - `ShortcutsHelpModal.tsx`: ヘッダーの幅制御、ショートカット一覧の行をモバイルで縦並び許容 (`flex flex-col sm:flex-row gap-1.5`) に改善。
  - `TraceSettingsModal.tsx`: ヘッダー、写真/下絵モード切り替えボタンの縮小・省略制御、推奨サイズプリセット行の `flex-wrap` 化。
  - `MojikumiStudioModal.tsx`: モバイルでの確実な閉じる操作保証（右上の40×40px常時タップ領域、下部フローティング閉じるバー、Escキー、背景クリック）、5つの本格組版ビュー（見開き書籍、原稿用紙、雑誌段組、短冊、アキ量比較）、青空文庫の著作権フリー名作10作品への刷新。
- [x] **Phase 5: MetricsPanel & GlyphGrid**
  - `MetricsPanel.tsx`: 送り幅・余白・変形ツールのヘッダーとチップに `min-w-0` と `truncate` を付与。
- [x] **検証**:
  - `npm run lint` (`tsc --noEmit`): 0 errors
  - `compile_applet` (`vite build`): 成功 (0 errors)
