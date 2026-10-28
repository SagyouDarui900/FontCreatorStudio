import { BrushStyle } from '../../types';

export const BRUSH_STYLE_INFO: Record<BrushStyle, { name: string; desc: string; category: string }> = {
  brush: { name: '毛筆', desc: '起筆・送筆・収筆の抑揚がある筆ストローク', category: '和風・筆' },
  sumi: { name: '墨だまり筆', desc: 'トメ・ハライに滲み効果を加えた毛筆ストローク', category: '和風・筆' },
  mincho_nib: { name: '明朝体Nib', desc: '縦太横細の明朝体エレメント', category: '和風・筆' },
  reisho_chisel: { name: '隷書風平筆', desc: '扁平な筆勢のストローク', category: '和風・筆' },
  fountain: { name: '万年筆', desc: '金属ペン先のしなりとハライ', category: 'ペン・インク' },
  g_pen: { name: '漫画Gペン', desc: '筆圧による強弱と抜きのストローク', category: 'ペン・インク' },
  signpen: { name: 'サインペン', desc: '均一な太さのフェルトペンストローク', category: 'ペン・インク' },
  ballpoint: { name: 'ボールペン', desc: '細線の均一なストローク', category: 'ペン・インク' },
  calligraphy: { name: 'カリグラフィー', desc: '角度固定の扁平チゼルペン先', category: 'デザイン' },
  highlighter: { name: '平マーカー', desc: '幅広リボン状のストローク', category: 'デザイン' },
  marumoji: { name: '丸文字', desc: '端点が丸いストローク', category: 'デザイン' },
  pixel_dot: { name: 'ピクセル筆', desc: 'ビットマップ状のストローク', category: '幾何学' },
  sharp: { name: '角筆', desc: '直線とマイター角の幾何学ストローク', category: '幾何学' },
  sharp_round: { name: '角丸幾何学筆', desc: '直線骨格に滑らかな角丸フィレット', category: '幾何学' },
  polygon: { name: '多角形ペン', desc: '多角形断面のソリッドストローク', category: '幾何学' },
  pencil: { name: 'スケッチ鉛筆', desc: '芯の擦れと自然な微細テクスチャ', category: 'ナチュラル' },
  chalk: { name: 'チョーク筆', desc: '黒板風のかすれと手書き質感', category: 'ナチュラル' },
  marker: { name: '丸マーカー', desc: '均質で滑らかなアートマーカー', category: 'ナチュラル' },
  wobbly: { name: 'ゆらぎ手書き', desc: '微細な揺らぎを持つ脱力系手書き線', category: 'ナチュラル' },
};

export const CURVE_PRESET_LABELS: Record<string, { name: string; desc: string }> = {
  linear: { name: '標準 (リニア)', desc: '入力と太さが1:1の自然なレスポンス' },
  soft: { name: 'ソフト (高感度)', desc: '軽いタッチでもしっかり太さが出る' },
  hard: { name: 'ハード (重め)', desc: '強く押し込んで太く、細線がブレにくい' },
  's-curve': { name: 'S字抑揚', desc: 'トメ・ハライの抑揚を強調' },
  delicate: { name: '繊細・細字', desc: '抜き線や細かな筆圧変化を反映' },
};
