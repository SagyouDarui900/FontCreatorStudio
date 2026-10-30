export interface Point {
  x: number;
  y: number;
}

export interface StrokePoint {
  x: number;
  y: number;
  pressure?: number;
  time?: number;
  pointerType?: string;
}

export type NodeType = 'corner' | 'smooth' | 'symmetric';

export interface BezierNode {
  id: string;
  x: number;
  y: number;
  handleIn?: Point | null;   // incoming control point (absolute coords)
  handleOut?: Point | null;  // outgoing control point (absolute coords)
  type?: NodeType;
}

export interface PathContour {
  id: string;
  nodes: BezierNode[];
  closed: boolean;
}
