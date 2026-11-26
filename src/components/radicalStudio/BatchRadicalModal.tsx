import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useDialogFocusTrap } from '../modals/ModalStackFrame';
import { Sparkles, AlertCircle } from 'lucide-react';
import { PathContour, RadicalPlacement, GlyphData } from '../../types';
import { transformContoursForPlacement, contoursToSvgPath } from '../../utils/path';
import { getThemeClasses, ThemeMode } from '../../utils/theme';
import { ModalFooter } from '../modals/ModalFooter';
import { ModalSection } from '../modals/ModalSection';
import { ModalShell } from '../modals/ModalShell';

export interface BatchRadicalModalProps {
  isOpen: boolean;
  onClose: () => void;
  radicalName: string;
  sourceContours: PathContour[];
  defaultKanjiList?: string[];
  allGlyphs: Record<number, GlyphData>;
  onBatchInsert: (contours: PathContour[], targetChars: string[]) => void;
  theme: ThemeMode;
  /** Baseline Y in screen coordinates. Placed contours never extend below it. */
  baselineY?: number;
  /** Units per em of the project. The placement preview uses it for its viewBox. */
  unitsPerEm?: number;
}

/**
 * Default batch selection: only kanji with no contours yet, up to `limit`.
 * Selecting already-drawn kanji by default would append the radical a
 * second time to kanji that already contain it.
 */
export function getDefaultBatchSelection(
  defaultKanjiList: readonly string[],
  allGlyphs: Record<number, GlyphData>,
  limit = 30
): string[] {
  return defaultKanjiList
    .filter((ch) => {
      const code = ch.codePointAt(0);
      if (!code) return false;
      const glyph = allGlyphs[code];
      return !glyph || !glyph.contours || glyph.contours.length === 0;
    })
    .slice(0, limit);
}

const EMPTY_KANJI_LIST: string[] = [];

export const BatchRadicalModal: React.FC<BatchRadicalModalProps> = ({
  isOpen,
  onClose,
  radicalName,
  sourceContours,
  defaultKanjiList = EMPTY_KANJI_LIST,
  allGlyphs,
  onBatchInsert,
  theme,
  baselineY,
  unitsPerEm,
}) => {
  const themeClasses = getThemeClasses(theme);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocusTrap(dialogRef, isOpen, onClose);

  const [placement, setPlacement] = useState<RadicalPlacement>('hen');
  const [selectedChars, setSelectedChars] = useState<Set<string>>(() => {
    return new Set(getDefaultBatchSelection(defaultKanjiList, allGlyphs));
  });
  const [customInput, setCustomInput] = useState('');

  const defaultKanjiKey = defaultKanjiList.join('\u0000');
  React.useEffect(() => {
    if (isOpen) {
      setSelectedChars(new Set(getDefaultBatchSelection(defaultKanjiList, allGlyphs)));
      setCustomInput('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultKanjiKey]);

  // Transformed contours preview
  const transformedContours = useMemo(() => {
    return transformContoursForPlacement(sourceContours, placement, undefined, { baselineY, unitsPerEm });
  }, [sourceContours, placement, baselineY, unitsPerEm]);

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
    <div ref={dialogRef}>
      <ModalShell
      title="部首パーツの複数漢字一括流し込み（バッチ合成）"
      subtitle={`「${radicalName}」パーツを対象漢字群に一括で変形配置・合成します`}
      theme={theme}
      themeClasses={themeClasses}
      maxWidth="3xl"
      onClose={onClose}
      ariaLabel="部首パーツの一括流し込み"
      footer={
        <ModalFooter
          primaryLabel={`選択した ${selectedChars.size} 文字へ一括流し込み`}
          primaryIcon={<Sparkles className="w-3.5 h-3.5" />}
          onPrimary={handleExecuteBatch}
          primaryDisabled={selectedChars.size === 0}
          onCancel={onClose}
          leftInfo={
            <span className={`text-[11px] flex items-center gap-1.5 ${themeClasses.textMuted}`}>
              <AlertCircle className={`w-4 h-4 shrink-0 ${themeClasses.accentText}`} />
              <span>既存の作図データがある文字は、輪郭を保護したまま追加合成されます</span>
            </span>
          }
          theme={theme}
          themeClasses={themeClasses}
        />
      }
    >
      <div className="space-y-3">
        {/* Configuration: Placement & Preview */}
        <ModalSection title="変形配置位置" themeClasses={themeClasses}>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Radical Preview Box */}
            <div
              className={`w-20 h-20 rounded-xl border flex items-center justify-center relative overflow-hidden shrink-0 ${themeClasses.cardBg} ${themeClasses.border}`}
            >
              <svg viewBox={`0 0 ${unitsPerEm ?? 1000} ${unitsPerEm ?? 1000}`} className="w-full h-full p-2">
                <rect x="0" y="0" width={unitsPerEm ?? 1000} height={unitsPerEm ?? 1000} fill="none" stroke="currentColor" strokeDasharray="40 40" strokeWidth="10" className="text-stone-300 dark:text-stone-700" />
                <path d={previewSvgPath} fill="currentColor" className="text-emerald-600 dark:text-emerald-400" />
              </svg>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 flex-1 w-full">
              {[
                { id: 'hen', label: '偏 (左)' },
                { id: 'tsukuri', label: '旁 (右)' },
                { id: 'kanmuri', label: '冠 (上)' },
                { id: 'ashi', label: '脚 (下)' },
                { id: 'tare', label: '垂 (左上)' },
                { id: 'nyo', label: '繞 (左下)' },
                { id: 'kamae', label: '構 (囲み)' },
                { id: 'original', label: '原寸' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPlacement(item.id as RadicalPlacement)}
                  className={`min-h-[44px] px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
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
        </ModalSection>

        {/* Quick Stats & Custom Input */}
        <ModalSection title="流し込み対象漢字の追加指定（自由入力）" themeClasses={themeClasses}>
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
        </ModalSection>

        {/* Selection */}
        <ModalSection
          title="対象漢字の選択"
          badge={
            <span className={`text-[11px] font-bold ${themeClasses.textPrimary}`}>
              対象選択: <strong className={themeClasses.accentText}>{selectedChars.size}</strong> / {candidateKanjiList.length} 文字
            </span>
          }
          themeClasses={themeClasses}
        >
          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
            <button
              onClick={handleSelectAll}
              className={`min-h-[44px] sm:min-h-0 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
            >
              全選択
            </button>
            <button
              onClick={handleSelectMissingOnly}
              className={`min-h-[44px] sm:min-h-0 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer ${themeClasses.border}`}
            >
              未作成のみ選択
            </button>
            <button
              onClick={handleDeselectAll}
              className={`min-h-[44px] sm:min-h-0 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`}
            >
              全解除
            </button>
          </div>

          {/* Candidates Grid */}
          <div className="min-h-[240px] max-h-[45vh] overflow-y-auto">
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
                          ? themeClasses.accentBadge
                          : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.activeToolHover}`
                      }`}
                    >
                      <span className="text-xl font-medium leading-none mb-1">{ch}</span>
                      <span className="text-[9px] font-mono leading-none opacity-60">
                        {hasExisting ? `${glyph.contours.length}画あり` : '未作成'}
                      </span>
                      {isSelected && (
                        <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${themeClasses.accentBtn}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </ModalSection>
      </div>
    </ModalShell>
    </div>
  );
};
