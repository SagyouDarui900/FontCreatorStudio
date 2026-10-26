# Font Creator Studio アーキテクチャ刷新・品質向上計画

Grokのコードレビューに基づく、巨大コンポーネント（`GlyphCanvas`, `FontQualityModal`, `ExportModal`, `FontInfoModal`）の責務分離、型安全性強化、テストカバレッジ拡充、および描画パフォーマンス最適化のロードマップです。

## ユーザー確認・決定事項サマリー

> [!IMPORTANT]
> ユーザー様との確認を経て、以下の優先順位および実装方針を確定しました。

- **決定事項 1（GlyphCanvas 分割順序）**:
  約800行に及ぶスタイラス判定・パームリジェクション・2本指ジェスチャー・各ツールへのイベントルーティングを担う「ポインター・ジェスチャー調停フック (`useCanvasPointerDispatcher`)」の分離を最優先で実施。その後、ガイド線・下絵操作・レイヤースタックの分離を進めます。
- **決定事項 2（巨大モーダル分割アプローチ）**:
  `FontQualityModal`、`ExportModal`、`FontInfoModal` は、タブおよび個別ツール単位（総合診断、極値挿入、ノード削減、太さ均等化、エクスポート設定、ライセンス選択など）で専用サブコンポーネントに分離します。
- **決定事項 3（テスト強化の重点対象）**:
  Phase 4 では、字形生成・輪郭処理の根幹である `pathUtils`（単純化・結合・交差判定・穴判定）および `vectorBoolean` の単体テストを最優先で拡充します。

---

## 1. 概要と目標 (Overview & Core Concept)

- **目的**: 
  機能追加を行わず、既存の描画・編集・フォント生成機能を100%保ったまま、保守性・型安全性・テスト網羅率を飛躍的に向上させ、将来の機能拡張に耐えうる堅牢な基盤を構築する。
- **対象読者 / ユーザー**:
  PC（マウス・ペンタブ）、iPad（Apple Pencil）、スマートフォン（タッチ）でフォント制作を行うすべてのクリエイター。
- **提供価値**:
  コードの肥大化による副作用や再レンダリング遅延を解消し、長時間のフォント制作や大規模グリフプロジェクトでも安定して動作する開発基盤と実行環境を実現する。

---

## 2. ユーザー体験と品質保証 (User Experience & Consistency)

- **UX/UI ゼロ回帰方針**:
  リファクタリング前後で既存のUI外観、ボタン配置、ショートカットキー、ジェスチャー感度（Apple Pencil の筆圧、2本指ピンチイン/アウト、2本指タップUndo/3本指タップRedo）は完全に同一の挙動を維持します。
- **フィードバックの局所化**:
  状態をサブコンポーネントおよび専用フックへ局所化することで、スライダー操作やツール切替時の不要な全画面再描画を抑制し、応答レスポンスを向上させます。

---

## 3. 主要な設計方針とトレードオフ (Key Decisions & Trade-Offs)

### 方針 1: 「純関数」と「副作用フック」の徹底分離
- **アプローチ**:
  座標変換、幾何計算、ベクターブーリアン、メトリクス補正は純粋関数（`src/utils/path/` および `src/utils/font/`）にまとめ、DOMイベントやReactステートに依存させない。
- **理由**:
  純粋関数化により、Vitestでのユニットテスト作成が容易になり、不具合の再現・検証が極めて高速になります。

### 方針 2: 段階的コミットと常時ビルド可能状態の維持
- **アプローチ**:
  1つのファイルを分割・リファクタリングするごとに必ず `npm run typecheck` と `npm run build` を実行。
- **理由**:
  数千行のファイルを一斉に変更した場合のデバッグコストを防ぎ、常に稼働可能なデプロイ品質を維持します。

---

## 4. 技術アーキテクチャ & 実装フェーズ (Technical Architecture & Phasing)

### システム構成図

```
┌────────────────────────────────────────────────────────────────────────┐
│                               App.tsx                                  │
└──────┬────────────────────────────┬─────────────────────────────┬──────┘
       │                            │                             │
       ▼                            ▼                             ▼
┌──────────────┐          ┌───────────────────┐         ┌────────────────┐
│ GlyphCanvas  │          │ FontQualityModal  │         │  ExportModal / │
│              │          │                   │         │  FontInfoModal │
└──────┬───────┘          └─────────┬─────────┘         └────────┬───────┘
       │                            │                            │
       ├─ useCanvasViewport         ├─ OverviewTab               ├─ PreviewSection
       ├─ useCanvasPointerDispatch  ├─ ExtremaOptimizerTab       ├─ OptionsSection
       ├─ useCustomGuidelines       ├─ NodeOptimizerTab          └─ LicenseSection
       ├─ useTraceTransform         └─ StrokeEqualizerTab
       ├─ useContourTransforms
       └─ CanvasLayerStack
              │                             │                            │
              ▼                             ▼                            ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Core Utilities & Engines                        │
│  ┌───────────────────────────────┐   ┌──────────────────────────────┐  │
│  │       src/utils/path/         │   │       src/utils/font/        │  │
│  │ (pathUtils, vectorBoolean)    │   │ (fontCompiler, dakuten, etc) │  │
│  └───────────────────────────────┘   └──────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### 実施ステップ

#### 【Phase 1】健全性確認と基盤修正
1. `npm run typecheck` / `npm run build` を基準とした未使用 import、デッドコード、不要な `any` の洗い出しと型引き締め。
2. `src/types.ts` と `fontCompiler` / `qualityChecker` 間の型整合性を強化。

#### 【Phase 2】巨大コンポーネントの分割
1. **`GlyphCanvas.tsx` の分割**:
   - `useCanvasPointerDispatcher`: ポインター/タッチ/ジェスチャー調停（スタイラス判定、パームリジェクション、ピンチズーム/パン、マルチタップUndo/Redo）。
   - `useCustomGuidelines`: ガイド線の作成・ドラッグ移動・削除・ロック管理。
   - `useTraceTransform`: 下絵の配置・拡縮・回転制御。
   - `CanvasLayerStack`: SVG描画レイヤーの集約。
2. **`FontQualityModal.tsx` の分割**:
   - タブ単位（`OverviewTab`, `ExtremaOptimizerTab`, `NodeOptimizerTab`, `StrokeEqualizerTab`）でコンポーネントを分離。
3. **`ExportModal.tsx` & `FontInfoModal.tsx` の分割**:
   - プレビュー部、オプション部、ライセンス選択部を独立コンポーネント化。

#### 【Phase 3】コアロジックの品質向上
1. `src/utils/path`（純粋ベクター演算）と `src/utils/font`（フォントバイナリ・メトリクス生成）の境界を整理。
2. 自己交差検出・ワインディング判定・マジックナンバーの定数化。
3. エラーハンドリングの標準化。

#### 【Phase 4】テスト強化
1. `src/utils/pathUtils.test.ts` および新規テストファイルでベクターブーリアン（結合・差分・交差）、ノード単純化、穴判定のユニットテストを追加。
2. `fontCompiler` によるTTF/OTF出力の主要パステスト、濁点/半濁点合成テストの追加。

#### 【Phase 5】パフォーマンスと内部整理
1. `React.memo` / `useCallback` / `useMemo` による再描画抑制。
2. 循環参照のチェックとファイル構成の最終整理。
