import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Search, Maximize2, Minimize2 } from 'lucide-react';
import { ThemeMode, isLightTheme, getThemeClasses } from '../utils/theme';
import { BeginnerTutorialTab } from './help/BeginnerTutorialTab';
import { GlossaryTab } from './help/GlossaryTab';
import { FeedbackTab } from './help/FeedbackTab';
import { useIsTopModal, useDialogFocusTrap } from './modals/ModalStackFrame';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  initialTab?: 'tutorial' | 'glossary' | 'features' | 'shortcuts' | 'faq' | 'feedback';
}

type ShortcutCategoryId = 'mouse' | 'tools' | 'drawing' | 'view' | 'nav' | 'edit' | 'modal';

interface ShortcutItem {
  keys: string[];
  description: string;
  category: ShortcutCategoryId;
}

const SHORTCUTS: ShortcutItem[] = [
  // マウス・ホイール
  { keys: ['ホイール'], description: 'キャンバスを上下にスクロール', category: 'mouse' },
  { keys: ['Shift', '+', 'ホイール'], description: 'キャンバスを左右にスクロール', category: 'mouse' },
  { keys: ['Ctrl / ⌘', '+', 'ホイール'], description: 'カーソル位置を中心に拡大・縮小（10%〜3200%）', category: 'mouse' },
  { keys: ['Alt', '+', 'ホイール'], description: 'ブラシ・消しゴムのサイズを変更', category: 'mouse' },
  { keys: ['中ボタンドラッグ'], description: 'キャンバスをパン移動', category: 'mouse' },
  { keys: ['Space', '+', '左ドラッグ'], description: 'キャンバスをパン移動', category: 'mouse' },
  { keys: ['パスをダブルクリック'], description: '対象輪郭を選択してノード編集モードに切り替え', category: 'mouse' },
  { keys: ['Shift', '+', '左クリック'], description: '選択中の輪郭・ノードへの追加と除外を切り替え', category: 'mouse' },
  { keys: ['右クリック'], description: '反転・回転・2次/3次ベジェ変換・部首登録メニューを表示', category: 'mouse' },
  { keys: ['Shift', '+', 'ドラッグ'], description: '筆描画時に直前位置から水平・垂直・45 度の直線を描画', category: 'mouse' },

  // ツール切替
  { keys: ['B'], description: '筆ツールに切り替え', category: 'tools' },
  { keys: ['P'], description: 'ペンツール（ベジェ曲線）に切り替え', category: 'tools' },
  { keys: ['V'], description: '選択ツール（輪郭移動・ノード編集）に切り替え', category: 'tools' },
  { keys: ['E'], description: '消しゴムツールに切り替え', category: 'tools' },
  { keys: ['R'], description: '長方形ツールに切り替え（下絵調整中は位置リセット）', category: 'tools' },
  { keys: ['O'], description: '楕円ツールに切り替え', category: 'tools' },
  { keys: ['M'], description: '定規（距離計測）ツールに切り替え', category: 'tools' },

  // 描画・パス編集
  { keys: ['Ctrl / ⌘', '+', 'C'], description: '現在の文字の輪郭をコピー', category: 'drawing' },
  { keys: ['Ctrl / ⌘', '+', 'V'], description: 'コピーした輪郭を貼り付け', category: 'drawing' },
  { keys: ['↑', '↓', '←', '→'], description: '選択要素を 1 単位移動（Shift で 10 単位、Alt で 0.1 単位）', category: 'drawing' },
  { keys: ['C'], description: 'ペン描画中はパスを閉じて確定 / ノード選択中はスムーズとコーナーを切り替え', category: 'drawing' },
  { keys: ['Alt', '+', 'S'], description: 'パスの単純化を実行（ノード数を削減）', category: 'drawing' },
  { keys: ['Shift', '+', 'Alt', '+', 'S'], description: '左右余白（サイドベアリング）と送り幅を自動設定', category: 'drawing' },
  { keys: ['Shift', '+', 'S'], description: '選択ストロークを平滑化', category: 'drawing' },
  { keys: ['['], description: 'ブラシサイズを縮小（-4px、筆ツール時）', category: 'drawing' },
  { keys: [']'], description: 'ブラシサイズを拡大（+4px、筆ツール時）', category: 'drawing' },
  { keys: ['Shift', '+', '['], description: '消しゴムサイズを縮小（消しゴムツール時）', category: 'drawing' },
  { keys: ['Shift', '+', ']'], description: '消しゴムサイズを拡大（消しゴムツール時）', category: 'drawing' },
  { keys: ['Enter'], description: 'ペン描画中は開いたパスとして確定 / 定規計測中は計測線をストローク化', category: 'drawing' },
  { keys: ['Backspace', '/', 'Delete'], description: 'ペン描画中は直前の 1 点を削除 / 通常時は選択要素を削除', category: 'drawing' },

  // 表示・ズーム
  { keys: ['0'], description: 'キャンバス全体を画面にフィット', category: 'view' },
  { keys: ['1'], description: '等倍表示（100%）', category: 'view' },
  { keys: ['W'], description: 'キャンバス幅に合わせて拡大', category: 'view' },
  { keys: ['+'], description: 'ズームイン', category: 'view' },
  { keys: ['-'], description: 'ズームアウト', category: 'view' },
  { keys: ['F'], description: 'サイドバー収納の集中モード切替', category: 'view' },
  { keys: ['Shift', '+', 'O', 'または', 'Alt + O'], description: '輪郭線表示と塗りつぶし表示を切り替え', category: 'view' },
  { keys: ['N'], description: 'ノードとハンドルの表示を切り替え', category: 'view' },
  { keys: ['G'], description: '方眼グリッドの表示を切り替え', category: 'view' },
  { keys: ['H'], description: '照準ポインター・十字線の表示を切り替え', category: 'view' },

  // 文字移動
  { keys: ['Alt', '+', '→'], description: '次の文字に移動（輪郭・頂点の選択中は0.1単位のナッジ）', category: 'nav' },
  { keys: ['Alt', '+', '←'], description: '前の文字に移動（輪郭・頂点の選択中は0.1単位のナッジ）', category: 'nav' },

  // 履歴・保存
  { keys: ['Ctrl / ⌘', '+', 'Z'], description: '元に戻す（ペン描画中は直前の 1 点を取り消し）', category: 'edit' },
  { keys: ['Ctrl / ⌘', '+', 'Shift', '+', 'Z'], description: 'やり直す', category: 'edit' },
  { keys: ['Ctrl / ⌘', '+', 'Y'], description: 'やり直す', category: 'edit' },
  { keys: ['Ctrl / ⌘', '+', 'S'], description: '現在の作業を保存', category: 'edit' },
  { keys: ['Esc'], description: 'ペン描画の中止 / 選択解除 / モーダルを閉じる', category: 'edit' },
  { keys: ['?'], description: 'この説明書・ショートカットモーダルを開く', category: 'edit' },

  // 各モーダル内ショートカット
  { keys: ['R'], description: '品質診断: 再スキャンを実行 / ストレージ管理: 一覧を再読込', category: 'modal' },
  { keys: ['H'], description: '品質診断・密度ヒートマップ: 密度ヒートマップの表示を切り替え', category: 'modal' },
  { keys: ['/'], description: '品質診断: 検索入力欄にフォーカス', category: 'modal' },
  { keys: ['1 ~ 7'], description: '品質診断: 検査カテゴリを切り替え', category: 'modal' },
  { keys: ['Enter'], description: '密度ヒートマップ: 過密な輪郭を一括単純化', category: 'modal' },
  { keys: ['1 / 2 / 3'], description: '密度ヒートマップ: 単純化強度（2px / 3.5px / 5px）を切り替え', category: 'modal' },
  { keys: ['P'], description: '密度ヒートマップ: アンカー密集度ドットの表示を切り替え', category: 'modal' },
];

const SHORTCUT_CATEGORIES: { id: 'all' | ShortcutCategoryId; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'mouse', label: 'マウス・ホイール' },
  { id: 'tools', label: 'ツール' },
  { id: 'drawing', label: '描画・編集' },
  { id: 'view', label: '表示・ズーム' },
  { id: 'nav', label: '文字移動' },
  { id: 'edit', label: '履歴・保存' },
  { id: 'modal', label: '各画面内' },
];

const FEATURE_ITEMS = [
  {
    title: '筆ツールと手振れ補正',
    body: '毛筆・万年筆・丸ペンなどの筆スタイルを選択し、手書き座標を平滑化して閉じたベクター輪郭を生成します。',
  },
  {
    title: '濁点・半濁点・小書き合成',
    body: '「か・さ・た・は」などの清音グリフを基に、濁点（゛）・半濁点（゜）付き文字や「っ・ゃ・ゅ・ょ」を一括生成します。',
  },
  {
    title: '部首・パーツ管理',
    body: '「さんずい」「きへん」などのパーツを部首として保存し、別の漢字キャンバスへ配置・統合して再利用できます。',
  },
  {
    title: '下絵トレース',
    body: 'PNG / JPG / SVG 画像をキャンバス背面に表示し、不透明度・拡大率・位置を調整しながら輪郭をなぞれます。',
  },
  {
    title: 'SVG ベクター取り込み',
    body: 'Illustrator や Figma 等で作成した SVG データを読み込み、パス構造をフォント座標系（1000 UPM）の輪郭に変換します。',
  },
  {
    title: '品質診断と輪郭修正',
    body: '極値ノード不足、パスの向き不整合、自己交差、重複頂点、過剰ノードを検出し、文字単位または一括で修復できます。',
  },
  {
    title: '作図ガイドとスナップ',
    body: '十文字・田字格・九宮格・米字格・十六宮格などの目安線、縦分割ガイド、欧文基準線を表示し、グリッド・ガイド・頂点へのスナップを行えます。',
  },
  {
    title: 'タッチジェスチャーとパームリジェクション',
    body: 'スタイラス入力時に手の接触による誤描画を抑える設定と、2 本指タップ（元に戻す）・3 本指タップ（やり直す）・2 本指ピンチ（拡大縮小）に対応します。',
  },
  {
    title: 'ウェイト展開（ZIP 出力）',
    body: '基準ウェイトの輪郭から Light / Regular / Medium / Bold / ExtraBold の 5 段階の .otf を生成し、ZIP アーカイブでまとめてダウンロードします。',
  },
  {
    title: 'プロジェクト保存とスナップショット',
    body: 'ブラウザ（IndexedDB / localStorage）への自動保存に加え、任意時点のスナップショット作成や .json ファイルの書き出し・読み込みができます。',
  },
];

const FAQ_ITEMS = [
  {
    question: '作成したフォントは商用利用や再配布ができますか。',
    answer:
      '自分で描画・作成したグリフの権利は制作者に帰属するため、商業印刷、Web サイト、ゲーム、動画字幕など用途を問わず利用・配布できます。既存の外部フォントを読み込んで改変する場合は、元フォントのライセンス条件に従ってください。',
  },
  {
    question: '出力した .otf ファイルを Windows / macOS にインストールする手順は。',
    answer:
      'Windows ではダウンロードした .otf ファイルを右クリックして「インストール」（または「すべてのユーザーに対してインストール」）を実行します。macOS ではファイルをダブルクリックして Font Book を開き、「フォントをインストール」を選択します。',
  },
  {
    question: 'iPad や iPhone で作成したフォントを使うにはどうすればよいですか。',
    answer:
      '書き出し時に共有メニューから「ファイル」アプリへ保存したのち、Fontcase や iFont などのフォント管理アプリに .otf を取り込んで構成プロファイルをインストールすると、Pages や CLIP STUDIO PAINT 等で利用できます。',
  },
  {
    question: '作業途中のデータを端末外にバックアップできますか。',
    answer:
      'ヘッダーの「保存」メニューからプロジェクトファイル（.fontproj.json）をダウンロードできます。別端末や別ブラウザで作業を再開する場合は、同メニューから読み込んでください。',
  },
  {
    question: 'Apple Pencil で筆圧に応じて線の太さを変える設定はどこにありますか。',
    answer:
      '筆ツール選択時のサブツールバーにある筆圧設定から、筆圧の有効・無効と感度（高 / 標準 / 低）を変更できます。手の接触を防ぐパームリジェクションは設定メニューから切り替えられます。',
  },
  {
    question: '画数の多い漢字でノード数が増えすぎた場合はどうすればよいですか。',
    answer:
      'Alt + S（パスの単純化）を実行すると、輪郭形状の誤差を抑えたまま不要なノードを削減できます。品質診断内の「密度ヒートマップ」から文字全体を一括で単純化することも可能です。',
  },
  {
    question: '不具合を見つけた場合はどこに報告すればよいですか。',
    answer:
      '「不具合報告」タブのリンクから GitHub Issue を作成してください。再現手順、使用端末・ブラウザ、プロジェクト JSON ファイルを添えると原因調査が行いやすくなります。',
  },
];

type MainTab = 'tutorial' | 'glossary' | 'features' | 'shortcuts' | 'faq' | 'feedback';

const TABS: { id: MainTab; label: string; mobileLabel?: string }[] = [
  { id: 'tutorial', label: '操作手順' },
  { id: 'glossary', label: '用語辞典' },
  { id: 'features', label: '機能一覧' },
  { id: 'shortcuts', label: 'ショートカット' },
  { id: 'faq', label: 'よくある質問' },
  { id: 'feedback', label: '不具合報告' },
];

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({
  isOpen,
  onClose,
  theme,
  initialTab = 'tutorial',
}) => {
  const [activeTab, setActiveTab] = useState<MainTab>(initialTab);
  const [selectedCategory, setSelectedCategory] = useState<'all' | ShortcutCategoryId>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const isLight = isLightTheme(theme);
  const themeClasses = getThemeClasses(theme);
  const isTopModal = useIsTopModal();

  useDialogFocusTrap(modalRef, isOpen && isTopModal, () => {
    if (isFullscreen) {
      setIsFullscreen(false);
    } else {
      onClose();
    }
  });

  // Keyboard shortcut: F toggles fullscreen outside form fields
  useEffect(() => {
    if (!isOpen || !isTopModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput =
        activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';
      if ((e.key === 'f' || e.key === 'F') && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTopModal]);

  const filteredShortcuts = useMemo(() => {
    return SHORTCUTS.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesKey = item.keys.some((k) => k.toLowerCase().includes(q));
        return matchesDesc || matchesKey;
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const dividerClass = isLight ? 'border-stone-200' : 'border-[#25362b]';
  const headingText = isLight ? 'text-stone-900' : 'text-stone-100';
  const mutedText = isLight ? 'text-stone-600' : 'text-stone-300';
  const subtleText = isLight ? 'text-stone-500' : 'text-stone-400';

  return (
    <div
      className={`fixed inset-0 z-[60] ${
        isFullscreen
          ? 'p-0 w-screen h-[100dvh] bg-black/85 flex flex-col'
          : 'flex items-center justify-center p-2 sm:p-4 bg-black/75'
      }`}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="操作ガイドとショートカット"
        tabIndex={-1}
        className={`flex flex-col overflow-hidden ${themeClasses.modalBg} ${
          isFullscreen
            ? 'w-screen h-[100dvh] rounded-none border-none shadow-none'
            : `w-full max-w-5xl xl:max-w-6xl border ${themeClasses.border} rounded-xl shadow-2xl max-h-[92dvh]`
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-4 sm:px-5 py-2.5 border-b shrink-0 ${themeClasses.headerBg}`}
        >
          <div className="min-w-0 flex-1 pr-3 flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
            <h2 className={`text-sm sm:text-base font-bold truncate ${headingText}`}>
              操作ガイド・ショートカット
            </h2>
            <p className={`text-xs truncate ${themeClasses.textMuted}`}>
              作字手順、用語解説、機能概要、キーボード操作
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`px-2.5 py-1.5 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                isFullscreen
                  ? themeClasses.activeTool
                  : `${themeClasses.cardBg} ${themeClasses.activeToolHover}`
              }`}
              title={isFullscreen ? '通常サイズに戻す (F)' : '全画面で表示する (F)'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">通常表示</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">全画面</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="閉じる"
              className={`p-1.5 rounded-md border transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
              title="閉じる (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav
          aria-label="ガイド項目"
          className={`flex items-center px-4 sm:px-5 border-b shrink-0 gap-4 sm:gap-6 overflow-x-auto custom-scrollbar touch-scroll-x min-w-0 text-xs ${themeClasses.subtoolbarBg}`}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-2.5 border-b-2 shrink-0 transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? `${themeClasses.accentBorder} ${themeClasses.accentText} font-bold`
                    : `border-transparent ${themeClasses.textMuted} hover:text-stone-900 dark:hover:text-stone-100 font-medium`
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {activeTab === 'tutorial' && (
            <BeginnerTutorialTab
              isLight={isLight}
              onOpenGlossary={() => setActiveTab('glossary')}
              onOpenFaq={() => setActiveTab('faq')}
            />
          )}

          {activeTab === 'glossary' && <GlossaryTab isLight={isLight} />}

          {activeTab === 'features' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <h3 className={`text-sm font-bold ${headingText}`}>主な機能</h3>
                <p className={`text-xs ${mutedText}`}>
                  文字の描画から品質検査・書き出しまでに利用する機能の一覧です。
                </p>
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-3 pt-3 border-t ${dividerClass}`}>
                {FEATURE_ITEMS.map((item) => (
                  <div
                    key={item.title}
                    className={`pb-3 border-b ${dividerClass} space-y-1`}
                  >
                    <h4 className={`text-xs font-bold ${headingText}`}>{item.title}</h4>
                    <p className={`text-xs leading-relaxed ${mutedText}`}>{item.body}</p>
                  </div>
                ))}
              </div>

              <div className="pt-1 space-y-1">
                <h4 className={`text-xs font-bold ${headingText}`}>
                  字面枠と余白（サイドベアリング）の目安
                </h4>
                <p className={`text-xs leading-relaxed ${mutedText}`}>
                  文字が隣り合って重ならないように、キャンバス内の字面枠を目安に輪郭を配置します。文字描画後に Shift + Alt + S を押すと、輪郭の幅に応じて左右余白と送り幅を自動設定できます。
                </p>
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-3">
              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                <div className="relative flex-1">
                  <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${subtleText}`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="操作名やキーで検索（例: 単純化, ズーム, Ctrl, Shift）"
                    className={`w-full pl-9 pr-3 py-1.5 rounded-md border text-xs outline-none transition-colors ${
                      isLight
                        ? 'bg-white border-stone-300 text-stone-900 focus:border-emerald-600'
                        : 'bg-[#121c16] border-[#2c3d31] text-stone-100 focus:border-emerald-500'
                    }`}
                  />
                </div>
                <span className={`text-xs font-mono tabular-nums shrink-0 ${subtleText}`}>
                  {filteredShortcuts.length} 件
                </span>
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs no-scrollbar">
                {SHORTCUT_CATEGORIES.map((cat) => {
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-md font-medium shrink-0 whitespace-nowrap transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-emerald-700 text-white'
                          : isLight
                          ? 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                          : 'bg-[#1a261f] hover:bg-[#23332a] text-stone-300'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Shortcut Table */}
              {filteredShortcuts.length > 0 ? (
                <div className={`border-t ${dividerClass} grid grid-cols-1 lg:grid-cols-2 lg:gap-x-8`}>
                  {filteredShortcuts.map((item, idx) => (
                    <div
                      key={`${item.category}-${idx}`}
                      className={`py-2 border-b ${dividerClass} flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs`}
                    >
                      <span className={`jp-wrap leading-snug ${isLight ? 'text-stone-800' : 'text-stone-200'}`}>
                        {item.description}
                      </span>
                      <div className="flex items-center flex-wrap gap-1 shrink-0">
                        {item.keys.map((k, kIdx) =>
                          k === 'または' || k === '+' || k === '/' ? (
                            <span key={kIdx} className={`px-0.5 text-[11px] ${subtleText}`}>
                              {k}
                            </span>
                          ) : (
                            <kbd
                              key={kIdx}
                              className={`px-1.5 py-0.5 rounded font-mono font-semibold text-[11px] border ${
                                isLight
                                  ? 'bg-stone-50 border-stone-300 text-stone-800'
                                  : 'bg-[#121c16] border-[#2c3d31] text-stone-200'
                              }`}
                            >
                              {k}
                            </kbd>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-center py-8 text-xs ${subtleText}`}>
                  一致するショートカットはありません。
                </p>
              )}
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <h3 className={`text-sm font-bold ${headingText}`}>よくある質問</h3>
                <p className={`text-xs ${mutedText}`}>
                  フォントの利用範囲、OS への導入手順、バックアップに関する質問と回答です。
                </p>
              </div>
              <dl className={`grid grid-cols-1 lg:grid-cols-2 lg:gap-x-8 border-t ${dividerClass}`}>
                {FAQ_ITEMS.map((item) => (
                  <div key={item.question} className={`py-3 border-b ${dividerClass} space-y-1`}>
                    <dt className={`text-xs font-bold ${headingText}`}>{item.question}</dt>
                    <dd className={`text-xs leading-relaxed ${mutedText}`}>{item.answer}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {activeTab === 'feedback' && <FeedbackTab isLight={isLight} />}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-4 sm:px-5 py-2.5 border-t shrink-0 text-xs ${themeClasses.headerBg}`}
        >
          <div className={`flex items-center gap-1.5 max-sm:hidden ${themeClasses.textMuted}`}>
            <kbd className={`px-1.5 py-0.5 rounded font-mono font-semibold text-[10px] border ${themeClasses.cardBg}`}>
              ?
            </kbd>
            <span>キーでいつでもこの画面を開けます</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 rounded-md font-bold transition-colors cursor-pointer ${themeClasses.accentBtn}`}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
