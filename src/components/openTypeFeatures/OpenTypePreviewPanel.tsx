import React from 'react';
import { Eye, Info } from 'lucide-react';
import { ThemeClasses } from '../../utils/theme';

interface OpenTypePreviewPanelProps {
  projectName: string;
  previewText: string;
  previewWritingMode: 'vertical-rl' | 'horizontal-tb';
  themeClasses: ThemeClasses;
  onChangePreviewText: (text: string) => void;
  onToggleWritingMode: () => void;
}

export const OpenTypePreviewPanel: React.FC<OpenTypePreviewPanelProps> = ({
  projectName,
  previewText,
  previewWritingMode,
  themeClasses,
  onChangePreviewText,
  onToggleWritingMode,
}) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div
        className={`p-5 rounded-2xl border transition-colors space-y-4 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm sm:text-base flex items-center space-x-2">
              <Eye className={`w-4 h-4 ${themeClasses.accentText}`} />
              <span>インタラクティブ縦書き＆合字レンダリング検証</span>
            </h3>
            <p className={`text-xs mt-0.5 ${themeClasses.textMuted}`}>
              縦書きレイアウトと入力テキストを確認できます。GSUB (`vert`, `liga`) の最終的な適用は、書き出したフォント側で行われます
            </p>
          </div>

          <div className="flex items-center space-x-2">
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

        {/* Input Control */}
        <div className="space-y-1">
          <label className={`text-xs font-bold ${themeClasses.textMuted}`}>
            検証用テストテキスト入力:
          </label>
          <textarea
            rows={2}
            value={previewText}
            onChange={(e) => onChangePreviewText(e.target.value)}
            className={`w-full p-3 rounded-xl border text-xs outline-hidden transition-colors ${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`}
          />
        </div>

        {/* Live Writing Render Display Area */}
        <div
          className={`p-6 rounded-2xl border min-h-[220px] flex items-center justify-center overflow-auto transition-colors shadow-inner ${themeClasses.cardBg} ${themeClasses.border}`}
        >
          <div
            style={{
              writingMode: previewWritingMode,
              fontFamily: `'${projectName}', serif, sans-serif`,
              fontSize: '32px',
              lineHeight: '1.8',
              letterSpacing: '0.05em',
            }}
            className={`font-medium select-text max-h-[300px] ${themeClasses.textPrimary}`}
          >
            {previewText}
          </div>
        </div>

        <div className={`flex items-center space-x-2 text-[11px] ${themeClasses.textMuted}`}>
          <Info className={`w-3.5 h-3.5 shrink-0 ${themeClasses.accentText}`} />
          <span>
            この画面はブラウザの縦書きレイアウトを確認するプレビューです。設定した縦向き字形と合字は、書き出したフォントを対応アプリで検証してください。
          </span>
        </div>
      </div>
    </div>
  );
};
