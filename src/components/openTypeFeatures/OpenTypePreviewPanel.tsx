import React, { useEffect, useRef, useState } from 'react';
import { Eye, Info } from 'lucide-react';
import { FontProject } from '../../types';
import { compileFont, stripInvalidPixelData, validateFontProject } from '../../utils/font';
import { ThemeClasses, type ThemeMode } from '../../utils/theme';
import { ModalAlert } from '../modals/ModalAlert';

interface OpenTypePreviewPanelProps {
  project: FontProject;
  previewText: string;
  previewWritingMode: 'vertical-rl' | 'horizontal-tb';
  previewUsePalt: boolean;
  themeClasses: ThemeClasses;
  theme?: ThemeMode;
  onChangePreviewText: (text: string) => void;
  onToggleWritingMode: () => void;
  onTogglePreviewPalt: () => void;
}

export const OpenTypePreviewPanel: React.FC<OpenTypePreviewPanelProps> = ({
  project,
  previewText,
  previewWritingMode,
  previewUsePalt,
  themeClasses,
  theme = 'light',
  onChangePreviewText,
  onToggleWritingMode,
  onTogglePreviewPalt,
}) => {
  const [compiledFontFamily, setCompiledFontFamily] = useState<string | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const activeFontFaceRef = useRef<FontFace | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const versionRef = useRef(0);

  useEffect(() => {
    const version = ++versionRef.current;
    let cancelled = false;

    const cleanupFont = () => {
      if (activeFontFaceRef.current && typeof document !== 'undefined' && document.fonts) {
        try {
          document.fonts.delete(activeFontFaceRef.current);
        } catch {}
        activeFontFaceRef.current = null;
      }
      if (activeBlobUrlRef.current) {
        try {
          URL.revokeObjectURL(activeBlobUrlRef.current);
        } catch {}
        activeBlobUrlRef.current = null;
      }
    };

    const timer = setTimeout(() => {
      try {
        const cleaned = stripInvalidPixelData(project).project;
        const validation = validateFontProject(cleaned);
        if (!validation.valid) {
          throw new Error(validation.errors.join(' / '));
        }
        const isPixel = Boolean(cleaned.pixelFontSettings?.isPixelFontProject);
        const { blobUrl } = compileFont(cleaned, {
          scaleFactor: isPixel ? 1.0 : 1.35,
          balanceSideBearings: !isPixel,
          mergeOverlaps: !isPixel,
          normalizeWinding: true,
        });
        const faceName = `OTPreviewFont_${version}_${Date.now()}`;

        if (typeof FontFace !== 'undefined') {
          const ff = new FontFace(faceName, `url('${blobUrl}')`);
          ff.load()
            .then((loaded) => {
              if (cancelled || version !== versionRef.current) {
                try {
                  URL.revokeObjectURL(blobUrl);
                } catch {}
                return;
              }
              cleanupFont();
              document.fonts.add(loaded);
              activeFontFaceRef.current = loaded;
              activeBlobUrlRef.current = blobUrl;
              setCompiledFontFamily(faceName);
              setCompileError(null);
            })
            .catch(() => {
              try {
                URL.revokeObjectURL(blobUrl);
              } catch {}
              if (!cancelled && version === versionRef.current) {
                setCompileError('プレビュー用フォントの読み込みに失敗しました。');
              }
            });
        } else {
          cleanupFont();
          activeBlobUrlRef.current = blobUrl;
          setCompiledFontFamily(null);
          setCompileError(null);
        }
      } catch (err) {
        if (!cancelled && version === versionRef.current) {
          setCompileError(
            err instanceof Error ? err.message : 'プレビュー用フォントの生成に失敗しました。'
          );
        }
      }
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      cleanupFont();
    };
  }, [project]);

  const featureSettings = previewUsePalt
    ? '"vert" 1, "vrt2" 1, "liga" 1, "dlig" 1, "rlig" 1, "palt" 1, "pkna" 1, "vpal" 1'
    : '"vert" 1, "vrt2" 1, "liga" 1, "dlig" 1, "rlig" 1';

  return (
    <div className="space-y-4">
      <div
        className={`p-3.5 sm:p-4 rounded-xl border transition-colors space-y-3.5 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h3 className="font-bold text-sm sm:text-base flex items-center space-x-2">
              <Eye className={`w-4 h-4 ${themeClasses.accentText}`} />
              <span>インタラクティブ縦書き＆合字レンダリング検証</span>
            </h3>
            <p className={`text-xs mt-0.5 ${themeClasses.textMuted}`}>
              現在のプロジェクトをリアルタイムにコンパイルし、`vert`/`vrt2`・`liga`/`dlig`/`rlig`・`palt`/`vpal` の適用結果を検証します
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={onTogglePreviewPalt}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                previewUsePalt
                  ? themeClasses.accentBtn
                  : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted}`
              }`}
            >
              ツメ組 (palt/vpal): {previewUsePalt ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={onToggleWritingMode}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.accentText} ${themeClasses.activeToolHover}`}
            >
              {previewWritingMode === 'vertical-rl'
                ? '縦書き (vertical-rl)'
                : '横書き (horizontal-tb)'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
          {/* Input Control */}
          <div className="lg:col-span-4 flex flex-col justify-between gap-2.5">
            <div className="space-y-1 flex-1 flex flex-col">
              <label className={`text-xs font-bold ${themeClasses.textMuted}`}>
                検証用テストテキスト入力:
              </label>
              <textarea
                rows={5}
                value={previewText}
                onChange={(e) => onChangePreviewText(e.target.value)}
                className={`w-full flex-1 p-3 rounded-xl border text-xs outline-hidden transition-colors resize-none ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
              />
            </div>

            <div className={`flex items-start space-x-2 text-[11px] p-2.5 rounded-lg border ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textMuted}`}>
              <Info className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${themeClasses.accentText}`} />
              <span>
                ブラウザの OpenType シェーパー経由で GSUB/GPOS を適用して表示しています（未作字の文字はシステムフォントで補完されます）。
              </span>
            </div>
          </div>

          {/* Live Writing Render Display Area */}
          <div
            className={`lg:col-span-8 p-5 rounded-xl border min-h-[260px] flex items-center justify-center overflow-auto transition-colors shadow-inner ${themeClasses.cardBg} ${themeClasses.border}`}
          >
            {compileError ? (
              <ModalAlert tone="error" title={compileError} theme={theme} />
            ) : (
              <div
                style={{
                  writingMode: previewWritingMode,
                  textOrientation: previewWritingMode === 'vertical-rl' ? 'mixed' : undefined,
                  whiteSpace: 'pre-wrap',
                  fontFeatureSettings: featureSettings,
                  fontFamily: compiledFontFamily
                    ? `'${compiledFontFamily}', '${project.name}', serif, sans-serif`
                    : `'${project.name}', serif, sans-serif`,
                  fontSize: '32px',
                  lineHeight: '1.8',
                  letterSpacing: '0.02em',
                }}
                className={`font-medium select-text max-h-[340px] ${themeClasses.textPrimary}`}
              >
                {previewText}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
