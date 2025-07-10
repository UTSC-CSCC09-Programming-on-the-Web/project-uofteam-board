import Konva from "konva";
import { Strokes } from "#models/Strokes.ts";
import fs from "fs";

const PADDING = 100; // Padding around the image
const SIZE = 1000; // Size of the image

const safeMax = (a: number | undefined, b: number | undefined): number | undefined => {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.max(a, b);
}
const safeMin = (a: number | undefined, b: number | undefined): number | undefined => {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.min(a, b);
}

export async function render(ids: string[]): Promise<string> {
  // Width and height will be set later based on the paths
  const stage = new Konva.Stage({ width: 1, height: 1 });
  const background = new Konva.Layer();
  const layer = new Konva.Layer();
  stage.add(background);
  stage.add(layer);
  
  let maxX: number | undefined = undefined;
  let minX: number | undefined = undefined;
  let maxY: number | undefined = undefined;
  let minY: number | undefined = undefined;

  const strokes = await Strokes.findAll({ where: { strokeId: ids } });
  strokes.forEach((stroke) => {
    const newPath = new Konva.Path({
      data: stroke.d,
      stroke: stroke.color,
      fillColor: stroke.fillColor,
      strokeWidth: stroke.width,
      x: stroke.x,
      y: stroke.y,
      scaleX: stroke.scaleX,
      scaleY: stroke.scaleY,
      rotation: stroke.rotation,
    });

    newPath.dataArray.forEach((line) => {
      if (line.command !== 'L') return;
      maxX = safeMax(maxX, newPath.scaleX() * Math.max(line.points[0], line.start.x));
      maxY = safeMax(maxY, newPath.scaleY() * Math.max(line.points[1], line.start.y));
      minX = safeMin(minX, newPath.scaleX() * Math.min(line.points[0], line.start.x));
      minY = safeMin(minY, newPath.scaleY() * Math.min(line.points[1], line.start.y));
    })

    layer.add(newPath);
  })

  console.log("Max X:", maxX, "Min X:", minX, "Max Y:", maxY, "Min Y:", minY);
  if (maxX === undefined || maxY === undefined || minX === undefined || minY === undefined) {
    throw new Error("No paths found to render");
  }
  const imgWidth = maxX - minX + PADDING * 2;
  const imgHeight = maxY - minY + PADDING * 2;
  console.log("Image Width:", imgWidth, "Image Height:", imgHeight);

  const scaleX = SIZE / imgWidth;
  const scaleY = SIZE / imgHeight;
  const scale = Math.min(scaleX, scaleY);
  console.log("Scale X:", scaleX, "Scale Y:", scaleY, "Final Scale:", scale);

  background.add(new Konva.Rect({
    x: minX - PADDING,
    y: minY - PADDING,
    width: imgWidth + PADDING * 2,
    height: imgHeight + PADDING * 2,
    fill: 'white',
  }))

  stage.width(imgWidth);
  stage.height(imgHeight);
  const dataUrl = stage.toDataURL({
    mimeType: 'image/png',
    pixelRatio: scale,
    x: minX - PADDING,
    y: minY - PADDING,
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
