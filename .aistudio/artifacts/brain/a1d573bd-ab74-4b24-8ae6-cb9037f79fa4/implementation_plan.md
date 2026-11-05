# ツールバー配置カスタマイズ（上部・左側・右側）の実装

PC版（デスクトップ）UIにおいて、ペンや消しゴムなどの描画・編集ツールバーが上部に固定されていた構造を改修し、ユーザーの好みに応じて「上部（横型）」「左側（縦型）」「右側（縦型）」へドッキング位置を自由に切り替えられるようにしました。

---

## 🛠 主な変更点

1. **配置位置タイプと永続化 (`src/types/canvas.ts`, `src/utils/storageKeys.ts`)**:
   - `ToolbarPosition = 'top' | 'left' | 'right'` 型を定義。
   - `STORAGE_KEYS.TOOLBAR_POSITION` (`fcs_toolbar_position`) を追加し、ユーザーが選択した配置を LocalStorage に自動保存・永続化。

2. **ツールバー配置切り替えメニュー (`src/components/toolbar/ToolbarPositionMenu.tsx`)**:
   - CADライクで洗練されたコンパクトなポップオーバーメニューを新設。
   - 各配置（上部・左側・右側）をプレビューアイコン（`PanelTop`, `PanelLeft`, `PanelRight`）付きで直感的に切り替え可能。
   - ボタン右クリックによるワンアクション順次切り替え（上 → 左 → 右 → 上）にも対応。

3. **ToolBar の双方向（水平・垂直）レイアウト対応 (`src/components/ToolBar.tsx`, `PrimaryToolButtons.tsx`, `ViewToolButtons.tsx`)**:
   - `position?: ToolbarPosition` および `onPositionChange` プロップに対応。
   - 縦型ドッキング（`'left'` または `'right'`）時は、スリムな縦型ツールバー（44px幅）としてレンダリング。
   - 筆プリセット、図形パレット、グリッド設定の各ポップオーバーが、ツールバーのドッキング位置（左・右・上）に応じて適切な方向（横展開 / 下展開）と画面外はみ出し防止位置に自動アンカー。

4. **メインキャンバス領域の動的レイアウト (`src/App.tsx`)**:
   - デスクトップ表示時に `effectiveToolbarPosition`（`top` / `left` / `right`）に応じて中央ワークスペースの Flex 方向を `flex-col` / `flex-row` / `flex-row-reverse` にシームレスに切り替え。
   - モバイル画面（幅 640px 未満）では画面幅制約を考慮し、自動的に上部バー（および下部ナビ）へと安全にフォールバック。

---

## 🔍 検証結果
- **TypeScript 型検査 (`tsc --noEmit`)**: エラー 0 件
- **Vitest ユニットテスト**: 全 51 テスト合格 (5/5 テストスイート)
- **Vite プロダクションビルド (`npm run build`)**: 正常終了
