import { PathContour, Point, BezierNode } from '../../types';
import { generateId } from '../path';
import { expandStrokeContours } from '../path/stroke_modules/straightAndExpand';

export interface PathOffsetOptions {
  strokeWidth: number;
  capStyle: 'round' | 'butt' | 'square';
  keepOriginal?: boolean;
}

/**
 * Expand one or more open or closed paths into uniform-width closed contours.
 * Ideal for creating geometric fonts, uniform gothic strokes, and monoline design types.
 */
export function expandContoursOffset(
  contours: PathContour[],
  selectedIds: string[],
  options: PathOffsetOptions
): { updatedContours: PathContour[]; newContourIds: string[] } {
  const { strokeWidth = 40, capStyle = 'round', keepOriginal = false } = options;

  if (!contours || contours.length === 0) {
    return { updatedContours: [], newContourIds: [] };
  }

  const targetIds = selectedIds && selectedIds.length > 0 ? selectedIds : contours.map((c) => c.id);
  const targetContours = contours.filter((c) => targetIds.includes(c.id));
  const nonTargetContours = contours.filter((c) => !targetIds.includes(c.id));

  const expandedList = expandStrokeContours(targetContours, strokeWidth, capStyle);

  const finalExpanded = expandedList.map((c) => ({
    ...c,
    id: generateId(),
    closed: true,
  }));

  const newContourIds = finalExpanded.map((c) => c.id);

  const updatedContours = keepOriginal
    ? [...contours, ...finalExpanded]
    : [...nonTargetContours, ...finalExpanded];

  return { updatedContours, newContourIds };
}
