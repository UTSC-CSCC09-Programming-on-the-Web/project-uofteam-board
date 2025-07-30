import { useMemo, useState } from "react";
import { Layer, Stage, Path as KonvaPath, Rect } from "react-konva";
import Konva from "konva";
import clsx from "clsx";

import { ColorPicker, Dialog } from "~/components";
import type { Path } from "~/types";

import { computeBoundingBox, computeTransformCentered, type Transform } from "./utils";
import styles from "./ExportDialog.module.css";

interface ExportDialogProps {
  paths: Path[];
  onClose: () => void;
}

const previewPadding = 20;
const previewHeight = 300;
const previewWidth = 400;

function ExportDialog({ paths, onClose }: ExportDialogProps) {
  const [backgroundColor, setBackgroundColor] = useState("#f3f3f3");

  const previewTransform = useMemo<Transform>(() => {
    if (paths.length === 0) return { scale: 1, dx: 0, dy: 0 };
    const bbox = computeBoundingBox(paths);
    return computeTransformCentered(bbox, {
      x: previewPadding,
      y: previewPadding,
      width: previewWidth - previewPadding * 2,
      height: previewHeight - previewPadding * 2,
    });
  }, [paths]);

  const onDownload = () => {
    if (paths.length === 0) return;
    const bbox = computeBoundingBox(paths);
    const transform = computeTransformCentered(bbox, {
      x: previewPadding,
      y: previewPadding,
      width: bbox.width - previewPadding * 2,
      height: bbox.height - previewPadding * 2,
    });

    const container = document.createElement("div");
    const stage = new Konva.Stage({
      container: container,
      width: bbox.width + previewPadding * 2,
      height: bbox.height + previewPadding * 2,
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    layer.add(
      new Konva.Rect({
        x: 0,
        y: 0,
        width: bbox.width + previewPadding * 2,
        height: bbox.height + previewPadding * 2,
        fill: backgroundColor,
      }),
    );

    paths.forEach((path) => {
      layer.add(
        new Konva.Path({
          data: path.d,
          stroke: path.strokeColor,
          strokeWidth: path.strokeWidth,
          fill: path.fillColor,
          x: path.x * transform.scale + transform.dx,
          y: path.y * transform.scale + transform.dy,
          scaleX: path.scaleX * transform.scale,
          scaleY: path.scaleY * transform.scale,
          rotation: path.rotation,
        }),
      );
    });

    const link = document.createElement("a");
    link.download = `board-export-${Date.now()}.png`;
    link.href = stage.toDataURL({ pixelRatio: 2 });
    link.click();
  };

  return (
    <Dialog open={paths.length > 0}>
      <Dialog.Title>Export to Image</Dialog.Title>
      <Dialog.Content>
        <div
          className={clsx("outline outline-gray-200", styles.preview)}
          style={{ width: previewWidth, height: previewHeight }}
        >
          <Stage width={previewWidth} height={previewHeight}>
            <Layer>
              <Rect
                x={0}
                y={0}
                width={previewWidth}
                height={previewHeight}
                fill={backgroundColor}
              />
              {paths.map((path) => (
                <KonvaPath
                  id={path.id}
                  key={path.id}
                  data={path.d}
                  stroke={path.strokeColor}
                  strokeWidth={path.strokeWidth}
                  fill={path.fillColor}
                  x={path.x * previewTransform.scale + previewTransform.dx}
                  y={path.y * previewTransform.scale + previewTransform.dy}
                  scaleX={path.scaleX * previewTransform.scale}
                  scaleY={path.scaleY * previewTransform.scale}
                  rotation={path.rotation}
                />
              ))}
            </Layer>
          </Stage>
        </div>
        <div className="mt-2 flex gap-6 justify-end">
          <div className="flex items-center justify-end gap-2">
            Background color
            <ColorPicker
              size="sm"
              value={backgroundColor}
              onChange={(color) => setBackgroundColor(color)}
            />
          </div>
        </div>
      </Dialog.Content>
      <Dialog.Footer className="!mt-4">
        <Dialog.Button variant="neutral" onClick={onClose} size="sm">
          Cancel
        </Dialog.Button>
        <Dialog.Button onClick={onDownload} size="sm">
          Download
        </Dialog.Button>
      </Dialog.Footer>
    </Dialog>
  );
}

export { ExportDialog, type ExportDialogProps };
