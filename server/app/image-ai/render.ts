import Konva from "konva";
import { Strokes } from "#models/Strokes.ts";
import type { Path } from "#types/api.ts";
import * as KonvaUtil from "./utils";
import fs from "fs";

const PADDING = 50; // Padding around the image
const SIZE = 1000; // Size of the image

export const renderPaths = (paths: Path[]): string => {
  const stage = new Konva.Stage({ width: SIZE, height: SIZE });
  const layer = new Konva.Layer();

  // White background
  stage.add(new Konva.Layer().add(new Konva.Rect({
    x: 0,
    y: 0,
    width: SIZE,
    height: SIZE,
    fill: 'white',
  })));
  stage.add(layer);

  paths.forEach((path) => {
    layer.add(new Konva.Path({
      ...path,
      data: path.d,
      stroke: path.strokeColor,
      fill: path.fillColor,
      strokeWidth: path.strokeWidth
    }));
  })

  const box = KonvaUtil.computeBoundingBox(paths);
  const windowBox = {
    x: PADDING,
    y: PADDING,
    width: SIZE - PADDING * 2,
    height: SIZE - PADDING * 2,
  } satisfies KonvaUtil.BoundingBox;

  const transform = KonvaUtil.computeTransformCentered(box, windowBox);
  layer.scale({ x: transform.scale, y: transform.scale });
  layer.x(layer.x() + transform.dx);
  layer.y(layer.y() + transform.dy);

  const base64 = stage.toDataURL({
    mimeType: 'image/png',
    pixelRatio: 1,
  }).split(';base64,').pop();

  if (!base64) {
    throw Error(`Could not render paths to base64 image. Paths:${paths}`);
  }

  return base64;
}

export async function render(boardId: number, ids: string[]): Promise<string> {
  const strokes = await Strokes.findAll({ where: { strokeId: ids, boardId } });
  const paths = strokes.map((stroke) => ({
    id: stroke.strokeId,
    d: stroke.d,
    strokeColor: stroke.color,
    strokeWidth: stroke.width,
    fillColor: stroke.fillColor,
    x: stroke.x,
    y: stroke.y,
    scaleX: stroke.scaleX,
    scaleY: stroke.scaleY,
    rotation: stroke.rotation,
  })) satisfies Path[]
  
  const base64Image = await renderPaths(paths);
  if (!base64Image) {
    throw new Error("Failed to extract base64 image data");
  }

  if (process.env.SAVE_IMAGES_DEBUG_ENABLED === "1") {
    const filename = `${Date.now()}_img.png`;
    fs.writeFile(`./app/image-ai/dump/${filename}`, base64Image, {encoding: 'base64'}, () => {
      console.log('File created');
    });
  }

  return base64Image;
}
