import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { ThemeClasses } from '../../utils/theme';

interface GposKerningPanelProps {
  kerningPairCount: number;
  themeClasses: ThemeClasses;
}

export const GposKerningPanel: React.FC<GposKerningPanelProps> = ({
  kerningPairCount,
  themeClasses,
}) => {
  return (
    <div className="space-y-4">
      <div
        className={`p-4 rounded-xl border transition-colors space-y-3 ${themeClasses.subtoolbarBg} ${themeClasses.border}`}
      >
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${themeClasses.accentBadge}`}
          >
            <ArrowUpDown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base">
              文字ペア送り幅調整 (`kern` GPOS Table)
            </h3>
            <p className={`text-xs mt-0.5 ${themeClasses.textMuted}`}>
              特定の文字同士が隣り合った際の文字間余白（カーニング）をデザインユニット単位で補正します
            </p>
          </div>
        </div>

        <div className="pt-2 text-xs space-y-2">
          <p>
            現在、プロジェクト内には <strong>{kerningPairCount} 件</strong>{' '}
            のアクティブなカーニングペアが登録されています。
          </p>
          <p className={themeClasses.textMuted}>
            ※ より詳細な2Dカーニング調整やペアマトリクス編集は、ツールバーの「カーニング調整」モーダルからシームレスに行えます。
          </p>
        </div>
      </div>
    </div>
  );
};
