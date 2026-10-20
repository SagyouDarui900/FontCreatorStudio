import { BezierNode, PathContour, Point, StrokePoint, PressureCurveConfig } from "../../../types";
import { generateId } from "../id";
import { pointsToBezierContourNodes } from "../../imageVectorizer";
import { simplifyPointsRDP } from "./smoothing";
import { getContourSignedArea, reverseContour } from "../bounds";

export function createSharpAngularContour(
  rawPoints: (Point | StrokePoint)[],
  strokeWidth: number = 35,
  pressureSensitivity: 'high' | 'normal' | 'low' | 'off' = 'normal',
  pressureCurve?: PressureCurveConfig | null
): PathContour {
  if (!rawPoints || rawPoints.length === 0) {
    return { id: generateId(), closed: true, nodes: [] };
  }

  const halfWidth = Math.max(2, strokeWidth / 2);

  // 1点のみ（ドット打ち・タップ）の場合は完全な正方形
  if (rawPoints.length === 1) {
    const p = rawPoints[0];
    const r = Math.round(halfWidth);
    return {
      id: generateId(),
      closed: true,
      nodes: [
        { id: generateId(), x: p.x - r, y: p.y - r, type: 'corner' },
        { id: generateId(), x: p.x + r, y: p.y - r, type: 'corner' },
        { id: generateId(), x: p.x + r, y: p.y + r, type: 'corner' },
        { id: generateId(), x: p.x - r, y: p.y + r, type: 'corner' },
      ],
    };
  }

  // 1. 重複点（近接点）の除去
  const cleanPoints: Point[] = [rawPoints[0]];
  for (let i = 1; i < rawPoints.length; i++) {
    const prev = cleanPoints[cleanPoints.length - 1];
    const curr = rawPoints[i];
    if (Math.hypot(curr.x - prev.x, curr.y - prev.y) >= 2.5) {
      cleanPoints.push({ x: curr.x, y: curr.y });
    }
  }

  if (cleanPoints.length < 2) {
    const p = cleanPoints[0] || rawPoints[0];
    const r = Math.round(halfWidth);
    return {
      id: generateId(),
      closed: true,
      nodes: [
        { id: generateId(), x: p.x - r, y: p.y - r, type: 'corner' },
        { id: generateId(), x: p.x + r, y: p.y - r, type: 'corner' },
        { id: generateId(), x: p.x + r, y: p.y + r, type: 'corner' },
        { id: generateId(), x: p.x - r, y: p.y + r, type: 'corner' },
      ],
    };
  }

  // 2. 直線セグメント骨格化（Ramer-Douglas-Peucker）
  // カクカク感を際立たせるため、手ブレの曲率を直線に整理
  const backboneEpsilon = Math.max(14, strokeWidth * 0.42);
  let backbone = simplifyPointsRDP(cleanPoints, backboneEpsilon);
  if (backbone.length < 2) {
    backbone = [cleanPoints[0], cleanPoints[cleanPoints.length - 1]];
  }

  // 3. 微小な屈曲のクレンジング & 幾何学角度（水平・垂直・45度）のスナップ整流
  const refinedBackbone: Point[] = [backbone[0]];
  for (let i = 1; i < backbone.length - 1; i++) {
    const pPrev = refinedBackbone[refinedBackbone.length - 1];
    const pCurr = backbone[i];
    const pNext = backbone[i + 1];

    const v1x = pCurr.x - pPrev.x;
    const v1y = pCurr.y - pPrev.y;
    const v2x = pNext.x - pCurr.x;
    const v2y = pNext.y - pCurr.y;
    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);

    if (len1 < 1 || len2 < 1) continue;

    // 2セグメント間の折れ曲がり角
    const cosAngle = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (len1 * len2)));
    const turnAngleDeg = (Math.acos(cosAngle) * 180) / Math.PI;

    // 屈曲が12度未満の極めて緩やかな角度は1本の直線として統合（角として残さない）
    if (turnAngleDeg < 12) {
      continue;
    }
    refinedBackbone.push(pCurr);
  }
  refinedBackbone.push(backbone[backbone.length - 1]);

  // 45度/水平/垂直へのマイルドなスナップ（セグメントがほぼ直線・直角・対角線のときに端正な角を強調）
  const snappedBackbone: Point[] = [{ ...refinedBackbone[0] }];
  for (let i = 1; i < refinedBackbone.length; i++) {
    const prev = snappedBackbone[i - 1];
    const curr = refinedBackbone[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 2) continue;

    const angleDeg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    // 0, 45, 90, 135, 180, 225, 270, 315 度に近いかチェック
    const nearestOct = Math.round(angleDeg / 45) * 45;
    const diff = Math.abs(angleDeg - nearestOct);

    if (diff <= 8 && i === refinedBackbone.length - 1) {
      // 最終点のスナップ
      const targetRad = (nearestOct * Math.PI) / 180;
      snappedBackbone.push({
        x: Math.round(prev.x + Math.cos(targetRad) * dist),
        y: Math.round(prev.y + Math.sin(targetRad) * dist),
      });
    } else {
      snappedBackbone.push({ x: Math.round(curr.x), y: Math.round(curr.y) });
    }
  }

  const finalBackbone = snappedBackbone.length >= 2 ? snappedBackbone : backbone;
  const m = finalBackbone.length;

  if (m === 2) {
    const p0 = finalBackbone[0];
    const p1 = finalBackbone[1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const contour: PathContour = {
      id: generateId(),
      closed: true,
      nodes: [
        { id: generateId(), x: Math.round(p0.x + nx * halfWidth), y: Math.round(p0.y + ny * halfWidth), type: 'corner' },
        { id: generateId(), x: Math.round(p1.x + nx * halfWidth), y: Math.round(p1.y + ny * halfWidth), type: 'corner' },
        { id: generateId(), x: Math.round(p1.x - nx * halfWidth), y: Math.round(p1.y - ny * halfWidth), type: 'corner' },
        { id: generateId(), x: Math.round(p0.x - nx * halfWidth), y: Math.round(p0.y - ny * halfWidth), type: 'corner' },
      ],
    };
    return getContourSignedArea(contour) < 0 ? reverseContour(contour) : contour;
  }

  // 4. セグメントの方向・法線ベクトル
  const segDirs: Point[] = [];
  const segNorms: Point[] = [];
  for (let i = 0; i < m - 1; i++) {
    const dx = finalBackbone[i + 1].x - finalBackbone[i].x;
    const dy = finalBackbone[i + 1].y - finalBackbone[i].y;
    const len = Math.hypot(dx, dy) || 1;
    const vx = dx / len;
    const vy = dy / len;
    segDirs.push({ x: vx, y: vy });
    segNorms.push({ x: -vy, y: vx });
  }

  // 5. マイター結合（Miter Joint）による左右の角ばり境界点列の生成
  const leftPoints: Point[] = [];
  const rightPoints: Point[] = [];

  // 始点（スクエアカット）
  leftPoints.push({
    x: Math.round(finalBackbone[0].x + segNorms[0].x * halfWidth),
    y: Math.round(finalBackbone[0].y + segNorms[0].y * halfWidth),
  });
  rightPoints.push({
    x: Math.round(finalBackbone[0].x - segNorms[0].x * halfWidth),
    y: Math.round(finalBackbone[0].y - segNorms[0].y * halfWidth),
  });

  // 中間頂点におけるマイター角の計算
  for (let i = 1; i < m - 1; i++) {
    const pt = finalBackbone[i];
    const nPrev = segNorms[i - 1];
    const nCurr = segNorms[i];
    const vPrev = segDirs[i - 1];
    const vCurr = segDirs[i];

    const cross = vPrev.x * vCurr.y - vPrev.y * vCurr.x;
    const sumNx = nPrev.x + nCurr.x;
    const sumNy = nPrev.y + nCurr.y;
    const sumLen = Math.hypot(sumNx, sumNy);

    if (sumLen < 0.05) {
      // 180°折り返し
      leftPoints.push(
        { x: Math.round(pt.x + nPrev.x * halfWidth), y: Math.round(pt.y + nPrev.y * halfWidth) },
        { x: Math.round(pt.x + nCurr.x * halfWidth), y: Math.round(pt.y + nCurr.y * halfWidth) }
      );
      rightPoints.push(
        { x: Math.round(pt.x - nPrev.x * halfWidth), y: Math.round(pt.y - nPrev.y * halfWidth) },
        { x: Math.round(pt.x - nCurr.x * halfWidth), y: Math.round(pt.y - nCurr.y * halfWidth) }
      );
      continue;
    }

    const uNx = sumNx / sumLen;
    const uNy = sumNy / sumLen;
    const miter = 2 / sumLen; // 1 / cos(theta/2)

    // 内角側はストローク突き抜けを防ぐ安全なクランプ（innerMiter <= 1.4）
    const innerMiter = Math.min(1.4, miter);

    if (cross > 0.05) {
      // 左に折れ曲がる（左側が内角、右側が外角）
      leftPoints.push({
        x: Math.round(pt.x + uNx * halfWidth * innerMiter),
        y: Math.round(pt.y + uNy * halfWidth * innerMiter),
      });

      // マイターリミット: 鋭すぎる外角（miter > 2.0）はベベル（斜めカット2点）
      if (miter > 2.0) {
        rightPoints.push(
          { x: Math.round(pt.x - nPrev.x * halfWidth), y: Math.round(pt.y - nPrev.y * halfWidth) },
          { x: Math.round(pt.x - nCurr.x * halfWidth), y: Math.round(pt.y - nCurr.y * halfWidth) }
        );
      } else {
        rightPoints.push({
          x: Math.round(pt.x - uNx * halfWidth * miter),
          y: Math.round(pt.y - uNy * halfWidth * miter),
        });
      }
    } else if (cross < -0.05) {
      // 右に折れ曲がる（右側が内角、左側が外角）
      rightPoints.push({
        x: Math.round(pt.x - uNx * halfWidth * innerMiter),
        y: Math.round(pt.y - uNy * halfWidth * innerMiter),
      });

      // マイターリミット: 鋭すぎる外角（miter > 2.0）はベベル（斜めカット2点）
      if (miter > 2.0) {
        leftPoints.push(
          { x: Math.round(pt.x + nPrev.x * halfWidth), y: Math.round(pt.y + nPrev.y * halfWidth) },
          { x: Math.round(pt.x + nCurr.x * halfWidth), y: Math.round(pt.y + nCurr.y * halfWidth) }
        );
      } else {
        leftPoints.push({
          x: Math.round(pt.x + uNx * halfWidth * miter),
          y: Math.round(pt.y + uNy * halfWidth * miter),
        });
      }
    } else {
      // ほぼ直線
      leftPoints.push({
        x: Math.round(pt.x + uNx * halfWidth),
        y: Math.round(pt.y + uNy * halfWidth),
      });
      rightPoints.push({
        x: Math.round(pt.x - uNx * halfWidth),
        y: Math.round(pt.y - uNy * halfWidth),
      });
    }
  }

  // 終点（スクエアカット）
  const lastNorm = segNorms[segNorms.length - 1];
  leftPoints.push({
    x: Math.round(finalBackbone[m - 1].x + lastNorm.x * halfWidth),
    y: Math.round(finalBackbone[m - 1].y + lastNorm.y * halfWidth),
  });
  rightPoints.push({
    x: Math.round(finalBackbone[m - 1].x - lastNorm.x * halfWidth),
    y: Math.round(finalBackbone[m - 1].y - lastNorm.y * halfWidth),
  });

  // 6. 時計回りの閉多角形ループを構築
  const allCorners: Point[] = [...rightPoints, ...leftPoints.reverse()];

  // 近すぎる連続重複点を除去
  const deduplicatedCorners: Point[] = [];
  for (let i = 0; i < allCorners.length; i++) {
    if (deduplicatedCorners.length === 0) {
      deduplicatedCorners.push(allCorners[i]);
      continue;
    }
    const prev = deduplicatedCorners[deduplicatedCorners.length - 1];
    const curr = allCorners[i];
    if (Math.hypot(curr.x - prev.x, curr.y - prev.y) > 1.5) {
      deduplicatedCorners.push(curr);
    }
  }

  const contour: PathContour = {
    id: generateId(),
    closed: true,
    nodes: deduplicatedCorners.map((p) => ({
      id: generateId(),
      x: p.x,
      y: p.y,
      type: 'corner',
    })),
  };

  return getContourSignedArea(contour) < 0 ? reverseContour(contour) : contour;
}

/**
 * カクカク角丸筆（sharp_round）専用の幾何学的角丸アウトライン生成
 * 直線セグメントと45°/90°/水平垂直スナップの幾何学骨格をベースに、
 * 各コーナーのターンに滑らかな角丸フィレット（Round Join）および
 * ストローク両端に綺麗な半円ラウンドキャップ（Round Cap）を適用したモダン角丸文字用のアウトラインを生成
 */
export function createSharpRoundedContour(
  rawPoints: (Point | StrokePoint)[],
  strokeWidth: number = 35,
  pressureSensitivity: 'high' | 'normal' | 'low' | 'off' = 'normal',
  pressureCurve?: PressureCurveConfig | null
): PathContour {
  if (!rawPoints || rawPoints.length === 0) {
    return { id: generateId(), closed: true, nodes: [] };
  }

  const halfWidth = Math.max(3, strokeWidth / 2);
  const kappa = 0.5522847498;
  const ox = halfWidth * kappa;

  // 1点のみ（ドット打ち・タップ）の場合は完全な円（4つのsmoothノード）
  if (rawPoints.length === 1) {
    const p = rawPoints[0];
    return {
      id: generateId(),
      closed: true,
      nodes: [
        { id: generateId(), x: p.x, y: p.y - halfWidth, handleIn: { x: p.x - ox, y: p.y - halfWidth }, handleOut: { x: p.x + ox, y: p.y - halfWidth }, type: 'smooth' },
        { id: generateId(), x: p.x + halfWidth, y: p.y, handleIn: { x: p.x + halfWidth, y: p.y - ox }, handleOut: { x: p.x + halfWidth, y: p.y + ox }, type: 'smooth' },
        { id: generateId(), x: p.x, y: p.y + halfWidth, handleIn: { x: p.x + ox, y: p.y + halfWidth }, handleOut: { x: p.x - ox, y: p.y + halfWidth }, type: 'smooth' },
        { id: generateId(), x: p.x - halfWidth, y: p.y, handleIn: { x: p.x - halfWidth, y: p.y + ox }, handleOut: { x: p.x - halfWidth, y: p.y - ox }, type: 'smooth' },
      ],
    };
  }

  // 1. 重複点（近接点）の除去
  const cleanPoints: Point[] = [rawPoints[0]];
  for (let i = 1; i < rawPoints.length; i++) {
    const prev = cleanPoints[cleanPoints.length - 1];
    const curr = rawPoints[i];
    if (Math.hypot(curr.x - prev.x, curr.y - prev.y) >= 2.5) {
      cleanPoints.push({ x: curr.x, y: curr.y });
    }
  }

  if (cleanPoints.length < 2) {
    const p = cleanPoints[0] || rawPoints[0];
    return {
      id: generateId(),
      closed: true,
      nodes: [
        { id: generateId(), x: p.x, y: p.y - halfWidth, handleIn: { x: p.x - ox, y: p.y - halfWidth }, handleOut: { x: p.x + ox, y: p.y - halfWidth }, type: 'smooth' },
        { id: generateId(), x: p.x + halfWidth, y: p.y, handleIn: { x: p.x + halfWidth, y: p.y - ox }, handleOut: { x: p.x + halfWidth, y: p.y + ox }, type: 'smooth' },
        { id: generateId(), x: p.x, y: p.y + halfWidth, handleIn: { x: p.x + ox, y: p.y + halfWidth }, handleOut: { x: p.x - ox, y: p.y + halfWidth }, type: 'smooth' },
        { id: generateId(), x: p.x - halfWidth, y: p.y, handleIn: { x: p.x - halfWidth, y: p.y + ox }, handleOut: { x: p.x - halfWidth, y: p.y - ox }, type: 'smooth' },
      ],
    };
  }

  // 2. 直線セグメント骨格化（Ramer-Douglas-Peucker）
  const backboneEpsilon = Math.max(14, strokeWidth * 0.42);
  let backbone = simplifyPointsRDP(cleanPoints, backboneEpsilon);
  if (backbone.length < 2) {
    backbone = [cleanPoints[0], cleanPoints[cleanPoints.length - 1]];
  }

  // 3. 微小な屈曲のクレンジング & 幾何学角度（水平・垂直・45度）のスナップ整流
  const refinedBackbone: Point[] = [backbone[0]];
  for (let i = 1; i < backbone.length - 1; i++) {
    const pPrev = refinedBackbone[refinedBackbone.length - 1];
    const pCurr = backbone[i];
    const pNext = backbone[i + 1];

    const v1x = pCurr.x - pPrev.x;
    const v1y = pCurr.y - pPrev.y;
    const v2x = pNext.x - pCurr.x;
    const v2y = pNext.y - pCurr.y;
    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);

    if (len1 < 1 || len2 < 1) continue;

    const cosAngle = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (len1 * len2)));
    const turnAngleDeg = (Math.acos(cosAngle) * 180) / Math.PI;

    if (turnAngleDeg < 12) {
      continue;
    }
    refinedBackbone.push(pCurr);
  }
  refinedBackbone.push(backbone[backbone.length - 1]);

  // 45度/水平/垂直へのマイルドなスナップ
  const snappedBackbone: Point[] = [{ ...refinedBackbone[0] }];
  for (let i = 1; i < refinedBackbone.length; i++) {
    const prev = snappedBackbone[i - 1];
    const curr = refinedBackbone[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 2) continue;

    const angleDeg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    const nearestOct = Math.round(angleDeg / 45) * 45;
    const diff = Math.abs(angleDeg - nearestOct);

    if (diff <= 8 && i === refinedBackbone.length - 1) {
      const targetRad = (nearestOct * Math.PI) / 180;
      snappedBackbone.push({
        x: Math.round(prev.x + Math.cos(targetRad) * dist),
        y: Math.round(prev.y + Math.sin(targetRad) * dist),
      });
    } else {
      snappedBackbone.push({ x: Math.round(curr.x), y: Math.round(curr.y) });
    }
  }

  const finalBackbone = snappedBackbone.length >= 2 ? snappedBackbone : backbone;
  const m = finalBackbone.length;

  // 単一セグメント（2点間の直線）の場合: カプセル／ピル形状（丸端の長方形）
  if (m === 2) {
    const p0 = finalBackbone[0];
    const p1 = finalBackbone[1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy) || 1;
    const vx = dx / len;
    const vy = dy / len;
    const nx = -vy;
    const ny = vx;

    const capOffset = halfWidth * kappa;

    const nodes: BezierNode[] = [
      // 終端ラウンドキャップ (p1)
      {
        id: generateId(),
        x: Math.round(p1.x + nx * halfWidth),
        y: Math.round(p1.y + ny * halfWidth),
        handleOut: {
          x: Math.round(p1.x + nx * halfWidth + vx * capOffset),
          y: Math.round(p1.y + ny * halfWidth + vy * capOffset),
        },
        type: 'smooth',
      },
      {
        id: generateId(),
        x: Math.round(p1.x + vx * halfWidth),
        y: Math.round(p1.y + vy * halfWidth),
        handleIn: {
          x: Math.round(p1.x + vx * halfWidth + nx * capOffset),
          y: Math.round(p1.y + vy * halfWidth + ny * capOffset),
        },
        handleOut: {
          x: Math.round(p1.x + vx * halfWidth - nx * capOffset),
          y: Math.round(p1.y + vy * halfWidth - ny * capOffset),
        },
        type: 'smooth',
      },
      {
        id: generateId(),
        x: Math.round(p1.x - nx * halfWidth),
        y: Math.round(p1.y - ny * halfWidth),
        handleIn: {
          x: Math.round(p1.x - nx * halfWidth + vx * capOffset),
          y: Math.round(p1.y - ny * halfWidth + vy * capOffset),
        },
        type: 'smooth',
      },
      // 始端ラウンドキャップ (p0)
      {
        id: generateId(),
        x: Math.round(p0.x - nx * halfWidth),
        y: Math.round(p0.y - ny * halfWidth),
        handleOut: {
          x: Math.round(p0.x - nx * halfWidth - vx * capOffset),
          y: Math.round(p0.y - ny * halfWidth - vy * capOffset),
        },
        type: 'smooth',
      },
      {
        id: generateId(),
        x: Math.round(p0.x - vx * halfWidth),
        y: Math.round(p0.y - vy * halfWidth),
        handleIn: {
          x: Math.round(p0.x - vx * halfWidth - nx * capOffset),
          y: Math.round(p0.y - vy * halfWidth - ny * capOffset),
        },
        handleOut: {
          x: Math.round(p0.x - vx * halfWidth + nx * capOffset),
          y: Math.round(p0.y - vy * halfWidth + ny * capOffset),
        },
        type: 'smooth',
      },
      {
        id: generateId(),
        x: Math.round(p0.x + nx * halfWidth),
        y: Math.round(p0.y + ny * halfWidth),
        handleIn: {
          x: Math.round(p0.x + nx * halfWidth - vx * capOffset),
          y: Math.round(p0.y + ny * halfWidth - vy * capOffset),
        },
        type: 'smooth',
      },
    ];

    const contour: PathContour = {
      id: generateId(),
      closed: true,
      nodes,
    };
    return getContourSignedArea(contour) < 0 ? reverseContour(contour) : contour;
  }

  // 4. マルチセグメントの方向・法線ベクトル
  const segDirs: Point[] = [];
  const segNorms: Point[] = [];
  for (let i = 0; i < m - 1; i++) {
    const dx = finalBackbone[i + 1].x - finalBackbone[i].x;
    const dy = finalBackbone[i + 1].y - finalBackbone[i].y;
    const len = Math.hypot(dx, dy) || 1;
    const vx = dx / len;
    const vy = dy / len;
    segDirs.push({ x: vx, y: vy });
    segNorms.push({ x: -vy, y: vx });
  }

  const nodes: BezierNode[] = [];

  // 5. 始端（p0）の半円ラウンドキャップ
  const v0 = segDirs[0];
  const n0 = segNorms[0];
  const capOffset0 = halfWidth * kappa;
  const p0 = finalBackbone[0];

  // 始端キャップの頂点（-v0方向）
  nodes.push({
    id: generateId(),
    x: Math.round(p0.x - v0.x * halfWidth),
    y: Math.round(p0.y - v0.y * halfWidth),
    handleIn: {
      x: Math.round(p0.x - v0.x * halfWidth - n0.x * capOffset0),
      y: Math.round(p0.y - v0.y * halfWidth - n0.y * capOffset0),
    },
    handleOut: {
      x: Math.round(p0.x - v0.x * halfWidth + n0.x * capOffset0),
      y: Math.round(p0.y - v0.y * halfWidth + n0.y * capOffset0),
    },
    type: 'smooth',
  });

  // 始端の左側境界点
  nodes.push({
    id: generateId(),
    x: Math.round(p0.x + n0.x * halfWidth),
    y: Math.round(p0.y + n0.y * halfWidth),
    handleIn: {
      x: Math.round(p0.x + n0.x * halfWidth - v0.x * capOffset0),
      y: Math.round(p0.y + n0.y * halfWidth - v0.y * capOffset0),
    },
    type: 'smooth',
  });

  // 6. 左側サイドのセグメント & 角丸ターン処理
  for (let i = 1; i < m - 1; i++) {
    const pt = finalBackbone[i];
    const nPrev = segNorms[i - 1];
    const nCurr = segNorms[i];
    const vPrev = segDirs[i - 1];
    const vCurr = segDirs[i];

    const cross = vPrev.x * vCurr.y - vPrev.y * vCurr.x;
    const cosAngle = Math.max(-1, Math.min(1, vPrev.x * vCurr.x + vPrev.y * vCurr.y));
    const turnAngle = Math.acos(cosAngle);

    const sumNx = nPrev.x + nCurr.x;
    const sumNy = nPrev.y + nCurr.y;
    const sumLen = Math.hypot(sumNx, sumNy) || 1;
    const uNx = sumNx / sumLen;
    const uNy = sumNy / sumLen;

    if (cross < -0.05) {
      // 右に曲がる（左側は外角！円弧フィレットで丸める）
      const arcHandleLen = (4 / 3) * Math.tan(turnAngle / 4) * halfWidth;

      const qIn: Point = {
        x: Math.round(pt.x + nPrev.x * halfWidth),
        y: Math.round(pt.y + nPrev.y * halfWidth),
      };
      const qOut: Point = {
        x: Math.round(pt.x + nCurr.x * halfWidth),
        y: Math.round(pt.y + nCurr.y * halfWidth),
      };

      if (turnAngle > 1.4) {
        const apex: Point = {
          x: Math.round(pt.x + uNx * halfWidth),
          y: Math.round(pt.y + uNy * halfWidth),
        };
        const halfTan = (4 / 3) * Math.tan(turnAngle / 8) * halfWidth;
        const uVx = (vPrev.x + vCurr.x);
        const uVy = (vPrev.y + vCurr.y);
        const uVLen = Math.hypot(uVx, uVy) || 1;
        const tangX = uVx / uVLen;
        const tangY = uVy / uVLen;

        nodes.push({
          id: generateId(),
          x: qIn.x,
          y: qIn.y,
          handleOut: {
            x: Math.round(qIn.x + vPrev.x * halfTan),
            y: Math.round(qIn.y + vPrev.y * halfTan),
          },
          type: 'smooth',
        });
        nodes.push({
          id: generateId(),
          x: apex.x,
          y: apex.y,
          handleIn: {
            x: Math.round(apex.x - tangX * halfTan),
            y: Math.round(apex.y - tangY * halfTan),
          },
          handleOut: {
            x: Math.round(apex.x + tangX * halfTan),
            y: Math.round(apex.y + tangY * halfTan),
          },
          type: 'smooth',
        });
        nodes.push({
          id: generateId(),
          x: qOut.x,
          y: qOut.y,
          handleIn: {
            x: Math.round(qOut.x - vCurr.x * halfTan),
            y: Math.round(qOut.y - vCurr.y * halfTan),
          },
          type: 'smooth',
        });
      } else {
        nodes.push({
          id: generateId(),
          x: qIn.x,
          y: qIn.y,
          handleOut: {
            x: Math.round(qIn.x + vPrev.x * arcHandleLen),
            y: Math.round(qIn.y + vPrev.y * arcHandleLen),
          },
          type: 'smooth',
        });
        nodes.push({
          id: generateId(),
          x: qOut.x,
          y: qOut.y,
          handleIn: {
            x: Math.round(qOut.x - vCurr.x * arcHandleLen),
            y: Math.round(qOut.y - vCurr.y * arcHandleLen),
          },
          type: 'smooth',
        });
      }
    } else if (cross > 0.05) {
      // 左に曲がる（左側は内角！内角交点）
      const innerMiter = Math.min(1.4, 2 / sumLen);
      nodes.push({
        id: generateId(),
        x: Math.round(pt.x + uNx * halfWidth * innerMiter),
        y: Math.round(pt.y + uNy * halfWidth * innerMiter),
        type: 'corner',
      });
    } else {
      nodes.push({
        id: generateId(),
        x: Math.round(pt.x + nCurr.x * halfWidth),
        y: Math.round(pt.y + nCurr.y * halfWidth),
        type: 'smooth',
      });
    }
  }

  // 7. 終端（pLast）の半円ラウンドキャップ
  const pLast = finalBackbone[m - 1];
  const vLast = segDirs[segDirs.length - 1];
  const nLast = segNorms[segNorms.length - 1];
  const capOffsetLast = halfWidth * kappa;

  nodes.push({
    id: generateId(),
    x: Math.round(pLast.x + nLast.x * halfWidth),
    y: Math.round(pLast.y + nLast.y * halfWidth),
    handleOut: {
      x: Math.round(pLast.x + nLast.x * halfWidth + vLast.x * capOffsetLast),
      y: Math.round(pLast.y + nLast.y * halfWidth + vLast.y * capOffsetLast),
    },
    type: 'smooth',
  });

  nodes.push({
    id: generateId(),
    x: Math.round(pLast.x + vLast.x * halfWidth),
    y: Math.round(pLast.y + vLast.y * halfWidth),
    handleIn: {
      x: Math.round(pLast.x + vLast.x * halfWidth + nLast.x * capOffsetLast),
      y: Math.round(pLast.y + vLast.y * halfWidth + nLast.y * capOffsetLast),
    },
    handleOut: {
      x: Math.round(pLast.x + vLast.x * halfWidth - nLast.x * capOffsetLast),
      y: Math.round(pLast.y + vLast.y * halfWidth - nLast.y * capOffsetLast),
    },
    type: 'smooth',
  });

  nodes.push({
    id: generateId(),
    x: Math.round(pLast.x - nLast.x * halfWidth),
    y: Math.round(pLast.y - nLast.y * halfWidth),
    handleIn: {
      x: Math.round(pLast.x - nLast.x * halfWidth + vLast.x * capOffsetLast),
      y: Math.round(pLast.y - nLast.y * halfWidth + vLast.y * capOffsetLast),
    },
    type: 'smooth',
  });

  // 8. 右側サイドのセグメント & 角丸ターン処理（逆順に走査）
  for (let i = m - 2; i >= 1; i--) {
    const pt = finalBackbone[i];
    const nPrev = segNorms[i - 1];
    const nCurr = segNorms[i];
    const vPrev = segDirs[i - 1];
    const vCurr = segDirs[i];

    const cross = vPrev.x * vCurr.y - vPrev.y * vCurr.x;
    const cosAngle = Math.max(-1, Math.min(1, vPrev.x * vCurr.x + vPrev.y * vCurr.y));
    const turnAngle = Math.acos(cosAngle);

    const sumNx = nPrev.x + nCurr.x;
    const sumNy = nPrev.y + nCurr.y;
    const sumLen = Math.hypot(sumNx, sumNy) || 1;
    const uNx = sumNx / sumLen;
    const uNy = sumNy / sumLen;

    if (cross > 0.05) {
      // 左に曲がる（右側は外角！円弧フィレットで丸める。逆方向）
      const arcHandleLen = (4 / 3) * Math.tan(turnAngle / 4) * halfWidth;

      const qIn: Point = {
        x: Math.round(pt.x - nCurr.x * halfWidth),
        y: Math.round(pt.y - nCurr.y * halfWidth),
      };
      const qOut: Point = {
        x: Math.round(pt.x - nPrev.x * halfWidth),
        y: Math.round(pt.y - nPrev.y * halfWidth),
      };

      if (turnAngle > 1.4) {
        const apex: Point = {
          x: Math.round(pt.x - uNx * halfWidth),
          y: Math.round(pt.y - uNy * halfWidth),
        };
        const halfTan = (4 / 3) * Math.tan(turnAngle / 8) * halfWidth;
        const uVx = (vPrev.x + vCurr.x);
        const uVy = (vPrev.y + vCurr.y);
        const uVLen = Math.hypot(uVx, uVy) || 1;
        const tangX = -uVx / uVLen;
        const tangY = -uVy / uVLen;

        nodes.push({
          id: generateId(),
          x: qIn.x,
          y: qIn.y,
          handleOut: {
            x: Math.round(qIn.x - vCurr.x * halfTan),
            y: Math.round(qIn.y - vCurr.y * halfTan),
          },
          type: 'smooth',
        });
        nodes.push({
          id: generateId(),
          x: apex.x,
          y: apex.y,
          handleIn: {
            x: Math.round(apex.x - tangX * halfTan),
            y: Math.round(apex.y - tangY * halfTan),
          },
          handleOut: {
            x: Math.round(apex.x + tangX * halfTan),
            y: Math.round(apex.y + tangY * halfTan),
          },
          type: 'smooth',
        });
        nodes.push({
          id: generateId(),
          x: qOut.x,
          y: qOut.y,
          handleIn: {
            x: Math.round(qOut.x + vPrev.x * halfTan),
            y: Math.round(qOut.y + vPrev.y * halfTan),
          },
          type: 'smooth',
        });
      } else {
        nodes.push({
          id: generateId(),
          x: qIn.x,
          y: qIn.y,
          handleOut: {
            x: Math.round(qIn.x - vCurr.x * arcHandleLen),
            y: Math.round(qIn.y - vCurr.y * arcHandleLen),
          },
          type: 'smooth',
        });
        nodes.push({
          id: generateId(),
          x: qOut.x,
          y: qOut.y,
          handleIn: {
            x: Math.round(qOut.x + vPrev.x * arcHandleLen),
            y: Math.round(qOut.y + vPrev.y * arcHandleLen),
          },
          type: 'smooth',
        });
      }
    } else if (cross < -0.05) {
      // 右に曲がる（右側は内角！内角交点）
      const innerMiter = Math.min(1.4, 2 / sumLen);
      nodes.push({
        id: generateId(),
        x: Math.round(pt.x - uNx * halfWidth * innerMiter),
        y: Math.round(pt.y - uNy * halfWidth * innerMiter),
        type: 'corner',
      });
    } else {
      nodes.push({
        id: generateId(),
        x: Math.round(pt.x - nPrev.x * halfWidth),
        y: Math.round(pt.y - nPrev.y * halfWidth),
        type: 'smooth',
      });
    }
  }

  // 9. 始端の右側境界点と接続
  nodes.push({
    id: generateId(),
    x: Math.round(p0.x - n0.x * halfWidth),
    y: Math.round(p0.y - n0.y * halfWidth),
    handleOut: {
      x: Math.round(p0.x - n0.x * halfWidth - v0.x * capOffset0),
      y: Math.round(p0.y - n0.y * halfWidth - v0.y * capOffset0),
    },
    type: 'smooth',
  });

  // 近すぎる連続重複ノードを除去
  const deduplicatedNodes: BezierNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    if (deduplicatedNodes.length === 0) {
      deduplicatedNodes.push(nodes[i]);
      continue;
    }
    const prev = deduplicatedNodes[deduplicatedNodes.length - 1];
    const curr = nodes[i];
    if (Math.hypot(curr.x - prev.x, curr.y - prev.y) > 2) {
      deduplicatedNodes.push(curr);
    }
  }

  const contour: PathContour = {
    id: generateId(),
    closed: true,
    nodes: deduplicatedNodes,
  };

  return getContourSignedArea(contour) < 0 ? reverseContour(contour) : contour;
}

/**
 * Options for Subdivided Fine-Segment Stroke generation
 */
