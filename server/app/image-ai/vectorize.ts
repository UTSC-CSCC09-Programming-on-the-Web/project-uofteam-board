import { Path } from "#types/api.ts";
import { vectorize, ColorMode, Hierarchical, PathSimplifyMode } from "@neplex/vectorizer";
import fs from 'fs';

/**
 * @param color Hex color string in the format #RRGGBB
 * @returns true if the color is a background color (white or light gray), false otherwise
 */
const detectBackgroundHexColor = (color: string): boolean => {
  const removeHashtag = color.substring(1);
  const [r, g, b] = removeHashtag.match(/.{2}/g)?.map(hex => parseInt(hex, 16)) || [];
  if (r === undefined || g === undefined || b === undefined) {
    throw new Error(`Invalid color format. Expected #RRGGBB, Instead Got ${color}`);
  }
  return r > 200 && g > 200 && b > 200;
}

const convertSvgToPaths = (svg: string): Path[] => {
  // Parse the result to extract paths
  const paths = svg.split('\n').filter(line => line.startsWith('<path'));
  return paths.map(path => {
    const d = path.split('d="')[1]?.split('"', 1)[0];
    const fill = path.split('fill="')[1]?.split('"', 1)[0].toLowerCase();

    const transformStr = path.split('transform="')[1]?.split('"', 1)[0];
    const transform = {
      x: Number(transformStr.split("translate(")[1]?.split(",")[0]),
      y: Number(transformStr.split(",")[1]?.split(")")[0])
    }

    return {
      id: crypto.randomUUID(),
      d: d,
      strokeColor: fill,
      fillColor: fill,
      strokeWidth: 1,
      x: transform.x,
      y: transform.y,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    } satisfies Path;
  }).filter(path => !detectBackgroundHexColor(path.strokeColor));
}

export const vectorizeBase64 = async (base64: string): Promise<Path[]> => {
  const buffer = Buffer.from(base64, "base64");
  // TODO: tweak for a good number of paths without excessive partitioning
  const svg = await vectorize(buffer, {
    colorMode: ColorMode.Color,           // preserve color information
    colorPrecision: 6,                    // number of distinct colors
    filterSpeckle: 4,                     // lower: keep more small details
    spliceThreshold: 10,                  // lower: less joining, more separated paths
    cornerThreshold: 20,                  // lower: split at more corners
    layerDifference: 5,                   // difference between layers
    lengthThreshold: 5,                   // lower: keep shorter paths
    maxIterations: 2,                     // refinement iterations
    pathPrecision: 5,                     // path simplification accuracy
    hierarchical: Hierarchical.Cutout,    // DO NOT CHANGE (ensures background removal)
    mode: PathSimplifyMode.Polygon,       // DO NOT CHANGE (ensures only get lines)
  });

  if (process.env.SAVE_IMAGES_DEBUG_ENABLED === "1") {
    const filename = `${Date.now()}_raw.svg`;
    fs.writeFile(`./app/image-ai/dump/${filename}`, svg, () => {
      console.log(`Image saved as ${filename}`);
    });
  }

  return convertSvgToPaths(svg);
}


// TODO: cleanup
// import { render, renderPaths } from "./render";
// const img = fs.readFileSync("./dump/ai_1752286370064.png");
// const paths = await vectorizeBase64(img.toString('base64'));
// renderPaths(paths);
// console.log(paths);


// console.log(detectBackgroundHexColor("#03c100"));