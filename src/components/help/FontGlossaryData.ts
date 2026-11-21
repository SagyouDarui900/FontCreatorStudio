export interface GlossaryTerm {
  id: string;
  term: string;
  reading?: string;
  english?: string;
  category: 'basic' | 'drawing' | 'spacing' | 'format';
  shortSummary: string;
  easyExplanation: string;
  appFeatureTip?: string;
}

export const GLOSSARY_CATEGORIES = [
  { id: 'all', label: 'すべて' },
  { id: 'basic', label: '基礎・文字' },
  { id: 'drawing', label: '線・パス・作図' },
  { id: 'spacing', label: '余白・配置・メトリクス' },
  { id: 'format', label: 'ファイル形式・出力' },
];

export const FONT_GLOSSARY: GlossaryTerm[] = [
  {
    id: 'glyph',
    term: 'グリフ',
    reading: 'ぐりふ',
    english: 'Glyph',
    category: 'basic',
    shortSummary: '1文字分の形状を表す輪郭データ',
    easyExplanation:
      'フォントにおいて、1文字ごとに割り当てられる図形データをグリフと呼びます。たとえば同じ文字コード「あ」でも、明朝体と丸ゴシック体では異なるグリフを持ちます。',
    appFeatureTip: '左側の文字一覧から対象文字を選択して編集します。',
  },
  {
    id: 'em-square',
    term: '仮想ボディ（字面枠 / EM スクエア）',
    reading: 'かそうぼでぃ',
    english: 'EM Square / Body Box',
    category: 'spacing',
    shortSummary: '1文字を設計する基準となる正方形の座標枠（1000 × 1000 単位）',
    easyExplanation:
      'デジタルフォントでは 1000 × 1000 単位の正方形を基準枠として文字を配置します。この枠を仮想ボディと呼びます。漢字は枠の約 85%、仮名は約 78% の大きさに収めると、混植時に文字の大きさが揃います。',
    appFeatureTip: 'キャンバス中央の点線枠（字面枠）を目安にして文字の大きさを揃えます。',
  },
  {
    id: 'side-bearing',
    term: 'サイドベアリング（左右余白）',
    reading: 'さいどべありんぐ',
    english: 'LSB / RSB / Advance Width',
    category: 'spacing',
    shortSummary: '隣接する文字との間隔を保つ左右の余白',
    easyExplanation:
      '文字の左端から輪郭までの余白を LSB（Left Side Bearing）、輪郭の右端から次の文字の開始位置までの余白を RSB（Right Side Bearing）、これらと字幅を合わせた全体の幅を送り幅（Advance Width）と呼びます。',
    appFeatureTip: 'Shift + Alt + S、または右パネルの「字幅自動設定」で計算できます。',
  },
  {
    id: 'bezier-curve',
    term: 'ベジェ曲線 / パス',
    reading: 'べじぇきょくせん',
    english: 'Bézier Curve / Path',
    category: 'drawing',
    shortSummary: '点と方向線（ハンドル）で定義する拡大縮小可能な曲線',
    easyExplanation:
      'PNG や JPEG の画素（ピクセル）とは異なり、座標と数式で輪郭を表します。そのため、文字を拡大しても輪郭が階段状にギザギザにならず、印刷サイズや画面解像度に応じた滑らかな形状で描画されます。',
    appFeatureTip: '筆ツール（B）やペンツール（P）で描画した線は、ベジェ曲線の輪郭として保存されます。',
  },
  {
    id: 'node-anchor',
    term: 'アンカーポイント / ノード',
    reading: 'あんかーぽいんと / のーど',
    english: 'Anchor Point / Node',
    category: 'drawing',
    shortSummary: 'パスを構成する通過点',
    easyExplanation:
      '輪郭線の位置を決める点です。アンカーポイントから伸びるハンドル（方向線）の角度と長さを変えることで、隣接する区間の曲率を調整します。',
    appFeatureTip: '選択ツール（V）で輪郭をダブルクリックすると、点とハンドルを個別に移動できます。',
  },
  {
    id: 'remove-overlap',
    term: '重複除去（パス結合）',
    reading: 'じゅうふくじょきょ',
    english: 'Remove Overlap / Union',
    category: 'drawing',
    shortSummary: '重なった複数の輪郭を 1 つの外周輪郭に統合する処理',
    easyExplanation:
      '複数の線や図形が重なったままフォントを書き出すと、交差部分が白く抜ける場合があります。重複除去を実行すると、重なり合った領域を統合して内側の不要な交差線を削除します。',
    appFeatureTip: 'ツールバーの「重複除去」ボタン、または書き出し時の結合オプションで実行できます。',
  },
  {
    id: 'extrema',
    term: '極値ノード',
    reading: 'きょくちのーど',
    english: 'Extrema Nodes',
    category: 'drawing',
    shortSummary: '曲線の上下左右の端に配置するノード',
    easyExplanation:
      '円や曲線において X 座標・Y 座標が最大または最小になる位置のノードです。極値にノードを置くことで、縮小表示やラスタライズ時の輪郭崩れを抑えられます。',
    appFeatureTip: '品質診断画面から不足している極値ノードを自動追加できます。',
  },
  {
    id: 'simplify',
    term: 'パスの単純化',
    reading: 'ぱすのたんじゅんか',
    english: 'Path Simplification',
    category: 'drawing',
    shortSummary: '形状を保ったまま余分なノード数を減らす処理',
    easyExplanation:
      '手書きストロークを変換した直後は多数のノードが生成されます。単純化を行うと、輪郭の誤差を抑えつつ不要な点を削減し、編集のしやすさとファイル容量を改善します。',
    appFeatureTip: 'Alt + S、またはツールバーの「単純化」ボタンから実行できます。',
  },
  {
    id: 'winding-direction',
    term: 'パスの向き（ワインディング規則）',
    reading: 'ぱすのほうこう',
    english: 'Winding Direction / Fill Rule',
    category: 'drawing',
    shortSummary: '外周輪郭と内側の穴を区別するための頂点順',
    easyExplanation:
      '「口」や「O」のように内側に穴がある文字では、外側の輪郭と内側の輪郭の頂点順（時計回り・反時計回り）を逆にする必要があります。同じ向きになっていると、穴の部分も塗りつぶされます。',
    appFeatureTip: 'フォント書き出し時および品質診断の自動修正で向きを正規化します。',
  },
  {
    id: 'expand-stroke',
    term: 'ストローク拡張（線の輪郭化）',
    reading: 'すとろーくかくちょう',
    english: 'Expand Stroke / Outline',
    category: 'drawing',
    shortSummary: '幅を持たせた 1 本の線を閉じた面（外周パス）に変換する処理',
    easyExplanation:
      'ペンツールで引いた単一の開いた線に太さを指定し、外側を囲む閉じた輪郭データへ変換します。フォントとして出力できるのは閉じた輪郭のみのため、単線から文字を作る際に使用します。',
    appFeatureTip: '上部「機能」メニュー内のストローク拡張から太さを指定して実行できます。',
  },
  {
    id: 'baseline',
    term: 'ベースライン',
    reading: 'べーすらいん',
    english: 'Baseline',
    category: 'spacing',
    shortSummary: '欧文の大文字や数字の下端を揃える水平基準線',
    easyExplanation:
      'アルファベット（A, B, x など）や数字が並ぶ基準の高さです。日本語フォントでも半角英数字や記号と高さを合わせるために定義します。例として g や y の下部はベースラインより下に配置します。',
    appFeatureTip: 'キャンバスの基準線（Y = 200 相当）に合わせて英数字を配置します。',
  },
  {
    id: 'ascender-descender',
    term: 'アセンダ / ディセンダ',
    reading: 'あせんだ / でぃせんだ',
    english: 'Ascender / Descender',
    category: 'spacing',
    shortSummary: '小文字の基準高さ（x-height）より上下に突き出す領域',
    easyExplanation:
      '英小文字 b, d, h のように上へ伸びる部分をアセンダ、g, j, p, q, y のようにベースラインより下へ伸びる部分をディセンダと呼びます。',
    appFeatureTip: 'ガイド設定で欧文基準線を表示すると、上下の目安線を確認できます。',
  },
  {
    id: 'kerning',
    term: 'カーニング（ペア調整）',
    reading: 'かーにんぐ',
    english: 'Kerning',
    category: 'spacing',
    shortSummary: '特定の 2 文字の組み合わせごとに文字間隔を補正する値',
    easyExplanation:
      '通常の送り幅のまま並べると隙間が広く見える組み合わせ（例: 「T」と「o」、「A」と「V」、「。」と「」」）に対し、ペア単位で間隔を詰める、または広げる設定です。',
    appFeatureTip: '上部「機能」メニューの「カーニング」からペアごとの補正値や自動計算を利用できます。',
  },
  {
    id: 'os2-table',
    term: 'OS/2 テーブル・メトリクス',
    reading: 'おーえすつーてーぶる',
    english: 'OS/2 Table / Line Metrics',
    category: 'format',
    shortSummary: 'OS やソフトウェアに文字の高さや太さ・行間を伝える管理情報',
    easyExplanation:
      'フォントファイル内に記録されるメタデータです。アセンダ・ディセンダ・行間・ウェイト値（100〜900）を定義し、Word やブラウザなどで行高や太さの判定に使われます。',
    appFeatureTip: '「フォント情報」モーダルからファミリー名や OS/2 メトリクスを編集できます。',
  },
  {
    id: 'diagnostics',
    term: 'フォント品質診断',
    reading: 'ひんしつしんだん',
    english: 'Font Diagnostics / Quality Check',
    category: 'format',
    shortSummary: '全グリフの輪郭エラーやメトリクス不備を検出する機能',
    easyExplanation:
      '未閉鎖パス、自己交差、過密ノード、極値ノードの欠落、ベースラインからの逸脱などを一覧で検出し、出力前に修正する機能です。',
    appFeatureTip: 'ヘッダーの「品質診断」から全文字の検査と一括修復を実行できます。',
  },
  {
    id: 'otf-ttf',
    term: 'OTF / TTF（フォントファイル形式）',
    reading: 'おーてぃーえふ / てぃーてぃーえふ',
    english: 'OpenType (.otf) / TrueType (.ttf)',
    category: 'format',
    shortSummary: 'OS やアプリケーションにインストールして使用する標準フォント形式',
    easyExplanation:
      'OTF（CFF アウトライン）は 3 次ベジェ曲線を用い、DTP ソフトや主要 OS（Windows / macOS / iPadOS）で広く利用される形式です。TTF は 2 次ベジェ曲線を用いる形式です。',
    appFeatureTip: 'このアプリでは .otf（OpenType / CFF）形式で書き出します。読み込みは .ttf / .otf / .woff に対応しています。',
  },
  {
    id: 'font-weight',
    term: 'ウェイト（太さ・ファミリー）',
    reading: 'うぇいと',
    english: 'Font Weight',
    category: 'basic',
    shortSummary: '同一書体内における線の太さの段階',
    easyExplanation:
      'Light（細字）、Regular（標準）、Medium（中太）、Bold（太字）、ExtraBold（極太）のように、同じ設計方針で太さだけを変えた書体群をフォントファミリーと呼びます。',
    appFeatureTip: '「機能」メニューのウェイト補間から 5 段階の .otf を生成し、ZIP で一括出力できます。',
  },
];
