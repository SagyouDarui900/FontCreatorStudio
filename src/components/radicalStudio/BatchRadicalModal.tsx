import React, { useState, useMemo, useCallback } from 'react';
import {
  X,
  Layers,
  CheckSquare,
  Square,
  Sparkles,
  ArrowRight,
  Plus,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { PathContour, RadicalPlacement, GlyphData } from '../../types';
import { transformContoursForPlacement, contoursToSvgPath } from '../../utils/path';
import { getThemeClasses, ThemeMode } from '../../utils/theme';

export interface BatchRadicalModalProps {
  isOpen: boolean;
  onClose: () => void;
  radicalName: string;
  sourceContours: PathContour[];
  defaultKanjiList?: string[];
  allGlyphs: Record<number, GlyphData>;
  onBatchInsert: (contours: PathContour[], targetChars: string[]) => void;
  theme: ThemeMode;
}

export const BatchRadicalModal: React.FC<BatchRadicalModalProps> = ({
  isOpen,
  onClose,
  radicalName,
  sourceContours,
  defaultKanjiList = [],
  allGlyphs,
  onBatchInsert,
  theme,
}) => {
  const themeClasses = getThemeClasses(theme);

  const [placement, setPlacement] = useState<RadicalPlacement>('hen');
  const [selectedChars, setSelectedChars] = useState<Set<string>>(() => {
    return new Set(defaultKanjiList.slice(0, 30));
  });
  const [customInput, setCustomInput] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setSelectedChars(new Set(defaultKanjiList.slice(0, 30)));
      setCustomInput('');
    }
  }, [isOpen, defaultKanjiList]);

  // Transformed contours preview
  const transformedContours = useMemo(() => {
    return transformContoursForPlacement(sourceContours, placement);
  }, [sourceContours, placement]);

  const previewSvgPath = useMemo(() => {
    return contoursToSvgPath(transformedContours);
  }, [transformedContours]);

  // Combine default kanji list with user custom input
  const candidateKanjiList = useMemo(() => {
    const list = [...defaultKanjiList];
    if (customInput.trim()) {
      const added = customInput
        .replace(/[\s,、]+/g, '')
        .split('')
        .filter((c) => c.trim().length > 0);
      added.forEach((ch) => {
        if (!list.includes(ch)) list.push(ch);
      });
    }
    return list;
  }, [defaultKanjiList, customInput]);

  const handleToggleChar = useCallback((ch: string) => {
    setSelectedChars((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedChars(new Set(candidateKanjiList));
  }, [candidateKanjiList]);

  const handleSelectMissingOnly = useCallback(() => {
    const missingOnly = candidateKanjiList.filter((ch) => {
      const code = ch.codePointAt(0);
      if (!code) return false;
      const g = allGlyphs[code];
      return !g || !g.contours || g.contours.length === 0;
    });
    setSelectedChars(new Set(missingOnly));
  }, [candidateKanjiList, allGlyphs]);

  const handleDeselectAll = useCallback(() => {
    setSelectedChars(new Set());
  }, []);

  const handleExecuteBatch = useCallback(() => {
    const chars = Array.from(selectedChars);
    if (chars.length === 0) return;
    onBatchInsert(transformedContours, chars);
    onClose();
  }, [selectedChars, transformedContours, onBatchInsert, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-black/75 anim-fade"
    >
      <div
        className={`w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${themeClasses.modalBg} ${themeClasses.border}`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${themeClasses.toolbarBg} ${themeClasses.border}`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-bold flex items-center gap-2 ${themeClasses.textPrimary}`}>
                部首パーツの複数漢字一括流し込み（バッチ合成）
              </h2>
              <p className={`text-xs ${themeClasses.textMuted}`}>
                「{radicalName}」パーツを対象漢字群に一括で変形配置・合成します
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${themeClasses.textMuted} ${themeClasses.activeToolHover}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Row: Placement & Preview */}
        <div
          className={`p-4 border-b flex flex-col sm:flex-row items-center gap-4 shrink-0 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
        >
          {/* Radical Preview Box */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              className={`w-20 h-20 rounded-xl border flex items-center justify-center relative overflow-hidden ${themeClasses.cardBg} ${themeClasses.border}`}
            >
              <svg viewBox="0 0 1000 1000" className="w-full h-full p-2">
                <rect x="0" y="0" width="1000" height="1000" fill="none" stroke="currentColor" strokeDasharray="40 40" strokeWidth="10" className="text-stone-300 dark:text-stone-700" />
                <path d={previewSvgPath} fill="currentColor" className="text-emerald-600 dark:text-emerald-400" />
              </svg>
            </div>
            <div>
              <span className={`text-xs font-bold block mb-1 ${themeClasses.textPrimary}`}>
                変形配置位置
              </span>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { id: 'hen', label: '偏 (左)' },
                  { id: 'tsukuri', label: '旁 (右)' },
                  { id: 'kanmuri', label: '冠 (上)' },
                  { id: 'ashi', label: '脚 (下)' },
                  { id: 'tare', label: '垂 (左上)' },
                  { id: 'nyo', label: '繞 (左下)' },
                  { id: 'kamae', label: '構 (囲み)' },
                  { id: 'full', label: '原寸' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setPlacement(item.id as RadicalPlacement)}
                    className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                      placement === item.id
                        ? themeClasses.accentBtn
                        : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Stats & Custom Input */}
          <div className={`flex-1 w-full border-t sm:border-t-0 sm:border-l sm:pl-4 pt-3 sm:pt-0 ${themeClasses.border}`}>
            <label className={`text-xs font-bold block mb-1 ${themeClasses.textPrimary}`}>
              流し込み対象漢字の追加指定（自由入力）
            </label>
            <input
              type="text"
              placeholder="例: 村林森校板桜 (文字を直接入力またはペースト)"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
            />
            <p className={`text-[10px] mt-1 ${themeClasses.textMuted}`}>
              ※対象部首を含む標準漢字リストに加えて、入力した文字も選択候補に追加されます
            </p>
          </div>
        </div>

        {/* Selection Toolbar */}
        <div
          className={`px-4 py-2 border-b flex items-center justify-between text-xs shrink-0 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
        >
          <div className="flex items-center gap-1.5">
            <span className={`font-bold ${themeClasses.textPrimary}`}>
              対象選択: <strong className={themeClasses.accentText}>{selectedChars.size}</strong> / {candidateKanjiList.length} 文字
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSelectAll}
              className={`px-2 py-0.5 rounded border text-[11px] font-bold transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
            >
              全選択
            </button>
            <button
              onClick={handleSelectMissingOnly}
              className={`px-2 py-0.5 rounded border text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer ${themeClasses.border}`}
            >
              未作成のみ選択
            </button>
            <button
              onClick={handleDeselectAll}
              className={`px-2 py-0.5 rounded border text-[11px] font-bold transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
            >
              全解除
            </button>
          </div>
        </div>

        {/* Candidates Grid */}
        <div className="flex-1 min-h-[240px] max-h-[45vh] overflow-y-auto p-4">
          {candidateKanjiList.length === 0 ? (
            <div className={`h-32 flex items-center justify-center text-xs ${themeClasses.textMuted}`}>
              候補漢字がありません。上の入力欄に漢字を追加してください。
            </div>
          ) : (
            <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-2">
              {candidateKanjiList.map((ch) => {
                const isSelected = selectedChars.has(ch);
                const code = ch.codePointAt(0) || 0;
                const glyph = allGlyphs[code];
                const hasExisting = glyph && glyph.contours && glyph.contours.length > 0;

                return (
                  <button
                    key={ch}
                    onClick={() => handleToggleChar(ch)}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-colors cursor-pointer relative ${
                      isSelected
                        ? `${themeClasses.accentBadge} ring-2 ring-emerald-500/20`
                        : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
                    }`}
                  >
                    <span className="text-xl font-medium leading-none mb-1">{ch}</span>
                    <span className="text-[9px] font-mono leading-none opacity-60">
                      {hasExisting ? `${glyph.contours.length}画あり` : '未作成'}
                    </span>
                    {isSelected && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3 border-t flex items-center justify-between shrink-0 ${themeClasses.toolbarBg} ${themeClasses.border}`}
        >
          <div className={`text-xs flex items-center gap-1.5 ${themeClasses.textMuted}`}>
            <AlertCircle className={`w-4 h-4 shrink-0 ${themeClasses.accentText}`} />
            <span>既存の作図データがある文字は、輪郭を保護したまま追加合成されます</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
            >
              キャンセル
            </button>
            <button
              disabled={selectedChars.size === 0}
              onClick={handleExecuteBatch}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold disabled:opacity-40 flex items-center gap-1.5 shadow-md transition-colors cursor-pointer ${themeClasses.accentBtn}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>選択した {selectedChars.size} 文字へ一括流し込み</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
