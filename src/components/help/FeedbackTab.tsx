import React, { useState } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { copyTextToClipboard } from '../../utils/clipboard';

interface FeedbackTabProps {
  isLight: boolean;
}

const GITHUB_REPO_URL = 'https://github.com/SagyouDarui900/FontCreatorStudio';
const GITHUB_NEW_ISSUE_URL = 'https://github.com/SagyouDarui900/FontCreatorStudio/issues/new';

const ISSUE_TEMPLATE_TEXT = `【不具合報告】
■ 発生した現象:
(例: 〇〇のボタンを押した時に反応しない / 書き出したフォントで〇〇が表示されない)

■ 再現手順:
1. 
2. 
3. 

■ 使用環境:
- 端末: (PC / Mac / iPad / iPhone / Android など)
- OS: (Windows 11 / macOS / iPadOS など)
- ブラウザ: (Chrome / Safari / Edge など)

■ 補足情報:
- プロジェクト JSON ファイルの添付可否: (有 / 無)
- スクリーンショットやエラー表示の有無:`;

export const FeedbackTab: React.FC<FeedbackTabProps> = ({ isLight }) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [copyFailed, setCopyFailed] = useState<'url' | 'template' | null>(null);

  const dividerClass = isLight ? 'border-stone-200' : 'border-[#25362b]';
  const headingText = isLight ? 'text-stone-900' : 'text-stone-100';
  const mutedText = isLight ? 'text-stone-600' : 'text-stone-300';
  const subtleText = isLight ? 'text-stone-500' : 'text-stone-400';

  const handleCopyTemplate = async () => {
    const ok = await copyTextToClipboard(ISSUE_TEMPLATE_TEXT);
    if (!ok) {
      setCopyFailed('template');
      setTimeout(() => setCopyFailed((prev) => (prev === 'template' ? null : prev)), 2000);
      return;
    }
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  const handleCopyRepoUrl = async () => {
    const ok = await copyTextToClipboard(GITHUB_REPO_URL);
    if (!ok) {
      setCopyFailed('url');
      setTimeout(() => setCopyFailed((prev) => (prev === 'url' ? null : prev)), 2000);
      return;
    }
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Repository */}
      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className={`text-sm font-bold ${headingText}`}>
            ソースコードと不具合報告
          </h3>
          <p className={`text-xs leading-relaxed ${mutedText}`}>
            操作上の不具合、フォント書き出し時の異常、既存機能の改善要望は GitHub Issue で受け付けています。
          </p>
        </div>

        <div className={`pt-4 border-t ${dividerClass} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
          <div className="space-y-0.5 min-w-0">
            <div className={`text-xs font-bold ${headingText}`}>GitHub リポジトリ</div>
            <p className="text-xs font-mono text-emerald-700 dark:text-emerald-400 break-all select-all">
              {GITHUB_REPO_URL}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyRepoUrl}
              className={`py-1.5 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap ${
                copiedUrl
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700'
                  : isLight
                  ? 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50'
                  : 'bg-[#17231c] border-[#2c3d31] text-stone-200 hover:bg-[#1f2f25]'
              }`}
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copyFailed === 'url' ? 'コピー失敗' : copiedUrl ? 'コピー済み' : 'URLをコピー'}</span>
            </button>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`py-1.5 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 border transition-colors whitespace-nowrap ${
                isLight
                  ? 'bg-stone-900 text-white border-stone-900 hover:bg-stone-800'
                  : 'bg-[#1f2f25] text-stone-100 border-[#33473a] hover:bg-[#283c30]'
              }`}
            >
              <span>リポジトリを開く</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* Bug Report Action */}
      <section className={`pt-6 border-t ${dividerClass} space-y-4`}>
        <div className="space-y-1">
          <h4 className={`text-xs font-bold ${headingText}`}>不具合を報告する</h4>
          <p className={`text-xs leading-relaxed ${mutedText}`}>
            報告用テンプレートをコピーして貼り付けると、再現手順や環境情報を漏れなく記載できます。
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <a
            href={GITHUB_NEW_ISSUE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2 px-4 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white transition-colors whitespace-nowrap"
          >
            <span>GitHub Issue を作成</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            type="button"
            onClick={handleCopyTemplate}
            className={`py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap ${
              copiedTemplate
                ? 'bg-emerald-50 text-emerald-900 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700'
                : isLight
                ? 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50'
                : 'bg-[#17231c] border-[#2c3d31] text-stone-200 hover:bg-[#1f2f25]'
            }`}
          >
            {copiedTemplate ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copyFailed === 'template' ? 'コピー失敗' : copiedTemplate ? 'テンプレートをコピー済み' : '報告テンプレートをコピー'}</span>
          </button>
        </div>

        <div className="space-y-1.5 pt-2">
          <h5 className={`text-xs font-semibold ${headingText}`}>報告時に記載する項目</h5>
          <ul className={`text-xs leading-relaxed space-y-1 list-disc list-inside ${mutedText}`}>
            <li>再現手順（どの画面でどの操作を行った後に発生したか）</li>
            <li>使用している端末・OS・ブラウザ名（例: iPad / iPadOS 18 / Safari）</li>
            <li>差し支えなければ「保存」から書き出したプロジェクト JSON ファイル</li>
          </ul>
        </div>
      </section>

      {/* Environment Specifications */}
      <section className={`pt-6 border-t ${dividerClass} space-y-3`}>
        <h4 className={`text-xs font-bold ${headingText}`}>アプリケーション仕様</h4>
        <dl className={`divide-y ${isLight ? 'divide-stone-200' : 'divide-[#25362b]'} text-xs`}>
          <div className="py-2 flex items-center justify-between gap-4">
            <dt className={subtleText}>ローカル保存方式</dt>
            <dd className={`font-mono ${headingText}`}>IndexedDB / localStorage</dd>
          </div>
          <div className="py-2 flex items-center justify-between gap-4">
            <dt className={subtleText}>出力フォント形式</dt>
            <dd className={`font-mono ${headingText}`}>OpenType / CFF (.otf)</dd>
          </div>
          <div className="py-2 flex items-center justify-between gap-4">
            <dt className={subtleText}>読み込み対応形式</dt>
            <dd className={`font-mono ${headingText}`}>.ttf / .otf / .woff / .svg / .json</dd>
          </div>
        </dl>
      </section>
    </div>
  );
};
