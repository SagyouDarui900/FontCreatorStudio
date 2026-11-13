export interface IvsVariant {
  selectorCode: number; // e.g. 0xFE00 (VS1) or 0xE0100 (Moji_Joho VS)
  selectorName: string; // e.g. "VS1 (JIS2004 / 新字形)", "VS2 (JIS90 / 伝統字形)"
  description: string;
  distinction: string; // 形状の違い (例: "しんにょうの点が1つ", "しんにょうの点が2つ")
}

export interface IvsPresetEntry {
  baseChar: string;
  baseUnicode: number;
  name: string;
  category: '人名・地名' | 'JIS90/2004例示' | '常用・旧字';
  variants: IvsVariant[];
}

export const IVS_PRESETS: IvsPresetEntry[] = [
  {
    baseChar: '辻',
    baseUnicode: 0x8fbb,
    name: 'つじ',
    category: 'JIS90/2004例示',
    variants: [
      {
        selectorCode: 0xfe00,
        selectorName: 'VS1 (JIS2004 / 1点しんにょう)',
        description: '現代の標準字形。点1つのしんにょう。',
        distinction: '一点之繞 (⻌)',
      },
      {
        selectorCode: 0xe0100,
        selectorName: 'VS2 (JIS90 / 2点しんにょう)',
        description: '伝統的な旧印刷字形。点2つのしんにょう。',
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
        selectorCode: 0xfe00,
        selectorName: 'VS1 (JIS2004 / ヒ)',
        description: '下部が「ヒ」の字形（東京都葛飾区等の公用字形）。',
        distinction: '下部が「ヒ」',
      },
      {
        selectorCode: 0xe0100,
        selectorName: 'VS2 (JIS90 / 匃)',
        description: '下部が「匃（匂の内部が人）」の伝統字形。',
        distinction: '下部が「匃」',
      },
    ],
  },
  {
    baseChar: '邊',
    baseUnicode: 0x9089,
    name: 'わたなべ (辺/邉/邊)',
    category: '人名・地名',
    variants: [
      {
        selectorCode: 0xfe00,
        selectorName: 'VS1 (標準正字)',
        description: '康煕字典本字・標準旧字。',
        distinction: '標準旧字正字',
      },
      {
        selectorCode: 0xe0100,
        selectorName: 'VS2 (俗字・戸籍字形)',
        description: '自の内部が八、口の配置などが異なる異体字形。',
        distinction: '戸籍統一俗字',
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
        selectorCode: 0xfe00,
        selectorName: 'VS1 (JIS2004 / 戸)',
        description: '冠の下が「戸」の現代標準字形。',
        distinction: '下が「戸」',
      },
      {
        selectorCode: 0xe0100,
        selectorName: 'VS2 (JIS90 / 戶)',
        description: '下が一番上が斜めの旧字形「戶」。',
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
        selectorCode: 0xfe00,
        selectorName: 'VS1 (JIS2004 / 二)',
        description: '「次」の偏が「二」の字形。',
        distinction: '偏が「二」',
      },
      {
        selectorCode: 0xe0100,
        selectorName: 'VS2 (JIS90 / 冫)',
        description: '「次」の偏が「冫（にすい）」の字形。',
        distinction: '偏が「冫」',
      },
    ],
  },
  {
    baseChar: '鴎',
    baseUnicode: 0x9d0e,
    name: 'かもめ / おうがい',
    category: '人名・地名',
    variants: [
      {
        selectorCode: 0xfe00,
        selectorName: 'VS1 (JIS2004 / メ)',
        description: '区の内部が「メ」の現代字形。',
        distinction: '内部が「メ」',
      },
      {
        selectorCode: 0xe0100,
        selectorName: 'VS2 (JIS90 / 品)',
        description: '区の内部が「品」の森鴎外等で使われる旧字形「鷗」。',
        distinction: '内部が「品」',
      },
    ],
  },
];
