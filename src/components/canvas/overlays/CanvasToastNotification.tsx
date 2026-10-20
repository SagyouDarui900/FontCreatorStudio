import React from 'react';
import { Check } from 'lucide-react';

export interface CanvasToastNotificationProps {
  canvasToast: { message: string; subText?: string } | null;
  isLight: boolean;
}

export const CanvasToastNotification: React.FC<CanvasToastNotificationProps> = React.memo(({
  canvasToast,
  isLight,
}) => {
  if (!canvasToast) return null;

  return (
    <div className="absolute bottom-14 sm:bottom-12 right-2 sm:right-3 z-30 pointer-events-none max-w-[calc(100vw-32px)] sm:max-w-sm">
      <div
        className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full sm:rounded-lg border shadow-md sm:shadow-lg flex items-center gap-1.5 sm:gap-2 transition-all ${
          isLight
            ? 'bg-stone-900/90 border-stone-700 text-stone-100 '
            : 'bg-[#15241b]/95 border-emerald-600/60 text-emerald-100 '
        }`}
      >
        <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
        <div className="min-w-0">
          <div className="text-[11px] sm:text-xs font-semibold leading-tight truncate">
            {canvasToast.message}
          </div>
          {canvasToast.subText && (
            <div className="text-[9.5px] sm:text-[10px] text-stone-300 dark:text-emerald-300 font-normal leading-tight mt-0.5 truncate">
              {canvasToast.subText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

CanvasToastNotification.displayName = 'CanvasToastNotification';
