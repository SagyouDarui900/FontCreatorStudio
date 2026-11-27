export interface IvsVariant {
  selectorCode: number; // e.g. 0xE0100 (VS17) .. 0xE01EF (IVS), or 0xFE00 .. 0xFE0F (SVS)
  selectorName: string; // e.g. "VS17 (U+E0100 / JIS2004)"
  collection: 'Adobe-Japan1' | 'Moji_Joho' | 'SVS' | 'Custom';
  description: string;
  distinction: string; // 形状の違い (例: "一点しんにょう", "二点しんにょう")
}

export interface IvsPresetEntry {
  baseChar: string;
  baseUnicode: number;
  name: string;
  category: '人名・地名' | 'JIS90/2004例示' | '常用・旧字';
  variants: IvsVariant[];
}

export interface VariationSelectorOption {
  code: number;
  label: string;
  kind: 'IVS' | 'SVS';
}

export const VARIATION_SELECTOR_OPTIONS: VariationSelectorOption[] = [
  // Ideographic Variation Selectors (Plane 14: U+E0100..U+E01EF -> VS17..VS256)
  ...Array.from({ length: 16 }, (_, idx) => {
    const code = 0xe0100 + idx;
    const vsNum = 17 + idx;
    const hex = code.toString(16).toUpperCase();
    return {
      code,
      label: `VS${vsNum} (U+${hex}) [漢字IVS]`,
      kind: 'IVS' as const,
    };
  }),
  // Standardized Variation Selectors (BMP: U+FE00..U+FE0F -> VS1..VS16)
  ...Array.from({ length: 16 }, (_, idx) => {
    const code = 0xfe00 + idx;
    const vsNum = 1 + idx;
    const hex = code.toString(16).toUpperCase();
    return {
      code,
      label: `VS${vsNum} (U+${hex}) [標準SVS]`,
      kind: 'SVS' as const,
    };
  }),
];

export function formatVariationSelectorLabel(code: number): string {
  const hex = code.toString(16).toUpperCase().padStart(4, '0');
  if (code >= 0xe0100 && code <= 0xe01ef) {
    const vsNum = 17 + (code - 0xe0100);
    return `VS${vsNum} (U+${hex})`;
  }
  if (code >= 0xfe00 && code <= 0xfe0f) {
    const vsNum = 1 + (code - 0xfe00);
    return `VS${vsNum} (U+${hex})`;
  }
  return `U+${hex}`;
}

export const IVS_PRESETS: IvsPresetEntry[] = [
  {
    baseChar: '辻',
    baseUnicode: 0x8fbb,
    name: 'つじ',
    category: 'JIS90/2004例示',
    variants: [
      {
        selectorCode: 0xe0100,
        selectorName: 'VS17 (Adobe-Japan1 / 1点しんにょう)',
        collection: 'Adobe-Japan1',
        description: '現代の標準字形（JIS X 0213:2004 例示）。点1つのしんにょう。',
        distinction: '一点之繞 (⻌)',
      },
      {
        selectorCode: 0xe0101,
        selectorName: 'VS18 (Adobe-Japan1 / 2点しんにょう)',
        collection: 'Adobe-Japan1',
        description: '伝統的な印刷字形（JIS90 等）。点2つのしんにょう。',
        distinction: '二点之繞 (⻍)',
      },
    ],
  },
  {
    baseChar: '葛',
    baseUnicode: 0x845b,
    name: 'くず / かつしか',
    category: '人名・地名',
    variants: [
      {
        selectorCode: 0xe0100,
        selectorName: 'VS17 (Adobe-Japan1 / ヒ字形)',
        collection: 'Adobe-Japan1',
        description: '下部が「ヒ」の字形（東京都葛飾区・奈良県葛城市等の公用表記にも関連）。',
        distinction: '下部が「ヒ」',
      },
      {
        selectorCode: 0xe0101,
        selectorName: 'VS18 (Adobe-Japan1 / 匃字形)',
        collection: 'Adobe-Japan1',
        description: '下部が「匃（匂の内部が人）」の伝統字形（JIS90）。',
        distinction: '下部が「匃」',
      },
    ],
  },
  {
    baseChar: '邉',
    baseUnicode: 0x9089,
    name: 'わたなべ（邉 / U+9089）',
    category: '人名・地名',
    variants: [
      {
        selectorCode: 0xe0100,
        selectorName: 'VS17 (標準・1点しんにょう系)',
        collection: 'Moji_Joho',
        description: '「邉」(U+9089) の現代標準字形。白下の「方・児」と1点しんにょう。',
        distinction: 'U+9089 標準異体字',
      },
      {
        selectorCode: 0xe0101,
        selectorName: 'VS18 (伝統・2点しんにょう系)',
        collection: 'Moji_Joho',
        description: '人名・戸籍で区別される細部（2点しんにょうや「口」の配置差）を持つ異体字形。',
        distinction: '戸籍・伝統2点しんにょう',
      },
    ],
  },
  {
    baseChar: '邊',
    baseUnicode: 0x908a,
    name: 'わたなべ（邊 / U+908A）',
    category: '人名・地名',
    variants: [
      {
        selectorCode: 0xe0100,
        selectorName: 'VS17 (Adobe-Japan1 / 1点しんにょう)',
        collection: 'Adobe-Japan1',
        description: '「邊」(U+908A) の1点しんにょう字形。',
        distinction: '一点しんにょう・方',
      },
      {
        selectorCode: 0xe0101,
        selectorName: 'VS18 (Adobe-Japan1 / 2点しんにょう)',
        collection: 'Adobe-Japan1',
        description: '「邊」(U+908A) の伝統的2点しんにょう字形。',
        distinction: '二点しんにょう・伝統字形',
      },
    ],
  },
  {
    baseChar: '芦',
    baseUnicode: 0x82a6,
    name: 'あし / ろ',
    category: '人名・地名',
    variants: [
      {
        selectorCode: 0xe0100,
        selectorName: 'VS17 (Adobe-Japan1 / 戸)',
        collection: 'Adobe-Japan1',
        description: 'くさかんむりの下が「戸」の現代標準字形。',
        distinction: '下が「戸」',
      },
      {
        selectorCode: 0xe0101,
        selectorName: 'VS18 (Adobe-Japan1 / 戶)',
        collection: 'Adobe-Japan1',
        description: 'くさかんむりの下が旧字形「戶」（一画目が斜め/縦）。',
        distinction: '下が「戶」',
      },
    ],
  },
  {
    baseChar: '茨',
    baseUnicode: 0x8328,
    name: 'いばらき / いばら',
    category: '人名・地名',
    variants: [
      {
        selectorCode: 0xe0100,
        selectorName: 'VS17 (Adobe-Japan1 / 二)',
        collection: 'Adobe-Japan1',
        description: '「次」の偏が「二」の標準字形。',
        distinction: '偏が「二」',
      },
      {
        selectorCode: 0xe0101,
        selectorName: 'VS18 (Adobe-Japan1 / 冫)',
        collection: 'Adobe-Japan1',
        description: '「次」の偏が「冫（にすい）」の伝統字形。',
        distinction: '偏が「冫」',
      },
    ],
  },
  {
    baseChar: '鴎',
    baseUnicode: 0x9d0e,
    name: 'かもめ / おうがい',
    category: '常用・旧字',
    variants: [
      {
        selectorCode: 0xe0100,
        selectorName: 'VS17 (Adobe-Japan1 / メ)',
        collection: 'Adobe-Japan1',
        description: '「区」の内部が「メ」の現代略字体字形。',
        distinction: '内部が「メ」',
      },
      {
        selectorCode: 0xe0101,
        selectorName: 'VS18 (Adobe-Japan1 / 品系)',
        collection: 'Adobe-Japan1',
        description: '人名・文学作品等で参照される正字「鷗」に準じた旧字形差。',
        distinction: '伝統・旧字系字形',
      },
    ],
  },
];
