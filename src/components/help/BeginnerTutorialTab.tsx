import React from 'react';
import {
  CheckCircle2,
  Paintbrush,
  Layers,
  PenTool,
  Download,
  HelpCircle,
  Zap,
} from 'lucide-react';

interface BeginnerTutorialTabProps {
  isLight: boolean;
  onOpenGlossary: () => void;
}

export const BeginnerTutorialTab: React.FC<BeginnerTutorialTabProps> = ({ isLight, onOpenGlossary }) => {
  return (
    <div className="space-y-6">
      {/* 概要カード */}
      <div
        className={`p-4 rounded-xl border flex items-start space-x-3.5 ${
          isLight
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            : 'bg-[#1b261f] border-emerald-800/60 text-emerald-100'
        }`}
      >
        <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-sm">
          フォント
        </div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold">
              フォント作成チュートリアル
            </h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
              基本操作
            </span>
          </div>
          <p className="text-xs leading-relaxed opacity-90">
            ブラウザ上で文字を描画し、OSや各種アプリケーションで使用できるフォントファイル（.ttf / .otf / .woff）として出力する手順を解説します。マウス、スタイラスペン（Apple Pencil等）、タッチ操作に対応しています。
          </p>
        </div>
      </div>

      {/* 基本仕様 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div
          className={`p-3 rounded-xl border space-y-1 ${
            isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#18241d] border-[#25362b]'
          }`}
        >
          <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>1文字単位で出力可能</span>
          </div>
          <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-snug">
            すべての文字を作成する必要はありません。必要な文字のみ（例: ひらがな数文字のみ）を作字してフォントファイルとして出力できます。
          </p>
        </div>

        <div
          className={`p-3 rounded-xl border space-y-1 ${
            isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#18241d] border-[#25362b]'
          }`}
        >
          <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>未作成文字の代替表示</span>
          </div>
          <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-snug">
            作成していない文字が入力された場合、OSやブラウザの標準システムフォントによる代替表示（フォールバック）が適用されます。
          </p>
        </div>

        <div
          className={`p-3 rounded-xl border space-y-1 ${
            isLight ? 'bg-stone-50 border-stone-200' : 'bg-[#18241d] border-[#25362b]'
          }`}
        >
          <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>商用・非商用で利用可能</span>
          </div>
          <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-snug">
            出力したフォントデータの著作権は制作者に帰属します。商用利用、非商用利用、配布のいずれにも制限はありません。
          </p>
        </div>
      </div>

      {/* 3つの作字アプローチ */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-emerald-400 flex items-center space-x-1.5">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>作字の3つの方法</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 方法 1 */}
          <div
            className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 ${
              isLight ? 'bg-stone-50/70 border-stone-200' : 'bg-[#18241d] border-[#25362b]'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  <Paintbrush className="w-4 h-4" />
                </div>
                <h5 className="text-xs font-bold">1. 手書き描画（ブラシ）</h5>
              </div>
              <span className="text-[9.5px] px-1.5 py-0.5 rounded font-mono font-medium bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 inline-block">
                ブラシツール [B]
              </span>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                筆ツールを選択し、マウスやスタイラスペンで文字を描画します。手ブレ補正機能により入力座標が平滑化され、閉じたベクター輪郭として保存されます。
              </p>
            </div>
            <div className="text-[10.5px] text-emerald-700 dark:text-emerald-400 font-medium">
              筆圧感知の有無やプリセット（毛筆・万年筆・ミリペン等）を選択できます。
            </div>
          </div>

          {/* 方法 2 */}
          <div
            className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 ${
              isLight ? 'bg-stone-50/70 border-stone-200' : 'bg-[#18241d] border-[#25362b]'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  <PenTool className="w-4 h-4" />
                </div>
                <h5 className="text-xs font-bold">2. ベジェ曲線作図（ペン）</h5>
              </div>
              <span className="text-[9.5px] px-1.5 py-0.5 rounded font-mono font-medium bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 inline-block">
                ペンツール [P]
              </span>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                クリックで角（コーナー点）、ドラッグで方向線（ハンドル）を伴う曲線点（スムーズ点）を配置します。上部バーの「確定」ボタンまたはEnterキーでパスを確定します。
              </p>
            </div>
            <div className="text-[10.5px] text-sky-700 dark:text-sky-400 font-medium">
              Backspaceで直前の1点を削除、始点クリックでパスを閉じます。
            </div>
          </div>

          {/* 方法 3 */}
          <div
            className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 ${
              isLight ? 'bg-stone-50/70 border-stone-200' : 'bg-[#18241d] border-[#25362b]'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                  <Layers className="w-4 h-4" />
                </div>
                <h5 className="text-xs font-bold">3. 下絵トレース</h5>
              </div>
              <span className="text-[9.5px] px-1.5 py-0.5 rounded font-mono font-medium bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 inline-block">
                下絵参照
              </span>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                紙に手書きした文字の写真などの画像ファイル（PNG / JPG / SVG）を読み込みます。半透明の下敷きとして背面に表示し、輪郭をなぞって作字します。
              </p>
            </div>
            <div className="text-[10.5px] text-teal-700 dark:text-teal-400 font-medium">
              下絵の不透明度や拡大縮小率（78% / 85% / 100%）を設定できます。
            </div>
          </div>
        </div>
      </div>

      {/* 基本手順 5ステップ */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-emerald-400 flex items-center space-x-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>作字の基本 5ステップ</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Step 1 */}
          <div
            className={`p-3.5 rounded-xl border flex flex-col justify-between ${
              isLight ? 'bg-stone-50/70 border-stone-200' : 'bg-[#18241d] border-[#25362b]'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">
                  1
                </span>
                <h5 className="text-xs font-bold">文字一覧から文字を選択</h5>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                画面左側の文字グリッドから作字したい文字（例: 「あ」）をクリックします。上部の絞り込みメニューから「ひらがな」「カタカナ」「教育漢字」等を選択して一覧を絞り込めます。
              </p>
            </div>
            <div className="mt-2 text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
              ショートカット: Alt + → で次の文字へ移動
            </div>
          </div>

          {/* Step 2 */}
          <div
            className={`p-3.5 rounded-xl border flex flex-col justify-between ${
              isLight ? 'bg-stone-50/70 border-stone-200' : 'bg-[#18241d] border-[#25362b]'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">
                  2
                </span>
                <h5 className="text-xs font-bold">キャンバスに輪郭を描画</h5>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                ブラシツール（[B]）またはペンツール（[P]）で文字を描画します。中央の薄緑色の字面枠（850×850）を目安に線画を収めます。線の太さは [ キーで細く、] キーで太く変更できます。
              </p>
            </div>
            <div className="mt-2 text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
              ショートカット: Shift + ドラッグで水平・垂直・45度の直線を引く
            </div>
          </div>

          {/* Step 3 */}
          <div
            className={`p-3.5 rounded-xl border flex flex-col justify-between ${
              isLight ? 'bg-stone-50/70 border-stone-200' : 'bg-[#18241d] border-[#25362b]'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">
                  3
                </span>
                <h5 className="text-xs font-bold">ノード編集と余白設定</h5>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                ノード編集ツール（[A]）で頂点や方向線を微調整します（矢印キーで1px、Shift併用で10px移動、Cキーで角・曲線を切り替え）。Shift + Alt + S で文字の左右余白（サイドベアリング）を自動計算できます。
              </p>
            </div>
            <div className="mt-2 text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
              ショートカット: Shift + Alt + S で左右余白を自動計算
            </div>
          </div>

          {/* Step 4 */}
          <div
            className={`p-3.5 rounded-xl border flex flex-col justify-between ${
              isLight ? 'bg-stone-50/70 border-stone-200' : 'bg-[#18241d] border-[#25362b]'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">
                  4
                </span>
                <h5 className="text-xs font-bold">「試し打ち」で文章の確認</h5>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                上部メニューの「試し打ち」を開き、文章を入力して文字の並びや文字間隔を確認します。縦書きと横書きの表示切り替え、文字サイズや行送りの変更に対応しています。
              </p>
            </div>
            <div className="mt-2 text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
              ショートカット: Alt + T で試し打ちモーダルを表示
            </div>
          </div>
        </div>

        {/* Step 5 */}
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between ${
            isLight
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-100'
          }`}
        >
          <div className="flex items-center space-x-3">
            <span className="w-6 h-6 rounded bg-emerald-700 text-white text-xs font-bold flex items-center justify-center">
              5
            </span>
            <div>
              <h5 className="text-xs font-bold">「フォント出力」からファイルを書き出す</h5>
              <p className="text-xs opacity-80">
                画面右上の「フォント出力」（Ctrl/Cmd + E）をクリックし、形式（TTF / OTF / WOFF / WOFF2）を選択してダウンロードします。
              </p>
            </div>
          </div>
          <Download className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 hidden sm:block" />
        </div>
      </div>

      {/* よくある質問と対処法 */}
      <div
        className={`p-4 rounded-xl border space-y-2.5 ${
          isLight
            ? 'bg-amber-50/80 border-amber-200 text-amber-950'
            : 'bg-amber-950/30 border-amber-800/60 text-amber-100'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 font-bold text-xs">
            <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>よくある質問と対処法</span>
          </div>
          <button
            onClick={onOpenGlossary}
            className="text-xs text-amber-800 dark:text-amber-300 underline font-medium hover:opacity-80 flex items-center space-x-1 cursor-pointer"
          >
            <span>用語集を確認する</span>
          </button>
        </div>

        <div className="space-y-2 text-xs leading-relaxed">
          <div>
            <strong>Q. 文字同士が重なる、または文字間隔が詰まる場合は？</strong>
            <p className="text-stone-700 dark:text-stone-300 opacity-90 pl-3 mt-0.5">
              左右の余白（サイドベアリング）が不足しています。キーボードの <strong>Shift + Alt + S</strong> を押すか、右側パネルの「字幅自動設定」を実行することで、輪郭の幅に応じた左右余白を再計算して設定できます。
            </p>
          </div>
          <div>
            <strong>Q. 手書きした線のガタつきを整えるには？</strong>
            <p className="text-stone-700 dark:text-stone-300 opacity-90 pl-3 mt-0.5">
              描画後に <strong>Alt + S（パス単純化）</strong> を実行すると、全体の形状を維持したまま過剰なノードを削減できます。また、描画前にブラシ設定で「手ブレ補正」の強度を「強」にして描画してください。
            </p>
          </div>
          <div>
            <strong>Q. 画面を全画面で広く使いたい場合は？</strong>
            <p className="text-stone-700 dark:text-stone-300 opacity-90 pl-3 mt-0.5">
              キーボードの <strong>F</strong> キーを押すと集中モード（全画面表示）に切り替わります。サイドバーや上部メニューが最小化され、作図領域が広がります。再度 <strong>F</strong> キーを押すと元の表示に戻ります。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
