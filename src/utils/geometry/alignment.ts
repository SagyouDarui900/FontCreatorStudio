import { PathContour, Point, BezierNode } from '../../types';
import { getContoursBoundingBox, getContourBoundingBox, transformContours } from '../path';

export type AlignDirection =
  | 'left'
  | 'centerH'
  | 'right'
  | 'top'
  | 'centerV'
  | 'bottom'
  | 'emBoxCenterH'
  | 'emBoxCenterV';

export type DistributeDirection = 'horizontal' | 'vertical';

/**
 * Align multiple selected contours relative to their shared bounding box or em-box.
 */
export function alignContours(
  contours: PathContour[],
  selectedIds: string[],
  direction: AlignDirection,
  emBox: { width: number; height: number; baselineY?: number } = { width: 1000, height: 1000, baselineY: 800 }
): PathContour[] {
  if (!contours || contours.length === 0 || !selectedIds || selectedIds.length === 0) {
    return contours;
  }

  const selectedContours = contours.filter((c) => selectedIds.includes(c.id));
  if (selectedContours.length === 0) return contours;

  const groupBBox = getContoursBoundingBox(selectedContours);
  if (groupBBox.width <= 0 && groupBBox.height <= 0 && !direction.startsWith('emBox')) {
    return contours;
  }

  return contours.map((c) => {
    if (!selectedIds.includes(c.id)) return c;
    const cBBox = getContourBoundingBox(c);
    let dx = 0;
    let dy = 0;

    switch (direction) {
      case 'left':
        dx = groupBBox.minX - cBBox.minX;
        break;
      case 'centerH':
        dx = groupBBox.centerX - cBBox.centerX;
        break;
      case 'right':
        dx = groupBBox.maxX - cBBox.maxX;
        break;
      case 'top':
        dy = groupBBox.minY - cBBox.minY;
        break;
      case 'centerV':
        dy = groupBBox.centerY - cBBox.centerY;
        break;
      case 'bottom':
        dy = groupBBox.maxY - cBBox.maxY;
        break;
      case 'emBoxCenterH':
        dx = Math.round(emBox.width / 2) - cBBox.centerX;
        break;
      case 'emBoxCenterV':
        dx = 0;
        dy = Math.round(emBox.height / 2) - cBBox.centerY;
        break;
    }

    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return c;

    return {
      ...c,
      nodes: c.nodes.map((n) => ({
        ...n,
        x: Math.round(n.x + dx),
        y: Math.round(n.y + dy),
        handleIn: n.handleIn ? { x: Math.round(n.handleIn.x + dx), y: Math.round(n.handleIn.y + dy) } : null,
        handleOut: n.handleOut ? { x: Math.round(n.handleOut.x + dx), y: Math.round(n.handleOut.y + dy) } : null,
      })),
    };
  });
}

/**
 * Distribute 3 or more contours evenly with equal spacing.
 */
export function distributeContours(
  contours: PathContour[],
  selectedIds: string[],
  direction: DistributeDirection
): PathContour[] {
  if (!contours || contours.length === 0 || !selectedIds || selectedIds.length < 3) {
    return contours;
  }

  const selectedContours = contours.filter((c) => selectedIds.includes(c.id));
  if (selectedContours.length < 3) return contours;

  if (direction === 'horizontal') {
    // Sort left to right
    const items = selectedContours
      .map((c) => ({ contour: c, bbox: getContourBoundingBox(c) }))
      .sort((a, b) => a.bbox.minX - b.bbox.minX);

    const first = items[0];
    const last = items[items.length - 1];

    const totalWidths = items.slice(1, -1).reduce((sum, item) => sum + item.bbox.width, 0);
    const availableSpace = last.bbox.minX - first.bbox.maxX;
    const gap = (availableSpace - totalWidths) / (items.length - 1);

    const shiftMap = new Map<string, number>();
    let currentX = first.bbox.maxX + gap;

    for (let i = 1; i < items.length - 1; i++) {
      const item = items[i];
      const targetMinX = currentX;
      const dx = Math.round(targetMinX - item.bbox.minX);
      shiftMap.set(item.contour.id, dx);
      currentX += item.bbox.width + gap;
    }

    return contours.map((c) => {
      const dx = shiftMap.get(c.id);
      if (dx === undefined || dx === 0) return c;
      return {
        ...c,
        nodes: c.nodes.map((n) => ({
          ...n,
          x: n.x + dx,
          handleIn: n.handleIn ? { ...n.handleIn, x: n.handleIn.x + dx } : null,
          handleOut: n.handleOut ? { ...n.handleOut, x: n.handleOut.x + dx } : null,
        })),
      };
    });
  } else {
    // Vertical distribution
    const items = selectedContours
      .map((c) => ({ contour: c, bbox: getContourBoundingBox(c) }))
      .sort((a, b) => a.bbox.minY - b.bbox.minY);

    const first = items[0];
    const last = items[items.length - 1];

    const totalHeights = items.slice(1, -1).reduce((sum, item) => sum + item.bbox.height, 0);
    const availableSpace = last.bbox.minY - first.bbox.maxY;
    const gap = (availableSpace - totalHeights) / (items.length - 1);

    const shiftMap = new Map<string, number>();
    let currentY = first.bbox.maxY + gap;

    for (let i = 1; i < items.length - 1; i++) {
      const item = items[i];
      const targetMinY = currentY;
      const dy = Math.round(targetMinY - item.bbox.minY);
      shiftMap.set(item.contour.id, dy);
      currentY += item.bbox.height + gap;
    }

    return contours.map((c) => {
      const dy = shiftMap.get(c.id);
      if (dy === undefined || dy === 0) return c;
      return {
        ...c,
        nodes: c.nodes.map((n) => ({
          ...n,
          y: n.y + dy,
          handleIn: n.handleIn ? { ...n.handleIn, y: n.handleIn.y + dy } : null,
          handleOut: n.handleOut ? { ...n.handleOut, y: n.handleOut.y + dy } : null,
        })),
      };
    });
  }
}

/**
 * Scale selected contour to exact target width and height in font units
 */
export function setContourExactDimensions(
  contour: PathContour,
  newWidth: number,
  newHeight: number,
  keepAspect: boolean = false
): PathContour {
  const bbox = getContourBoundingBox(contour);
  if ((bbox.width <= 0 && bbox.height <= 0) || newWidth <= 0 || newHeight <= 0) {
    return contour;
  }

  let scaleX = bbox.width > 0 ? newWidth / bbox.width : 1;
  let scaleY = bbox.height > 0 ? newHeight / bbox.height : 1;

  if (keepAspect) {
    if (bbox.width > 0 && bbox.height > 0) {
      const avgScale = Math.min(scaleX, scaleY);
      scaleX = avgScale;
      scaleY = avgScale;
    } else if (bbox.width > 0) {
      scaleY = scaleX;
    } else {
      scaleX = scaleY;
    }
  }

  const originX = bbox.minX;
  const originY = bbox.minY;

  return {
    ...contour,
    nodes: contour.nodes.map((n) => ({
      ...n,
      x: Math.round(originX + (n.x - originX) * scaleX),
      y: Math.round(originY + (n.y - originY) * scaleY),
      handleIn: n.handleIn
        ? {
            x: Math.round(originX + (n.handleIn.x - originX) * scaleX),
            y: Math.round(originY + (n.handleIn.y - originY) * scaleY),
          }
        : null,
      handleOut: n.handleOut
        ? {
            x: Math.round(originX + (n.handleOut.x - originX) * scaleX),
            y: Math.round(originY + (n.handleOut.y - originY) * scaleY),
          }
        : null,
    })),
  };
}

/**
 * Scale one or more selected contours as a group to exact target width and height in font units.
 */
export function setContoursExactDimensions(
  contours: PathContour[],
  selectedIds: string[],
  newWidth: number,
  newHeight: number,
  keepAspect: boolean = false
): PathContour[] {
  if (!contours || contours.length === 0 || !selectedIds || selectedIds.length === 0) {
    return contours;
  }
  if (newWidth <= 0 || newHeight <= 0) {
    return contours;
  }

  const selectedContours = contours.filter((c) => selectedIds.includes(c.id));
  if (selectedContours.length === 0) return contours;

  if (selectedContours.length === 1) {
    const target = selectedContours[0];
    const scaled = setContourExactDimensions(target, newWidth, newHeight, keepAspect);
    return contours.map((c) => (c.id === target.id ? scaled : c));
  }

  const groupBBox = getContoursBoundingBox(selectedContours);
  if (groupBBox.width <= 0 && groupBBox.height <= 0) {
    return contours;
  }

  let scaleX = groupBBox.width > 0 ? newWidth / groupBBox.width : 1;
  let scaleY = groupBBox.height > 0 ? newHeight / groupBBox.height : 1;

  if (keepAspect) {
    if (groupBBox.width > 0 && groupBBox.height > 0) {
      const avgScale = Math.min(scaleX, scaleY);
      scaleX = avgScale;
      scaleY = avgScale;
    } else if (groupBBox.width > 0) {
      scaleY = scaleX;
    } else {
      scaleX = scaleY;
    }
  }

  const originX = groupBBox.minX;
  const originY = groupBBox.minY;

  return contours.map((c) => {
    if (!selectedIds.includes(c.id)) return c;
    return {
      ...c,
      nodes: c.nodes.map((n) => ({
        ...n,
        x: Math.round(originX + (n.x - originX) * scaleX),
        y: Math.round(originY + (n.y - originY) * scaleY),
        handleIn: n.handleIn
          ? {
              x: Math.round(originX + (n.handleIn.x - originX) * scaleX),
              y: Math.round(originY + (n.handleIn.y - originY) * scaleY),
            }
          : null,
        handleOut: n.handleOut
          ? {
              x: Math.round(originX + (n.handleOut.x - originX) * scaleX),
              y: Math.round(originY + (n.handleOut.y - originY) * scaleY),
            }
          : null,
      })),
    };
  });
}
