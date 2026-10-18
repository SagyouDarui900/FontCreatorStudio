import { CustomPart, PartCategory, PathContour, FontProject } from '../../types';
import { generateId } from '../../utils/pathUtils';
import { ThemeMode } from '../../utils/theme';
import { KANGXI_214_RADICALS } from '../../data/kangxi214Radicals';

export const CUSTOM_PARTS_STORAGE_KEY = 'font_editor_custom_parts_v1';

export interface StudioRadicalPresetItem {
  id: string;
  name: string;
  char: string;
  category: PartCategory;
  description: string;
}

// Complete catalog of all 214 traditional Kangxi radicals (康熙字典 全214部首) + stroke & geometric parts
export const STUDIO_RADICAL_PRESETS: StudioRadicalPresetItem[] = [
  ...KANGXI_214_RADICALS.map((r) => {
    let cat: PartCategory = 'stroke';
    if (r.category === 'basic') {
      cat = 'stroke';
    } else if (r.category) {
      cat = r.category as PartCategory;
    }

    return {
      id: `rad_kangxi_${r.number}`,
      char: r.displayChar || r.char,
      name: `${r.name}`,
      category: cat,
      description: `康熙部首 ${r.number}番 (${r.strokes}画): ${r.description}`,
    };
  }),

  // 偏 (Hen additional aliases)
  { id: 'rad_ninben', char: '亻', name: 'にんべん', category: 'hen', description: '人・動作に関する偏 (休, 作, 体, 信, 健)' },
  { id: 'rad_sanzui', char: '氵', name: 'さんずい', category: 'hen', description: '水・液体に関する偏 (海, 湖, 清, 河, 汁)' },
  { id: 'rad_kihen', char: '木', name: 'きへん', category: 'hen', description: '樹木・木製品に関する偏 (林, 村, 校, 板, 柱)' },
  { id: 'rad_tehen', char: '扌', name: 'てへん', category: 'hen', description: '手・動作に関する偏 (持, 打, 投, 指, 技)' },
  { id: 'rad_gonben', char: '言', name: 'ごんべん', category: 'hen', description: '言葉・話すことに関する偏 (話, 語, 読, 記, 談)' },
  { id: 'rad_itohen', char: '糸', name: 'いとへん', category: 'hen', description: '織物・糸に関する偏 (線, 細, 組, 約, 結)' },

  // 基本筆画・ストローク (Stroke)
  { id: 'rad_stroke_h_line', char: '一', name: '横画 (水平)', category: 'stroke', description: '基本水平ストローク (一, 二, 三, 上, 下)' },
  { id: 'rad_stroke_v_line', char: '丨', name: '縦画 (垂直)', category: 'stroke', description: '基本垂直ストローク (中, 十, 千, 甲, 申)' },
  { id: 'rad_stroke_dot', char: '丶', name: '点 (打点)', category: 'stroke', description: '打点・水滴ストローク (丸, 主, 丹, 求)' },
  { id: 'rad_stroke_sweep_l', char: '丿', name: '左払い (左払)', category: 'stroke', description: '左下へ流れる払い (九, 及, 反, 文, 禾)' },
  { id: 'rad_stroke_sweep_r', char: '乀', name: '右払い (右払)', category: 'stroke', description: '右下へ力強く抜ける払い (大, 人, 木, 天)' },
  { id: 'rad_stroke_hook', char: '亅', name: 'はね・鉤', category: 'stroke', description: '垂直からの跳ね上げ (了, 予, 事, 于)' },
  { id: 'rad_stroke_bend', char: '乙', name: '曲がり・折れ', category: 'stroke', description: '折れ曲がりストローク (乙, 乞, 乾, 乱)' },

  // 幾何学パーツ (Geometric)
  { id: 'rad_geo_square', char: '■', name: '正方形 (ボックス)', category: 'geometric', description: '幾何学正方形ベース (口, 日, 目, 田, 国)' },
  { id: 'rad_geo_rect_v', char: '▮', name: '縦長方形 (柱)', category: 'geometric', description: '縦方向の幾何学長方形ストローク' },
  { id: 'rad_geo_rect_h', char: '▬', name: '横長方形 (梁)', category: 'geometric', description: '横方向の幾何学長方形ストローク' },
  { id: 'rad_geo_circle', char: '●', name: '正円 (ドット)', category: 'geometric', description: '幾何学正円・丸ポイント' },
  { id: 'rad_geo_ring', char: '○', name: '円環 (リング)', category: 'geometric', description: '幾何学円環・中空サークル' },
  { id: 'rad_geo_triangle', char: '▲', name: '正三角形', category: 'geometric', description: '幾何学三角形ストローク' },
  { id: 'rad_geo_diamond', char: '◆', name: 'ひし形 (菱形)', category: 'geometric', description: '幾何学ダイヤモンド・ひし形' },
  { id: 'rad_geo_cross', char: '✚', name: '十字 (クロス)', category: 'geometric', description: '幾何学十字交差 (十, 針, 計, 井)' },
  { id: 'rad_geo_hexagon', char: '⬢', name: '六角形 (ヘキサゴン)', category: 'geometric', description: '幾何学六角形ブロック' },

  // 仮名共通部 (Kana)
  { id: 'rad_kana_dakuten', char: '゛', name: '濁点 (濁音符)', category: 'kana', description: '仮名濁音符 (が, ざ, だ, ば, ヴ)' },
  { id: 'rad_kana_handakuten', char: '゜', name: '半濁点 (半濁音符)', category: 'kana', description: '仮名半濁音符 (ぱ, ぴ, ぷ, ぺ, ぽ)' },
  { id: 'rad_kana_chouon', char: 'ー', name: '長音符 (音引き)', category: 'kana', description: 'カタカナ長音記号' },
  { id: 'rad_kana_kurikaeshi', char: '々', name: '同の字点 (送り点)', category: 'kana', description: '漢字繰り返し記号 (佐々木, 時々, 日々)' },
];

export interface RadicalStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
  selectedChar: string;
  selectedUnicode: number;
  onInsertToCurrentGlyph: (contours: PathContour[]) => void;
  onBatchInsertToGlyphs?: (contours: PathContour[], targetChars: string[]) => void;
  theme: ThemeMode;
  onShowToast?: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const CATEGORY_TABS: { id: PartCategory; label: string; icon?: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'hen', label: '偏 (へん)' },
  { id: 'tsukuri', label: '旁 (つくり)' },
  { id: 'kanmuri', label: '冠 (かんむり)' },
  { id: 'ashi', label: '脚 (あし)' },
  { id: 'tare', label: '垂 (たれ)' },
  { id: 'kamae', label: '構 (かまえ)' },
  { id: 'stroke', label: '筆画・点・払い' },
  { id: 'geometric', label: '幾何学パーツ' },
  { id: 'kana', label: '仮名共通部' },
  { id: 'other', label: 'その他' },
];

export const KANJI_PRESETS_BY_CATEGORY: Record<string, string[]> = {
  hen: ['休', '体', '位', '作', '保', '信', '健', '倶', '汁', '汗', '池', '油', '海', '港', '満', '波', '木', '林', '校', '板', '枝', '柱', '語', '記', '訳', '話', '読', '誠'],
  tsukuri: ['都', '郡', '部', '郷', '刊', '到', '割', '創', '改', '攻', '救', '放', '叙', '助', '動', '勝'],
  kanmuri: ['苗', '花', '草', '茶', '華', '薬', '空', '穴', '究', '突', '窃', '窮', '家', '安', '守', '宅', '密', '富', '寛'],
  ashi: ['照', '魚', '黒', '点', '烈', '煮', '熊', '焦', '無', '燕', '兄', '先', '光', '充', '兆', '児', '見', '規'],
  tare: ['庁', '広', '庄', '府', '庫', '庭', '康', '摩', '病', '痛', '疲', '疾', '症', '療'],
  kamae: ['国', '園', '囲', '図', '固', '圏', '岡', '風', '鳳', '問', '間', '閣', '関', '門'],
  stroke: ['一', '二', '三', '十', '大', '小', '中', '人', '日', '月', '年', '本'],
  other: ['愛', '和', '光', '福', '幸', '夢', '心', '創', '美', '知', '新', '生'],
};

export function sanitizeCustomParts(rawParts: unknown): CustomPart[] {
  if (!Array.isArray(rawParts)) return [];
  return rawParts
    .filter((p) => p && typeof p === 'object')
    .map((p: any) => ({
      id: String(p.id || generateId()),
      name: String(p.name || 'パーツ'),
      category: (p.category || 'other') as PartCategory,
      description: typeof p.description === 'string' ? p.description : '',
      contours: Array.isArray(p.contours)
        ? p.contours
            .filter((c: any) => c && Array.isArray(c.nodes))
            .map((c: any) => ({
              id: String(c.id || generateId()),
              closed: Boolean(c.closed),
              nodes: Array.isArray(c.nodes)
                ? c.nodes
                    .filter((n: any) => n && typeof n.x === 'number' && typeof n.y === 'number')
                    .map((n: any) => ({
                      id: String(n.id || generateId()),
                      x: n.x,
                      y: n.y,
                      handleIn: n.handleIn ? { x: n.handleIn.x, y: n.handleIn.y } : null,
                      handleOut: n.handleOut ? { x: n.handleOut.x, y: n.handleOut.y } : null,
                      type: n.type || 'corner',
                    }))
                : [],
            }))
        : [],
      createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
    }));
}
