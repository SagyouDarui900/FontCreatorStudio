import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] max-sm:bottom-[calc(7.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-4 left-4 z-40 flex items-center gap-2 rounded-lg bg-slate-900 border border-amber-500/40 text-amber-300 px-3 py-2 text-xs font-medium shadow-md max-sm:right-4 max-sm:max-w-[calc(100vw-32px)]">
      <span className="inline-flex rounded-full h-2 w-2 bg-amber-500 shrink-0" />
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span className="max-sm:hidden">オフライン動作中 — キャッシュ・ローカル環境で作業できます。初回オフラインでは下絵フォントが使えない場合があります。オンライン時に一度表示した下絵フォントは次回以降も使えます（上限を超えた分は使えない場合があります）</span>
      <span className="hidden max-sm:inline">オフライン動作中</span>
    </div>
  );
};
