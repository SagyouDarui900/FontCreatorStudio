import React from 'react';
import {
  Square,
  Circle,
  Triangle,
  Star,
  Heart,
  Sparkles,
  Diamond,
  Hexagon,
  Minus,
  Disc,
  Moon,
  Slash,
  Pen,
  Droplet,
  Smile,
  Paintbrush,
  Feather,
  PenTool,
  CircleDot,
  PenLine,
  Highlighter,
  Pencil,
  SquareDot,
  Spline,
} from 'lucide-react';
import {
  ToolMode,
  BrushStyle,
  JapaneseGuidePattern,
  VerticalGuidePattern,
} from '../../types';

export const PEN_ICONS: Record<BrushStyle, React.FC<{ className?: string }>> = {
  signpen: Pen,
  sumi: Droplet,
  marumoji: Smile,
  brush: Paintbrush,
  fountain: Feather,
  mincho_nib: Feather,
  reisho_chisel: PenTool,
  g_pen: PenTool,
  pixel_dot: Square,
  marker: CircleDot,
  ballpoint: PenLine,
  chalk: Sparkles,
  calligraphy: PenTool,
  highlighter: Highlighter,
  pencil: Pencil,
  sharp: Square,
  sharp_round: SquareDot,
  wobbly: Spline,
  polygon: Hexagon,
};

export const PillIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="7" width="18" height="10" rx="5" ry="5" />
  </svg>
);

export const SHAPE_TOOLS: { id: ToolMode; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'rect', label: '長方形 (Rectangle)', icon: Square },
  { id: 'square', label: '正方形 (Square)', icon: Square },
  { id: 'ellipse', label: '楕円 (Ellipse)', icon: Circle },
  { id: 'circle', label: '正円 (Circle)', icon: Circle },
  { id: 'rounded_rect', label: '角丸四角形 (Rounded)', icon: Square },
  { id: 'pill', label: 'カプセル (Capsule/Pill)', icon: PillIcon },
  { id: 'triangle', label: '正三角形 (Triangle)', icon: Triangle },
  { id: 'triangle_down', label: '逆三角形 (Inverted)', icon: Triangle },
  { id: 'right_triangle', label: '直角三角形 (Right Triangle)', icon: Triangle },
  { id: 'semicircle', label: '半円 (Semicircle)', icon: Circle },
  { id: 'ring', label: 'ドーナツ・二重円 (Ring)', icon: Disc },
  { id: 'parallelogram', label: '平行四辺形 (Parallelogram)', icon: Slash },
  { id: 'diamond', label: '菱形 (Diamond)', icon: Diamond },
  { id: 'polygon', label: '正六角形 (Hexagon)', icon: Hexagon },
  { id: 'line', label: '直線バー (Line)', icon: Minus },
  { id: 'star', label: '星型 (5芒星)', icon: Star },
  { id: 'sparkle', label: '4芒星 (Sparkle)', icon: Sparkles },
  { id: 'starburst', label: '8芒星 (Starburst)', icon: Sparkles },
  { id: 'heart', label: 'ハート (Heart)', icon: Heart },
  { id: 'crescent', label: '三日月 (Crescent)', icon: Moon },
];

export const PRESSURE_MODES: { id: 'high' | 'normal' | 'low' | 'off'; label: string; desc: string }[] = [
  { id: 'high', label: '高感度', desc: '軽快な強弱' },
  { id: 'normal', label: '標準', desc: '自然な筆圧' },
  { id: 'low', label: '弱め', desc: 'しっかりめ' },
  { id: 'off', label: 'OFF', desc: '太さ均一' },
];

export const VERTICAL_GUIDES: { id: VerticalGuidePattern; label: string }[] = [
  { id: 'none', label: 'なし' },
  { id: 'center', label: '中心' },
  { id: 'thirds', label: '3分割' },
  { id: 'quarters', label: '4分割' },
  { id: 'eighths', label: '8分割' },
];

export const JAPANESE_GUIDES: { id: JapaneseGuidePattern; label: string }[] = [
  { id: 'none', label: 'なし' },
  { id: 'cross', label: '十字格' },
  { id: 'tian', label: '田字格' },
  { id: 'jiugong', label: '九宮 (3x3)' },
  { id: 'sixteen', label: '十六宮 (4x4)' },
  { id: 'mi', label: '米字格' },
];
