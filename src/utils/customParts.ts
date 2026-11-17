/**
 * マイパーツの名前に関する共有ヘルパー。
 * ドロワー、キャンバス、radicalStudio の全経路で同じ方針を使う。
 */

/**
 * 既存名と重複しないパーツ名を返す。
 * baseName が未使用ならそのまま返し、使用済みなら末尾に " 2"、" 3"、…を
 * 付けて未使用の番号を返す。baseName が空の場合は「新規パーツ」を基準にする。
 */
export function makeUniquePartName(baseName: string, existingNames: readonly string[]): string {
  const base = baseName.trim() || '新規パーツ';
  const taken = new Set(existingNames);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base} ${n}`)) {
    n += 1;
  }
  return `${base} ${n}`;
}
