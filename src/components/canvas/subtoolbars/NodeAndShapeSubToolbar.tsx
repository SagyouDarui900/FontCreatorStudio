import React from 'react';
import { Activity, Trash2 } from 'lucide-react';
import { ToolMode } from '../../../types';

interface NodeAndShapeSubToolbarProps {
  toolMode: ToolMode;
  nodeStyle: 'full' | 'clean' | 'selected_only';
  setNodeStyle: (s: 'full' | 'clean' | 'selected_only') => void;
  selectedNodeId: string | null;
  selectedContourId: string | null;
  handleToggleNodeType: (contourId: string, nodeId: string) => void;
  handleDeleteSelectedNode: () => void;
  isShapeTool: boolean;
  isShiftLockRatio: boolean;
  setIsShiftLockRatio: React.Dispatch<React.SetStateAction<boolean>>;
  isAltFromCenter: boolean;
  setIsAltFromCenter: React.Dispatch<React.SetStateAction<boolean>>;
  showCanvasToast: (msg: string, sub?: string) => void;
  isLight: boolean;
}

export const NodeAndShapeSubToolbar: React.FC<NodeAndShapeSubToolbarProps> = ({
  toolMode,
  nodeStyle,
  setNodeStyle,
  selectedNodeId,
  selectedContourId,
  handleToggleNodeType,
  handleDeleteSelectedNode,
  isShapeTool,
  isShiftLockRatio,
  setIsShiftLockRatio,
  isAltFromCenter,
  setIsAltFromCenter,
  showCanvasToast,
  isLight,
}) => {
  return (
    <>
      {/* Node Tool options */}
      {toolMode === 'node' && (
        <div className="flex items-center space-x-1.5 ml-1 pl-1.5 border-l border-stone-200 dark:border-stone-700">
          <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-0.5 rounded border border-stone-200 dark:border-stone-700 text-[10px]">
            <button
              type="button"
              onClick={() => setNodeStyle('clean')}
              className={`px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                nodeStyle === 'clean'
                  ? 'bg-white dark:bg-stone-700 text-emerald-700 dark:text-emerald-300 font-bold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
              title="小ドット表示"
            >
              形状優先
            </button>
            <button
              type="button"
              onClick={() => setNodeStyle('selected_only')}
              className={`px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                nodeStyle === 'selected_only'
                  ? 'bg-white dark:bg-stone-700 text-emerald-700 dark:text-emerald-300 font-bold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
              title="選択中のパーツのみ頂点を表示"
            >
              選択のみ
            </button>
            <button
              type="button"
              onClick={() => setNodeStyle('full')}
              className={`px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                nodeStyle === 'full'
                  ? 'bg-white dark:bg-stone-700 text-emerald-700 dark:text-emerald-300 font-bold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
              title="詳細ボックスとハンドルを常時表示"
            >
              詳細
            </button>
          </div>

          {selectedNodeId && selectedContourId && (
            <>
              <button
                type="button"
                onClick={() => handleToggleNodeType(selectedContourId, selectedNodeId)}
                className={`px-2 py-1 rounded text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-sky-100 text-sky-900 hover:bg-sky-200 border border-sky-300'
                    : 'bg-sky-950 text-sky-200 hover:bg-sky-900 border border-sky-700'
                }`}
                title="角ノードと曲線ノードを切り替え (ノードをダブルクリックでも可能)"
              >
                <Activity className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                <span>角 ⇄ 曲線</span>
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSelectedNode()}
                className="px-2 py-1 rounded text-xs font-bold flex items-center space-x-1 transition-colors bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 hover:bg-rose-200 border border-rose-300 dark:border-rose-800 cursor-pointer"
                title="選択したノードを削除 (Deleteキー)"
              >
                <Trash2 className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                <span>削除</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Shape Tool modifier options */}
      {isShapeTool && (
        <div className="flex items-center space-x-1.5 ml-1 pl-1.5 border-l border-stone-200 dark:border-stone-700">
          <button
            type="button"
            onClick={() => {
              setIsShiftLockRatio((prev) => !prev);
              showCanvasToast(!isShiftLockRatio ? '正方形・正円比率に固定しました' : '自由比率に切り替えました');
            }}
            className={`px-2 py-1 rounded text-xs font-bold border transition-colors flex items-center space-x-1 cursor-pointer ${
              isShiftLockRatio
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
            title="1:1 正方形・正円比率固定 (ドラッグ中Shiftキーでも可能)"
          >
            <span className="hidden sm:inline">比率:</span>
            <span>{isShiftLockRatio ? '正方形/正円固定' : '自由変形'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsAltFromCenter((prev) => !prev);
              showCanvasToast(!isAltFromCenter ? '中心基準作図をONにしました' : '中心基準作図をOFFにしました');
            }}
            className={`hidden sm:flex px-2 py-1 rounded text-xs font-bold border transition-colors items-center space-x-1 cursor-pointer ${
              isAltFromCenter
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
            title="中心から作図 (ドラッグ中Altキーでも可能)"
          >
            <span>中心基準:</span>
            <span>{isAltFromCenter ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      )}
    </>
  );
};
