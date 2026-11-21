import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ThemeMode, isLightTheme, getThemeClasses } from '../utils/theme';

export interface ToastAction {
  label: string;
  onAction: () => void;
}

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  action?: ToastAction;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
  theme: ThemeMode;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss, theme }) => {
  if (toasts.length === 0) return null;
  const isLight = isLightTheme(theme);
  const themeClasses = getThemeClasses(theme);

  return (
    <div
      role="region"
      aria-label="通知"
      className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] sm:bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 z-[80] flex flex-col items-center sm:items-end space-y-1.5 w-auto max-w-[calc(100vw-24px)] sm:max-w-sm pointer-events-none"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success' || !toast.type;
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            role={isError ? 'alert' : 'status'}
            aria-live={isError ? 'assertive' : 'polite'}
            aria-atomic="true"
            className={`pointer-events-auto flex items-center gap-2 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border shadow-md text-[11px] sm:text-xs font-medium max-w-full ${
              isError
                ? isLight
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-rose-950 border-rose-800 text-rose-200'
                : isWarning
                ? isLight
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-amber-950 border-amber-800 text-amber-200'
                : isSuccess
                ? themeClasses.accentBadge
                : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.textPrimary}`
            }`}
          >
            {isError ? (
              <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 shrink-0" />
            ) : isWarning ? (
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
            ) : isSuccess ? (
              <CheckCircle2 className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${themeClasses.accentText}`} />
            ) : (
              <Info className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${themeClasses.accentText}`} />
            )}
            <span className="leading-tight truncate max-w-[70vw] sm:max-w-none">{toast.text}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onAction();
                  onDismiss(toast.id);
                }}
                className="px-1.5 py-0.5 rounded-full font-bold underline shrink-0 cursor-pointer"
                title={toast.action.label}
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="閉じる"
              className={`p-0.5 rounded-full hover:opacity-75 shrink-0 cursor-pointer ${themeClasses.textMuted}`}
              title="閉じる"
            >
              <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
