import React, { type ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import {
  isLightTheme,
  type ThemeMode,
} from '../../utils/theme';

/**
 * ModalAlert — tone で色を決める警告ボックス（監査 (d) 3、M-09 対応）。
 *
 * 使い方（組み込み側）:
 * ```tsx
 * <ModalAlert tone="warning" title="未作成の文字があります">
 *   対象のうち 3 文字はまだ作成されていません。
 * </ModalAlert>
 * <ModalAlert tone="error" title="出力できません" items={['グリフがありません', '名前が未設定です']} />
 * ```
 * - 形は a-5 の共通形（`p-3 rounded-xl border flex items-start space-x-2`、
 *   アイコン `w-4 h-4 shrink-0 mt-0.5`、本文 `text-[11px] leading-relaxed`）。
 * - 色は tone から決める。error は赤系、warning は amber 系、info / success は
 *   emerald 系（監査 a-5）。theme.ts に tone 用の色はないため、light / dark の
 *   2通りを `isLightTheme(theme)` で切り替える。tone ごとに色を呼び出し側で
 *   直接書かないこと。
 * - info と success は色が同じで、アイコン（Info / CheckCircle2）で区別する。
 */

export type ModalAlertTone = 'error' | 'warning' | 'info' | 'success';

const TONE_ICONS = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
} as const;

interface ToneClasses {
  container: string;
  icon: string;
}

function getToneClasses(tone: ModalAlertTone, isLight: boolean): ToneClasses {
  switch (tone) {
    case 'error':
      return {
        container: isLight
          ? 'bg-rose-50 text-rose-900 border-rose-300'
          : 'bg-rose-950/60 text-rose-200 border-rose-800',
        icon: isLight ? 'text-rose-600' : 'text-rose-400',
      };
    case 'warning':
      return {
        container: isLight
          ? 'bg-amber-50 text-amber-900 border-amber-300'
          : 'bg-amber-950/60 text-amber-200 border-amber-800',
        icon: isLight ? 'text-amber-600' : 'text-amber-400',
      };
    case 'info':
    case 'success':
      return {
        container: isLight
          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
          : 'bg-emerald-950/60 text-emerald-200 border-emerald-800',
        icon: isLight ? 'text-emerald-600' : 'text-emerald-400',
      };
  }
}

export interface ModalAlertProps {
  tone: ModalAlertTone;
  title: string;
  children?: ReactNode;
  /** 箇条書きで出す場合の項目。children と併用できる。 */
  items?: string[];
  theme?: ThemeMode;
}

export const ModalAlert: React.FC<ModalAlertProps> = ({
  tone,
  title,
  children,
  items,
  theme = 'light',
}) => {
  const toneClasses = getToneClasses(tone, isLightTheme(theme));
  const Icon = TONE_ICONS[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className={`p-3 rounded-xl border flex items-start space-x-2 ${toneClasses.container}`}
    >
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${toneClasses.icon}`} />
      <div className="min-w-0 flex-1">
        <p className="font-bold">{title}</p>
        {children && (
          <div className="text-[11px] leading-relaxed jp-wrap">{children}</div>
        )}
        {items && items.length > 0 && (
          <ul className="mt-1 list-disc pl-4 space-y-0.5 text-[11px] leading-relaxed jp-wrap">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
