import React from 'react';
import { Type, RefreshCw, BookmarkPlus } from 'lucide-react';
import { PathContour, RadicalPlacement } from '../../types';
import {
  POPULAR_RADICALS_QUICK_PRESETS,
  RADICAL_FONT_OPTIONS,
  FontStyleOption,
} from '../../utils/radicalExtractor';
import {
  transformContoursForPlacement,
  groupContoursForRendering,
} from '../../utils/pathUtils';

interface FontExtractionTabProps {
  isLight: boolean;
  extractChar: string;
  setExtractChar: (c: string) => void;
  extractFontFamily: string;
  setExtractFontFamily: (f: string) => void;
  extractWeight: number;
  setExtractWeight: (w: number) => void;
  extractRegion: 'full' | 'hen' | 'tsukuri' | 'kanmuri' | 'ashi';
  setExtractRegion: (r: 'full' | 'hen' | 'tsukuri' | 'kanmuri' | 'ashi') => void;
  isExtracting: boolean;
  extractedContours: PathContour[];
  placement: RadicalPlacement;
  categoryFilter: string;
  setSelectedFontStyle: (opt: FontStyleOption) => void;
  onPerformExtraction: (char: string, region: 'full' | 'hen' | 'tsukuri' | 'kanmuri' | 'ashi') => void;
  onInsertWithPlacement: (contours: PathContour[], name?: string, category?: string) => void;
  onSaveContoursAsPart: (contours: PathContour[], name: string) => void;
}

export const FontExtractionTab: React.FC<FontExtractionTabProps> = ({
  isLight,
  extractChar,
  setExtractChar,
  extractFontFamily,
  setExtractFontFamily,
  extractWeight,
  setExtractWeight,
  extractRegion,
  setExtractRegion,
  isExtracting,
  extractedContours,
  placement,
  categoryFilter,
  setSelectedFontStyle,
  onPerformExtraction,
  onInsertWithPlacement,
  onSaveContoursAsPart,
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 p-3 pb-28 sm:pb-8 space-y-3 overflow-y-auto">
      <div
        className={`p-2.5 rounded-lg border text-xs space-y-1.5 ${
          isLight ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' : 'bg-[#142218] border-[#223627] text-emerald-200'
        }`}
      >
        <div className="flex items-center space-x-1.5 font-bold">
          <Type className="w-4 h-4 text-emerald-600" />
          <span>フォントから実用ベクター部首を自動抽出</span>
        </div>
        <p className="text-[11px] opacity-90 leading-relaxed">
          任意の漢字や部首を入力し、Noto Sans JP や Noto Serif JP 等の書体・太さ・偏旁部位を選択して高品質ベクター輪郭として抽出できます。
        </p>
      </div>

      {/* Target Character Input */}
      <div className="space-y-1">
        <label className="text-[11px] font-bold block">抽出する部首または漢字:</label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={extractChar}
            onChange={(e) => setExtractChar(e.target.value)}
            placeholder="氵, 亻, 木, 語, 海..."
            maxLength={10}
            className={`flex-1 px-3 py-1.5 rounded-md border text-sm font-bold text-center ${
              isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-[#19241e] border-[#25362b] text-emerald-100'
            }`}
          />
          <button
            type="button"
            onClick={() => onPerformExtraction(extractChar, extractRegion)}
            disabled={isExtracting}
            className={`px-3 py-1.5 rounded-md font-bold text-xs flex items-center space-x-1 shadow-xs transition-all cursor-pointer ${
              isLight
                ? 'bg-emerald-800 text-white hover:bg-emerald-900'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isExtracting ? 'animate-spin' : ''}`} />
            <span>抽出実行</span>
          </button>
        </div>
      </div>

      {/* Quick Radical Chips */}
      <div className="space-y-1">
        <span className="text-[10px] text-stone-500 font-bold block">よく使う部首クイック選択:</span>
        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
          {POPULAR_RADICALS_QUICK_PRESETS.map((p, idx) => (
            <button
              key={`${p.char}_${p.name}_${idx}`}
              type="button"
              onClick={() => {
                setExtractChar(p.char);
                onPerformExtraction(p.char, extractRegion);
              }}
              className={`px-2 py-0.5 rounded border text-xs font-semibold transition-all cursor-pointer ${
                extractChar === p.char
                  ? isLight
                    ? 'bg-emerald-800 text-white border-emerald-900 font-bold'
                    : 'bg-emerald-600 text-white border-emerald-500 font-bold'
                  : isLight
                  ? 'bg-white text-stone-700 hover:bg-emerald-100 border-stone-200'
                  : 'bg-[#1a261f] text-stone-300 hover:bg-[#25362b] border-[#25362b]'
              }`}
              title={`${p.name} (${p.description})`}
            >
              {p.char}
            </button>
          ))}
        </div>
      </div>

      {/* Font & Weight Controls */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-stone-500 block">ベース書体:</label>
          <select
            value={extractFontFamily}
            onChange={(e) => {
              const val = e.target.value;
              setExtractFontFamily(val);
              const matched = RADICAL_FONT_OPTIONS.find((o) => o.fontFamily === val);
              if (matched) setSelectedFontStyle(matched);
            }}
            className={`w-full px-2 py-1.5 rounded border text-xs ${
              isLight ? 'bg-white border-stone-300' : 'bg-[#19241e] border-[#25362b]'
            }`}
          >
            <option value="'Noto Serif JP', serif">Noto Serif JP (明朝体)</option>
            <option value="'Noto Sans JP', sans-serif">Noto Sans JP (ゴシック)</option>
            <option value="'Zen Maru Gothic', sans-serif">Zen Maru (丸ゴシック)</option>
            <option value="serif">システム・明朝</option>
            <option value="sans-serif">システム・ゴシック</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-stone-500 block">太さ (Weight):</label>
          <select
            value={extractWeight}
            onChange={(e) => setExtractWeight(Number(e.target.value))}
            className={`w-full px-2 py-1.5 rounded border text-xs ${
              isLight ? 'bg-white border-stone-300' : 'bg-[#19241e] border-[#25362b]'
            }`}
          >
            <option value={300}>細め (Light / 300)</option>
            <option value={500}>標準 (Medium / 500)</option>
            <option value={700}>太め (Bold / 700)</option>
            <option value={900}>極太 (Heavy / 900)</option>
          </select>
        </div>
      </div>

      {/* Region Crop */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-stone-500 block">抽出部位 (複合漢字から切り出し):</label>
        <div className="grid grid-cols-5 gap-1 text-[10px]">
          {[
            { id: 'full', label: '全体' },
            { id: 'hen', label: '偏 (左側)' },
            { id: 'tsukuri', label: '旁 (右側)' },
            { id: 'kanmuri', label: '冠 (上側)' },
            { id: 'ashi', label: '脚 (下側)' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                const reg = item.id as 'full' | 'hen' | 'tsukuri' | 'kanmuri' | 'ashi';
                setExtractRegion(reg);
                onPerformExtraction(extractChar, reg);
              }}
              className={`py-1 rounded border text-center transition-colors cursor-pointer ${
                extractRegion === item.id
                  ? isLight
                    ? 'bg-emerald-800 text-white font-bold border-emerald-900'
                    : 'bg-emerald-600 text-white font-bold border-emerald-500'
                  : isLight
                  ? 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-emerald-50'
                  : 'bg-[#18231c] border-[#25362b] text-stone-300 hover:bg-[#202d24]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Extracted Vector Preview */}
      <div
        className={`p-3 rounded-lg border flex flex-col items-center justify-center space-y-2 ${
          isLight ? 'bg-white border-stone-300' : 'bg-[#18231c] border-[#25362b]'
        }`}
      >
        <span className="text-[10px] text-stone-400 font-bold self-start">抽出ベクタープレビュー:</span>
        <div className="w-28 h-28 border border-dashed rounded flex items-center justify-center p-1 bg-[#f9fbf9] dark:bg-[#121a14]">
          {isExtracting ? (
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
          ) : extractedContours.length > 0 ? (
            <svg viewBox="0 0 1000 1000" className="w-full h-full">
              {groupContoursForRendering(
                transformContoursForPlacement(
                  extractedContours,
                  placement,
                  extractRegion !== 'full' ? extractRegion : categoryFilter !== 'all' ? categoryFilter : 'other'
                )
              ).map((group) => (
                <path
                  key={group.id}
                  d={group.d}
                  fill={isLight ? '#111827' : '#ecfdf5'}
                  fillRule={group.fillRule}
                />
              ))}
            </svg>
          ) : (
            <span className="text-xs text-stone-400">輪郭なし</span>
          )}
        </div>
        <span className="text-[10px] text-stone-500">輪郭数: {extractedContours.length} 本</span>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={() => onInsertWithPlacement(extractedContours)}
          disabled={extractedContours.length === 0}
          className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center space-x-1 shadow-sm transition-all cursor-pointer ${
            extractedContours.length > 0
              ? isLight
                ? 'bg-emerald-800 text-white hover:bg-emerald-900'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
              : 'bg-stone-300 text-stone-500 cursor-not-allowed'
          }`}
        >
          <span>キャンバスに挿入</span>
        </button>

        <button
          type="button"
          onClick={() =>
            onSaveContoursAsPart(
              extractedContours,
              `抽出_${extractChar}_${extractRegion !== 'full' ? extractRegion : '全体'}`
            )
          }
          disabled={extractedContours.length === 0}
          className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center space-x-1 border transition-all cursor-pointer ${
            extractedContours.length > 0
              ? isLight
                ? 'bg-white border-emerald-700 text-emerald-900 hover:bg-emerald-50'
                : 'bg-[#1a261f] border-emerald-500 text-emerald-200 hover:bg-[#223127]'
              : 'border-stone-300 text-stone-400 cursor-not-allowed'
          }`}
        >
          <BookmarkPlus className="w-3.5 h-3.5" />
          <span>マイパーツに保存</span>
        </button>
      </div>
    </div>
  );
};
