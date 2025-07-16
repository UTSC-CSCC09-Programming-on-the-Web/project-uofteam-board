import { useCallback, useEffect, useState } from "react";
import { Layer, Stage, Path as KonvaPath, Rect } from "react-konva";
import colors from "tailwindcss/colors";

import { API } from "~/services";
import { Dialog } from "~/components";
import type { Path } from "~/types";

import { computeBoundingBox, computeTransformCentered, type Transform } from "./utils";

interface GenFillDialogState {
  boardID: string;
  paths: Path[];
}

interface GenFillDialogProps {
  state: GenFillDialogState | null;
  onConfirm: (oldPaths: Path[], newPaths: Path[]) => void;
  onClose: () => void;
}

const previewPadding = 20;
const previewHeight = 300;
const previewWidth = 400;

function GenFillDialog({ state, onConfirm, onClose }: GenFillDialogProps) {
  const [loading, setLoading] = useState(false);
  const [newPaths, setNewPaths] = useState<Path[]>([]);
  const [previewTransform, setPreviewTransform] = useState<Transform>({ scale: 1, dx: 0, dy: 0 });

  const attemptGenerativeFill = useCallback(async (state: GenFillDialogState) => {
    setLoading(true);
    const res = await API.generativeFill(
      state.boardID,
      state.paths.map((p) => p.id),
    );
    if (res.error !== null) {
      alert(`Error generating fill: ${res.error}`);
      setLoading(false);
      return;
    }

    const targetBBox = computeBoundingBox(state.paths);
    const actualBBox = computeBoundingBox(res.data);
    const boardTransform = computeTransformCentered(actualBBox, targetBBox);
    const transformedPaths = res.data.map((p) => ({
      ...p,
      x: p.x * boardTransform.scale + boardTransform.dx,
      y: p.y * boardTransform.scale + boardTransform.dy,
      scaleX: p.scaleX * boardTransform.scale,
      scaleY: p.scaleY * boardTransform.scale,
    }));

    const transformedBBox = computeBoundingBox(transformedPaths);
    const previewTransform = computeTransformCentered(transformedBBox, {
      x: previewPadding,
      y: previewPadding,
      width: previewWidth - previewPadding * 2,
      height: previewHeight - previewPadding * 2,
    });

    setPreviewTransform(previewTransform);
    setNewPaths(transformedPaths);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (state === null) setNewPaths([]);
    else attemptGenerativeFill(state);
  }, [state, attemptGenerativeFill]);

  const handleRetry = () => {
    if (state === null) return;
    attemptGenerativeFill(state);
  };

  const handleConfirm = () => {
    if (state === null) return;
    onConfirm(state.paths, newPaths);
    onClose();
  };

  return (
    <Dialog open={state !== null} onClose={onClose} className="max-w-lg">
      <Dialog.Title>Generative Fill</Dialog.Title>
      <Dialog.Content>
        {loading || newPaths.length === 0 ? (
          <p>Generating fill paths...</p>
        ) : (
          <Stage width={previewWidth} height={previewHeight}>
            <Layer>
              <Rect
                x={0}
                y={0}
                width={previewWidth}
                height={previewHeight}
                fill={colors.gray["100"]}
                listening={false}
              />
              {newPaths.map((path) => (
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
        )}
      </Dialog.Content>
      <Dialog.Footer>
        <Dialog.Button variant="neutral" onClick={onClose} disabled={loading} size="sm">
          Cancel
        </Dialog.Button>
        <Dialog.Button onClick={handleRetry} disabled={loading} size="sm">
          Retry
        </Dialog.Button>
        <Dialog.Button
          onClick={handleConfirm}
          disabled={loading || newPaths.length === 0}
          size="sm"
        >
          Confirm
        </Dialog.Button>
      </Dialog.Footer>
    </Dialog>
  );
}

export { GenFillDialog, type GenFillDialogState, type GenFillDialogProps };
