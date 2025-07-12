import Konva from "konva";
import { Strokes } from "#models/Strokes.ts";
import type { Path } from "#types/api.ts";
import * as KonvaUtil from "./utils";
import fs from "fs";

const PADDING = 50; // Padding around the image
const SIZE = 1000; // Size of the image

export async function render(boardId: number, ids: string[]): Promise<string> {
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

  const strokes = await Strokes.findAll({ where: { strokeId: ids, boardId } });
  strokes.forEach((stroke) => {
    const newPath = new Konva.Path({
      ...stroke,
      data: stroke.d,
      stroke: stroke.color,
      fill: stroke.fillColor,
      strokeWidth: stroke.width,
    });
    layer.add(newPath);
  })

  const box = KonvaUtil.computeBoundingBox(
    strokes.map(stroke => ({
      ...stroke,
      id: stroke.strokeId,
      d: stroke.d,
      strokeColor: stroke.color,
      strokeWidth: stroke.width,
      fillColor: stroke.fillColor,
    } satisfies Path))
  );

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

  const dataUrl = stage.toDataURL({
    mimeType: 'image/png',
    pixelRatio: 1,
  });

  const base64Image = dataUrl.split(';base64,').pop();
  if (!base64Image) {
    throw new Error("Failed to extract base64 image data");
  }
  const filename = `img_${Date.now()}.png`;
  fs.writeFile(`./app/image-ai/dump/${filename}`, base64Image, {encoding: 'base64'}, () => {
    console.log('File created');
  });

  return base64Image;
}
