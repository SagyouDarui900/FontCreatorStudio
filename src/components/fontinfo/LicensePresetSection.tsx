import React from 'react';
import { Scale, Check, ShieldCheck } from 'lucide-react';
import { FontMetadata } from '../../types';

export interface LicensePreset {
  id: string;
  name: string;
  badge: string;
  desc: string;
  license: string;
  licenseUrl: string;
}

export const LICENSE_PRESETS: LicensePreset[] = [
  {
    id: 'ofl',
    name: 'SIL Open Font License 1.1 (OFL)',
    badge: '推奨・国際標準',
    desc: 'フォント界の標準オープンソース。商用利用・改変・Webフォント・製品組み込み自由。',
    license:
      'This Font Software is licensed under the SIL Open Font License, Version 1.1. This Font Software is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND.',
    licenseUrl: 'https://openfontlicense.org/',
  },
  {
    id: 'commercial_free',
    name: '商用フリー・ロイヤリティフリー (Free for Commercial)',
    badge: '商用利用自由',
    desc: '個人・法人・同人・商業出版・ゲーム・映像問わずクレジット表記不要で自由利用可能。',
    license:
      '本フォントは商用・非商用問わず無償で自由に利用（印刷物・同人誌・ゲーム・アプリ・映像・Web等への組み込み）が可能です。ロイヤリティフリー。',
    licenseUrl: '',
  },
  {
    id: 'cc0',
    name: 'CC0 1.0 全世界 パブリック・ドメイン',
    badge: '著作権放棄',
    desc: '権利を放棄し共有財産（パブリックドメイン）として誰でも無制限に利用可能。',
    license:
      'To the extent possible under law, the author has waived all copyright and related rights to this work under Creative Commons CC0 1.0 Universal.',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  {
    id: 'mit',
    name: 'MIT License',
    badge: '汎用オープンソース',
    desc: 'ソフトウェアやフォントに広く使われる自由度の高いオープンソースライセンス。',
    license:
      'Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated font files to use, copy, modify, merge, publish, distribute without restriction.',
    licenseUrl: 'https://opensource.org/licenses/MIT',
  },
  {
    id: 'custom',
    name: 'カスタム独自ライセンス / 独自利用規約',
    badge: '独自設定',
    desc: 'ご自身で作成したオリジナルの利用規約や販売条件を自由に記述・設定できます。',
    license: '',
    licenseUrl: '',
  },
];

interface LicensePresetSectionProps {
  isLight: boolean;
  formData: FontMetadata;
  onApplyPreset: (presetId: string) => void;
  onOpenBundledFontsModal: () => void;
}

export const LicensePresetSection: React.FC<LicensePresetSectionProps> = ({
  isLight,
  formData,
  onApplyPreset,
  onOpenBundledFontsModal,
}) => {
  return (
    <div
      className={`p-3 sm:p-3.5 rounded-xl border ${
        isLight
          ? 'bg-amber-50/70 border-amber-200 text-amber-950'
          : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
      }`}
    >
      <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
        <Scale className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>ライセンス プリセットから選択</span>
      </div>
      <p className="text-[11px] opacity-85 leading-relaxed mb-3">
        出力フォントファイル（TTF/OTF）の OpenType name テーブル（ID 13: License, ID 14: URL, ID 0:
        Copyright）に正式に埋め込まれます。タップで即時適用されます。
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {LICENSE_PRESETS.map((p) => {
          const isSelected =
            formData.license?.includes(p.name.split(' ')[0]) ||
            (p.id === 'ofl' && formData.license?.includes('OFL'));

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onApplyPreset(p.id)}
              className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative active:scale-[0.99] ${
                isSelected
                  ? isLight
                    ? 'bg-white border-amber-500 ring-2 ring-amber-500/80 shadow-xs'
                    : 'bg-[#1e2a22] border-amber-400 ring-2 ring-amber-400/80 shadow-xs'
                  : isLight
                  ? 'bg-white/90 border-stone-200 hover:border-amber-300 hover:bg-white'
                  : 'bg-[#151f18] border-[#293c2f] hover:border-amber-500/50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    )}
                    <span className="font-bold text-xs leading-snug break-words text-stone-900 dark:text-amber-100">
                      {p.name}
                    </span>
                  </div>
                  <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-amber-200/70 dark:bg-amber-900/80 text-amber-950 dark:text-amber-200 font-bold shrink-0">
                    {p.badge}
                  </span>
                </div>
                <p className="text-[11px] opacity-85 leading-relaxed break-words text-stone-700 dark:text-amber-200/90">
                  {p.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 pt-2.5 border-t border-amber-200/60 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <span className="text-[11px] opacity-85">
          アプリ内蔵の下絵・部首用フォントの権利・利用条件を確認
        </span>
        <button
          type="button"
          onClick={onOpenBundledFontsModal}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:underline cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>内蔵フォント一覧 &amp; ライセンス (OFL 1.1)</span>
        </button>
      </div>
    </div>
  );
};
