import React from 'react';

interface BeginnerTutorialTabProps {
  isLight: boolean;
  onOpenGlossary: () => void;
  onOpenFaq?: () => void;
}

const DRAWING_METHODS = [
  {
    title: '筆ツール',
    shortcut: 'B',
    summary:
      'マウスやスタイラスペンで線を描くと、手振れ補正を適用したうえで閉じたベクター輪郭に変換します。筆圧感知の有効・無効と筆スタイル（毛筆、万年筆、丸ペンなど）を切り替えられます。',
  },
  {
    title: 'ペンツール',
    shortcut: 'P',
    summary:
      'クリックで角（コーナー点）、ドラッグでハンドル付き曲線（スムーズ点）を順に配置します。始点クリックで閉じたパスになり、Enter で開いたパスとして確定、Backspace で直前の点を取り消します。',
  },
  {
    title: '下絵トレース',
    shortcut: '下絵設定',
    summary:
      '紙に書いた文字の写真や画像（PNG / JPG / SVG）をキャンバス背面に表示してなぞります。下絵の不透明度、倍率、位置を個別に調整できます。',
  },
];

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: '文字を選ぶ',
    body: '左側の文字一覧から作成する文字（例: 「あ」）を選びます。ひらがな・カタカナ・教育漢字などの分類で表示を絞り込めます。',
    note: 'Alt + → で次の文字、Alt + ← で前の文字に移動します。',
  },
  {
    step: '02',
    title: '輪郭を描く',
    body: '筆ツール（B）またはペンツール（P）で、キャンバス中央の字面枠を目安に文字を描きます。',
    note: '筆描画時に Shift + ドラッグすると、水平・垂直・45 度の直線を引けます。[ / ] キーで線の太さを 4px 単位で変更できます。',
  },
  {
    step: '03',
    title: '点と余白を調整する',
    body: '選択ツール（V）で輪郭をダブルクリックすると、アンカーポイントとハンドルを編集できます。右パネルまたはショートカットで左右の余白（サイドベアリング）を設定します。',
    note: 'Shift + Alt + S で左右余白と送り幅を自動計算し、Alt + S で余分なノードを削減（単純化）します。',
  },
  {
    step: '04',
    title: '試し打ちで確認する',
    body: 'ヘッダーの「試し打ち」から文章を入力し、文字の大きさの揃い方や字間を確認します。横書きと縦書きの切り替えに対応しています。',
    note: '文字間が詰まっている場合は、該当文字の LSB / RSB、または「カーニング」画面で間隔を調整します。',
  },
  {
    step: '05',
    title: 'OTF ファイルとして書き出す',
    body: 'ヘッダーの「フォント出力」からプレビュー・拡大率・輪郭結合オプションを確認し、.otf（OpenType / CFF）ファイルとしてダウンロードします。',
    note: '作業途中のデータはヘッダーの「保存」から .json ファイルとして書き出せます。',
  },
];

export const BeginnerTutorialTab: React.FC<BeginnerTutorialTabProps> = ({
  isLight,
  onOpenGlossary,
  onOpenFaq,
}) => {
  const dividerClass = isLight ? 'border-stone-200' : 'border-[#25362b]';
  const headingText = isLight ? 'text-stone-900' : 'text-stone-100';
  const mutedText = isLight ? 'text-stone-600' : 'text-stone-300';
  const subtleText = isLight ? 'text-stone-500' : 'text-stone-400';

  return (
    <div className="space-y-5">
      {/* Overview */}
      <section className="space-y-2">
        <h3 className={`text-sm font-bold ${headingText}`}>
          作字と書き出しの基本手順
        </h3>
        <p className={`text-xs leading-relaxed ${mutedText}`}>
          ブラウザ上で文字の輪郭を作成し、OS やデザインソフトにインストールできる OpenType フォント（.otf）として出力します。マウス、スタイラスペン（Apple Pencil 等）、タッチ操作に対応しています。
        </p>

        <dl className={`grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 mt-3 border-t ${dividerClass} text-xs`}>
          <div className="space-y-0.5">
            <dt className={`font-bold ${headingText}`}>必要な文字だけで出力可能</dt>
            <dd className={`text-[11px] leading-relaxed ${mutedText}`}>
              全文字種を埋める必要はありません。必要な数文字だけを作成した状態でも .otf を書き出せます。
            </dd>
          </div>
          <div className="space-y-0.5">
            <dt className={`font-bold ${headingText}`}>未作成文字の代替表示</dt>
            <dd className={`text-[11px] leading-relaxed ${mutedText}`}>
              作成していない文字を入力した場合、OS やアプリの標準フォントが代替として表示されます。
            </dd>
          </div>
          <div className="space-y-0.5">
            <dt className={`font-bold ${headingText}`}>作成したフォントの利用範囲</dt>
            <dd className={`text-[11px] leading-relaxed ${mutedText}`}>
              自分で作成したグリフの権利は制作者に帰属し、商用・非商用を問わず使用・配布できます。
            </dd>
          </div>
        </dl>
      </section>

      {/* 3 Drawing Methods */}
      <section className={`pt-4 border-t ${dividerClass} space-y-3`}>
        <h4 className={`text-xs font-bold ${headingText}`}>輪郭を作成する 3 つの方法</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DRAWING_METHODS.map((method) => (
            <div key={method.title} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <h5 className={`text-xs font-bold ${headingText}`}>{method.title}</h5>
                <kbd
                  className={`px-1.5 py-0.5 rounded font-mono text-[10px] border ${
                    isLight
                      ? 'bg-stone-50 border-stone-300 text-stone-700'
                      : 'bg-[#121c16] border-[#2c3d31] text-stone-300'
                  }`}
                >
                  {method.shortcut}
                </kbd>
              </div>
              <p className={`text-xs leading-relaxed ${mutedText}`}>{method.summary}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5 Steps */}
      <section className={`pt-4 border-t ${dividerClass} space-y-2.5`}>
        <h4 className={`text-xs font-bold ${headingText}`}>基本手順（5 ステップ）</h4>
        <ol className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-8">
          {WORKFLOW_STEPS.map((item) => (
            <li key={item.step} className={`py-2.5 border-b ${dividerClass} grid grid-cols-1 sm:grid-cols-[2.5rem_1fr] gap-1 sm:gap-3`}>
              <span className={`font-mono tabular-nums text-xs font-bold ${subtleText}`}>
                {item.step}.
              </span>
              <div className="space-y-0.5">
                <h5 className={`text-xs font-bold ${headingText}`}>{item.title}</h5>
                <p className={`text-xs leading-relaxed ${mutedText}`}>{item.body}</p>
                <p className={`text-[11px] font-mono ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>
                  {item.note}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Cross Links */}
      <div className="pt-1 flex flex-wrap items-center gap-4 text-xs">
        <button
          type="button"
          onClick={onOpenGlossary}
          className="text-emerald-700 dark:text-emerald-400 underline underline-offset-4 hover:opacity-80 cursor-pointer font-medium"
        >
          用語辞典を見る
        </button>
        {onOpenFaq && (
          <button
            type="button"
            onClick={onOpenFaq}
            className="text-emerald-700 dark:text-emerald-400 underline underline-offset-4 hover:opacity-80 cursor-pointer font-medium"
          >
            よくある質問・インストール方法を見る
          </button>
        )}
      </div>
    </div>
  );
};
