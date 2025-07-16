import Konva from "konva";
import type { Path } from "#types/api.js";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const computeBoundingBox = (paths: Path[]): BoundingBox => {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const p of paths) {
    const tempPath = new Konva.Path({
      data: p.d,
      x: p.x,
      y: p.y,
      scaleX: p.scaleX,
      scaleY: p.scaleY,
      rotation: p.rotation,
      strokeWidth: p.strokeWidth,
    });

    const box = tempPath.getClientRect();
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

export interface Transform {
  scale: number;
  dx: number;
  dy: number;
}

export const computeTransformCentered = (from: BoundingBox, to: BoundingBox): Transform => {
  const scale = Math.min(to.width / from.width, to.height / from.height);
  const dx = to.x + (to.width - from.width * scale) / 2 - from.x * scale;
  const dy = to.y + (to.height - from.height * scale) / 2 - from.y * scale;
  return { scale, dx, dy };
};
