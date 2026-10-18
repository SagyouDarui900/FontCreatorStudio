# GlyphCanvas.tsx 巨大コンポーネント段階的分離・リファクタリング計画

8,700行を超える最重要作図コンポーネント `src/components/GlyphCanvas.tsx` を対象とし、既存の作図ロジック・イベントハンドラ・ショートカット・視覚的スタイルを100%維持したまま、責務ごとの独立したサブレイヤーおよびUIオーバーレイへ安全に分割・整理する計画です。

---

## ユーザー確認・重要決定事項

> [!IMPORTANT]
> ユーザー様からの回答に基づき、**「最大の `GlyphCanvas.tsx` を最優先で分割」** し、進め方として **「責務別のサブUIとフックへ無退行で安全に抽出する」** 方針を厳格に適用します。

- **確定決定事項 1（無退行の最優先）**:
  - 既存のすべての操作（ペン、ブラシ、消しゴム、変形、ショートカットキー、ルーラー、ガイドライン、タッチルーペ、モバイル補助シート）のプロパティおよびイベント伝達を完全維持。
  - 各サブコンポーネントは独立した `React.memo` 対応コンポーネントとして抽出し、個別の再レンダリング境界を形成。
- **確定決定事項 2（分離ターゲットの明確化）**:
  - **SVG制御レイヤー群**:
    1. `BezierNodeControlsLayer.tsx`: ベジェノード、制御点ハンドル、転折角マーカー、アンカー消しゴムプレビュー
    2. `ActivePenPreviewLayer.tsx`: ペンツール描画中のラバーバンド線、ゴーストカーソル点、「クリックで閉じる」バッジ、始点マーカー
    3. `SmartSnapGuidesLayer.tsx`: ベースライン、LSB、メトリクス線、他輪郭とのスマートスナップガイドおよびHUDバッジ
  - **HTMLオーバーレイ・モバイルドロワー群**:
    4. `CanvasTouchLoupe.tsx`: タブレット・スマホ用の高精度拡大鏡（ルーペ）
    5. `MobileAuxMenuDrawer.tsx`: モバイル用キャンバス補助操作ドロワー（ズーム・等倍・全体表示・輪郭表示・集中モード等）
    6. `MobilePartTransformSheet.tsx`: 選択輪郭パーツの反転・回転・拡縮・複製・削除ボトムシート
    7. `MobileBrushSettingsSheet.tsx`: ペン太さスライダーおよび筆種選択ボトムシート

---

## 1. 概要と目標 (Overview & Goals)

- **主目的**:
  - 単一ファイル約 8,767 行に膨れ上がった `GlyphCanvas.tsx` の責務を明確に分離。
  - 1ファイルあたりの行数を削減し、エディタの入力レスポンスおよびコード保守性を向上。
  - サブコンポーネント化により、キャンバス上の局所的なUI変化（例: ルーペ移動、スナップガイド表示）がキャンバス全体を巻き込まずに高速更新されるアーキテクチャを実現。
- **対象ユーザー**: フォント作字スタジオを日常的に使用するクリエイター。
- **提供価値**: 機能退行が一切なく、読みやすく保守しやすいクリーンなコンポーネント構造。

---

## 2. ユーザー体験 & UI/UX デザイン (UX & Visual Design)

- **見た目・操作性の100%維持**:
  - スナップガイドの表示位置や配色、ベジェノードのハイコントラスト二重環デザイン、モバイルボトムシートのアニメーション（slide-in-from-bottom）など、画面上のすべての要素の外観および挙動を変更しません。
- **パフォーマンスの向上**:
  - 各サブレイヤーを `React.memo` 化することで、スナップガイドの移動やノード選択時に不要なレイヤーの再評価を抑止。

---

## 3. 主要な設計判断とトレードオフ (Decisions & Trade-offs)

- **決定 1: レイヤー単位の独立コンポーネント抽出**
  - *採用方針*: すでに導入されている `MainGlyphContoursLayer`, `CanvasRulersLayer` などと同一の命名規則・設計思想に従い、`src/components/canvas/` 配下へ配置。
  - *理由*: プロジェクト既存のアーキテクチャ規約に沿っており、コードベース全体の統一感が保たれるため。
- **決定 2: 状態管理のリフトアップ維持**
  - *採用方針*: 親コンポーネント `GlyphCanvas` で統一管理されているポインタキャプチャや輪郭編集の確定処理は変更せず、props 経由でクリーンに下位へ受け渡す。
  - *理由*: 複雑なイベントライフサイクル（PointerDown $\to$ PointerMove $\to$ PointerUp）での状態不整合やバグの混入リスクをゼロにするため。

---

## 4. 技術アーキテクチャ & ディレクトリ構成

### 分離後のキャンバス構成図

```text
src/components/
├── GlyphCanvas.tsx (オーケストレーター・イベント統合)
└── canvas/
    ├── CanvasBackgroundLayer.tsx       (既存)
    ├── CanvasRulersLayer.tsx           (既存)
    ├── MetricsGuidesLayer.tsx          (既存)
    ├── JapaneseGuidesLayer.tsx         (既存)
    ├── MainGlyphContoursLayer.tsx      (既存)
    ├── AdjacentGlyphsLayer.tsx         (既存)
    ├── GlyphComparisonLayer.tsx        (既存)
    ├── CustomGuidelinesLayer.tsx       (既存)
    ├── RulerMeasurementLayer.tsx       (既存)
    ├── TraceReferenceLayer.tsx         (既存)
    │
    ├── BezierNodeControlsLayer.tsx     【新規抽出: ベジェノード & 制御ハンドル】
    ├── ActivePenPreviewLayer.tsx       【新規抽出: ペンツールラバーバンド & 閉じるバッジ】
    ├── SmartSnapGuidesLayer.tsx        【新規抽出: スマートスナップガイド & HUDバッジ】
    └── overlays/
        ├── CanvasStatusBar.tsx         (既存)
        ├── GuidesAndGridModal.tsx      (既存)
        ├── CanvasTouchLoupe.tsx        【新規抽出: モバイル拡大ルーペ】
        ├── MobileAuxMenuDrawer.tsx     【新規抽出: モバイル補助操作ドロワー】
        ├── MobilePartTransformSheet.tsx【新規抽出: 選択パーツ変形ボトムシート】
        └── MobileBrushSettingsSheet.tsx【新規抽出: ブラシ設定ボトムシート】
```

### ステップ別実施手順

1. **Step 1: SVG制御レイヤーの抽出**
   - `src/components/canvas/BezierNodeControlsLayer.tsx` の作成
   - `src/components/canvas/ActivePenPreviewLayer.tsx` の作成
   - `src/components/canvas/SmartSnapGuidesLayer.tsx` の作成
2. **Step 2: HTMLオーバーレイ・モバイルドロワーの抽出**
   - `src/components/canvas/overlays/CanvasTouchLoupe.tsx` の作成
   - `src/components/canvas/overlays/MobileAuxMenuDrawer.tsx` の作成
   - `src/components/canvas/overlays/MobilePartTransformSheet.tsx` の作成
   - `src/components/canvas/overlays/MobileBrushSettingsSheet.tsx` の作成
3. **Step 3: `GlyphCanvas.tsx` の統合と整理**
   - 新規コンポーネントをインポートし、肥大化していたインラインJSXブロックを置換。
4. **Step 4: ビルド・型チェック・テスト検証**
   - `npm run typecheck`, `npm run test`, `compile_applet` による完全動作確認。
