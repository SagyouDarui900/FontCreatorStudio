import { PixelGridPreset } from './types';

export const PRESET_SIZES: { id: PixelGridPreset; label: string; w: number; h: number; desc: string }[] = [
  { id: '8x8', label: '8×8', w: 8, h: 8, desc: '8-bit クラシック / レトロゲーム規格' },
  { id: '16x16', label: '16×16', w: 16, h: 16, desc: '16-bit / JIS漢字標準解像度' },
  { id: '12x12', label: '12×12', w: 12, h: 12, desc: '携帯機器 / 小型JIS規格' },
  { id: '24x24', label: '24×24', w: 24, h: 24, desc: '中解像度ビットマップ / アーケード' },
  { id: '32x32', label: '32×32', w: 32, h: 32, desc: '高密度ドット / 精密ビットマップ' },
  { id: '5x7', label: '5×7', w: 5, h: 7, desc: '英数マトリクス / 計器・LCD表示' },
  { id: '64x64', label: '64×64', w: 64, h: 64, desc: '高精細ピクセルアート' },
  { id: '128x128', label: '128×128', w: 128, h: 128, desc: '128×128 高解像度ピクセル' },
  { id: 'custom', label: 'カスタム', w: 10, h: 10, desc: '任意のグリッド寸法 (幅×高さ)' },
];

export const PIXEL_STUDIO_CATEGORIES = [
  { id: 'all', label: '登録済' },
  { id: 'drawn', label: '作成済' },
  { id: 'hiragana', label: 'ひらがな' },
  { id: 'katakana', label: 'カタカナ' },
  { id: 'basic_latin_alnum', label: '半角英数' },
  { id: 'ascii_symbols', label: '記号' },
  { id: 'fullwidth_alnum', label: '全角英数' },
  { id: 'symbols', label: '和文約物' },
  { id: 'grade1', label: '小1漢字' },
  { id: 'grade2', label: '小2漢字' },
  { id: 'grade3', label: '小3漢字' },
  { id: 'jis_1', label: 'JIS第1' },
];
