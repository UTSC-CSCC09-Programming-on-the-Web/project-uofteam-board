import { useCallback, useEffect, useState } from "react";
import { Layer, Stage, Path as KonvaPath, Rect } from "react-konva";
import { MdChevronLeft, MdChevronRight, MdRefresh } from "react-icons/md";
import colors from "tailwindcss/colors";
import toast from "react-hot-toast";
import clsx from "clsx";

import { API } from "~/services";
import { Dialog } from "~/components";
import type { Path } from "~/types";

import { computeBoundingBox, computeTransformCentered, type Transform } from "./utils";

interface Generation {
  paths: Path[];
  transform: Transform;
}

interface GenFillDialogState {
  boardID: number;
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

const ActionButton = ({
  icon,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: React.ReactNode;
}) => (
  <button
    {...rest}
    className={clsx(
      "flex justify-center items-center size-8 text-2xl rounded-lg text-gray-500 cursor-pointer hover:bg-gray-200 disabled:bg-transparent disabled:opacity-50 disabled:cursor-default",
      className,
    )}
  >
    {icon}
  </button>
);

const GenFillDialog = ({ state, onConfirm, onClose }: GenFillDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [generations, setGenerations] = useState<Generation[]>([]);

  const attemptGenerativeFill = useCallback(async (state: GenFillDialogState) => {
    setLoading(true);
    const res = await API.generativeFill(
      state.boardID,
      state.paths.map((p) => p.id),
    );
    if (res.error !== null) {
      toast(`Error generating fill:\n ${res.error}`);
      setLoading(false);
      return;
    }

    const actualBBox = computeBoundingBox(res.data);
    const targetBBox = computeBoundingBox(state.paths);
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

    setGenerations((prev) => {
      const newGens = [...prev, { paths: transformedPaths, transform: previewTransform }];
      setActiveIndex(newGens.length - 1);
      return newGens;
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (state === null) {
      setActiveIndex(0);
      setGenerations([]);
    } else {
      attemptGenerativeFill(state);
    }
  }, [state, attemptGenerativeFill]);

  const handlePrevious = () => {
    setActiveIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => Math.min(generations.length - 1, prev + 1));
  };

  const handleRegenerate = () => {
    if (state === null) return;
    attemptGenerativeFill(state);
  };

  const handleConfirm = () => {
    if (state === null || !generations[activeIndex]) return;
    onConfirm(state.paths, generations[activeIndex].paths);
    onClose();
  };

  const currentGeneration = generations[activeIndex];
  const totalGenerations = generations.length;

  return (
    <Dialog open={state !== null} className="max-w-lg">
      <Dialog.Title>Generative Fill</Dialog.Title>
      <Dialog.Content>
        {loading || !currentGeneration?.paths.length ? (
          <div
            style={{ width: previewWidth, height: previewHeight }}
            className="flex items-center justify-center animate-pulse"
          >
            <p>Generating fill paths...</p>
          </div>
        ) : (
          <Stage
            width={previewWidth}
            height={previewHeight}
            className={clsx(loading && "animate-pulse")}
          >
            <Layer>
              <Rect
                x={0}
                y={0}
                width={previewWidth}
                height={previewHeight}
                fill={colors.gray["100"]}
                listening={false}
              />
              {currentGeneration.paths.map((path) => (
                <KonvaPath
                  id={path.id}
                  key={path.id}
                  data={path.d}
                  stroke={path.strokeColor}
                  strokeWidth={path.strokeWidth}
                  fill={path.fillColor}
                  x={path.x * currentGeneration.transform.scale + currentGeneration.transform.dx}
                  y={path.y * currentGeneration.transform.scale + currentGeneration.transform.dy}
                  scaleX={path.scaleX * currentGeneration.transform.scale}
                  scaleY={path.scaleY * currentGeneration.transform.scale}
                  rotation={path.rotation}
                />
              ))}
            </Layer>
          </Stage>
        )}
        {totalGenerations > 0 && (
          <div className="mt-2 flex items-center justify-end gap-1">
            <ActionButton
              title="Previous Generation"
              onClick={handlePrevious}
              icon={<MdChevronLeft />}
              disabled={activeIndex <= 0 || loading}
            />
            <p className={clsx("text-gray-600", loading && "opacity-50")}>
              {activeIndex + 1} / {totalGenerations}
            </p>
            <ActionButton
              title="Next Generation"
              onClick={handleNext}
              icon={<MdChevronRight />}
              disabled={activeIndex >= totalGenerations - 1 || loading}
            />
            <ActionButton
              title="Retry"
              disabled={loading}
              onClick={handleRegenerate}
              icon={<MdRefresh className={clsx(loading && "animate-spin")} />}
            />
          </div>
        )}
      </Dialog.Content>
      <Dialog.Footer>
        <Dialog.Button size="sm" variant="neutral" onClick={onClose} disabled={loading}>
          Cancel
        </Dialog.Button>
        <Dialog.Button
          size="sm"
          onClick={handleConfirm}
          disabled={loading || !currentGeneration?.paths.length}
        >
          Confirm
        </Dialog.Button>
      </Dialog.Footer>
    </Dialog>
  );
};

export { GenFillDialog, type GenFillDialogState, type GenFillDialogProps };
