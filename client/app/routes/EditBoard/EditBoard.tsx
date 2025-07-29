import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { MdArrowBack, MdDelete, MdHelpOutline, MdSettings, MdOutlineRectangle, MdOutlineCircle } from "react-icons/md"; // prettier-ignore
import { Stage, Layer, Rect, Path as KonvaPath, Transformer } from "react-konva";
import { FaWandMagicSparkles, FaFileExport } from "react-icons/fa6";
import { PiRectangleDashedDuotone } from "react-icons/pi";
import { RiPenNibLine } from "react-icons/ri";
import { useNavigate } from "react-router";
import colors from "tailwindcss/colors";
import { v4 as uuid } from "uuid";
import Konva from "konva";
import clsx from "clsx";
import color from "color";

import type { Route } from "./+types/EditBoard";
import type { Board, BoardShare, Path } from "~/types";
import { Button, ColorPicker, Spinner } from "~/components";
import { API } from "~/services";

import { HelpDialog } from "./HelpDialog";
import { ExportDialog } from "./ExportDialog";
import { SettingsDialog } from "./SettingsDialog";
import { GenFillDialog, type GenFillDialogState } from "./GenFillDialog";
import { computeBoundingBox, makeCircleData, makeLineData, makeRectData, startEndPointToBoundingBox, type Point } from "./utils"; // prettier-ignore
import { useSpacePressed } from "./useSpacePressed";
import { useMousePressed } from "./useMousePressed";
import { useWindowSize } from "./useWindowSize";

const meta: Route.MetaFunction = () => [{ title: "Edit Board" }];

interface PathWithLocal extends Path {
  // fromLocal is used to indicate if the path was created locally. This is done
  // so that when the path is sent to the server and the server responds with
  // the same path, we know to move the local path to the end of the list.
  // Otherwise, different clients might have different orders of paths.
  fromLocal?: boolean;
}

type BoardState =
  | {
      type: "SELECTING";
      start: Point;
    }
  | {
      type: "DRAWING_FREEHAND";
      path: Path;
    }
  | {
      type: "DRAWING_RECTANGLE";
      path: Path;
      start: Point;
    }
  | {
      type: "DRAWING_CIRCLE";
      path: Path;
      start: Point;
    }
  | {
      type: "IDLE";
    };

type Tool = "SELECTION" | "PEN" | "RECTANGLE" | "CIRCLE";
const strokeWidthOptions = [2, 4, 8, 16];

const EditBoard = ({ params }: Route.ComponentProps) => {
  const navigate = useNavigate();
  const mousePressed = useMousePressed();
  const spacePressed = useSpacePressed();
  const [board, setBoard] = useState<Board | null>(null);
  const [shares, setShares] = useState<BoardShare[]>([]);
  const selectionRectRef = useRef<Konva.Rect | null>(null);

  const [fillColor, setFillColor] = useState("#fff085aa");
  const [strokeColor, setStrokeColor] = useState("#193cb8");
  const [strokeWidthIndex, setStrokeWidthIndex] = useState(1);
  const [genFillState, setGenFillState] = useState<GenFillDialogState | null>(null);
  const [pathsForExport, setPathsForExport] = useState<Path[]>([]);

  const [tool, setTool] = useState<Tool>("PEN");
  const [selectedIDs, setSelectedIDs] = useState<string[]>([]);
  const pathRefs = useRef<Map<string, Konva.Path>>(new Map());
  const transformerRef = useRef<Konva.Transformer>(null);

  const stageRef = useRef<Konva.Stage>(null);
  const [windowWidth, windowHeight] = useWindowSize();
  const [paths, setPaths] = useState<PathWithLocal[]>([]);

  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const boardStateRef = useRef<BoardState>({ type: "IDLE" });

  useEffect(() => {
    (async () => {
      const [boardRes, boardSharesRes] = await Promise.all([
        API.getBoard(Number(params.bid)),
        API.getBoardShares(Number(params.bid)),
      ]);

      if (boardRes.error !== null) {
        if (boardRes.status === 401 || boardRes.status === 403) navigate("/");
        else alert(`Error fetching board: ${boardRes.error}`);
        return;
      }

      if (boardSharesRes.error !== null) {
        alert(`Error fetching board shares: ${boardSharesRes.error}`);
        return;
      }

      setBoard(boardRes.data);
      setShares(boardSharesRes.data);
    })();
  }, [params.bid]);

  useEffect(() => {
    if (selectedIDs.length && transformerRef.current) {
      const nodes = selectedIDs
        .map((id) => pathRefs.current.get(id))
        .filter((node) => node !== undefined);
      transformerRef.current.nodes(nodes);
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, [selectedIDs]);

  useEffect(() => {
    return API.listenForBoardUpdates(
      params.bid,
      (update) => {
        console.log("Received board update:", update);
        switch (update.type) {
          case "CREATE_OR_REPLACE_PATHS":
            setPaths((prevPaths) => {
              const prevPathsCopy = [...prevPaths];
              update.paths.forEach((newPath) => {
                const existingIndex = prevPathsCopy.findIndex((p) => p.id === newPath.id);
                if (existingIndex === -1) {
                  prevPathsCopy.push(newPath);
                  return;
                }

                const existingPath = prevPathsCopy[existingIndex];
                if (existingPath.fromLocal) {
                  // If the existing path was created from local, we make sure to
                  // delete it and add the new path to the end of the list. This ensures
                  // that the paths for different clients appear in the exact same order.
                  prevPathsCopy.splice(existingIndex, 1);
                  prevPathsCopy.push(newPath);
                } else {
                  prevPathsCopy[existingIndex] = newPath;
                }
              });
              return prevPathsCopy;
            });
            break;
          case "DELETE_PATHS":
            setPaths((prevPaths) => prevPaths.filter((path) => !update.ids.includes(path.id)));
            break;
          default:
            [update] satisfies [never];
            break;
        }
      },
      (error) => {
        alert(`Error in board updates: ${error.message}`);
      },
      (reason) => {
        console.warn(`Socket closed: ${reason}`);
      },
    );
  }, [params.bid]);

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (spacePressed || board === null || board.permission === "viewer") return;
    const stage = e.target.getStage();
    if (!stage) return;

    const point = stage.getRelativePointerPosition();
    if (!point) return;

    const commonPathProps = {
      id: uuid(),
      strokeColor,
      strokeWidth: strokeWidthOptions[strokeWidthIndex],
      fillColor,
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      fromLocal: true,
    } satisfies Partial<PathWithLocal>;

    let newPath: PathWithLocal;
    switch (tool) {
      case "SELECTION": {
        if (e.target !== stage || !selectionRectRef.current) return;
        boardStateRef.current = { type: "SELECTING", start: point };
        selectionRectRef.current.setSize({ width: 0, height: 0 });
        selectionRectRef.current.setPosition(point);
        selectionRectRef.current.show();
        break;
      }
      case "PEN": {
        newPath = { ...commonPathProps, d: makeLineData(null, point), fillColor: "transparent" };
        boardStateRef.current = { type: "DRAWING_FREEHAND", path: newPath };
        setPaths((prevPaths) => [...prevPaths, newPath]);
        break;
      }
      case "RECTANGLE": {
        newPath = { ...commonPathProps, d: makeRectData({ start: point, end: point }) };
        boardStateRef.current = { type: "DRAWING_RECTANGLE", path: newPath, start: point };
        setPaths((prevPaths) => [...prevPaths, newPath]);
        break;
      }
      case "CIRCLE": {
        newPath = { ...commonPathProps, d: makeCircleData({ start: point, end: point }) };
        boardStateRef.current = { type: "DRAWING_CIRCLE", path: newPath, start: point };
        setPaths((prevPaths) => [...prevPaths, newPath]);
        break;
      }
      default: {
        [tool] satisfies [never];
        break;
      }
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const bs = boardStateRef.current;
    if (bs.type === "IDLE") return;

    const stage = e.target.getStage();
    if (!stage) return;

    const point = stage.getRelativePointerPosition();
    if (!point) return;

    switch (bs.type) {
      case "SELECTING": {
        if (!selectionRectRef.current) return;
        const bbox = startEndPointToBoundingBox({ start: bs.start, end: point });
        selectionRectRef.current.setPosition(bbox);
        selectionRectRef.current.setSize(bbox);
        break;
      }
      case "DRAWING_FREEHAND": {
        const path = pathRefs.current.get(bs.path.id);
        if (!path) return;
        bs.path.d = makeLineData(bs.path.d, point);
        path.setAttr("data", bs.path.d);
        break;
      }
      case "DRAWING_RECTANGLE": {
        const path = pathRefs.current.get(bs.path.id);
        if (!path) return;
        bs.path.d = makeRectData({ start: bs.start, end: point });
        path.setAttr("data", bs.path.d);
        break;
      }
      case "DRAWING_CIRCLE": {
        const path = pathRefs.current.get(bs.path.id);
        if (!path) return;
        bs.path.d = makeCircleData({ start: bs.start, end: point });
        path.setAttr("data", bs.path.d);
        break;
      }
      default: {
        [bs] satisfies [never];
        break;
      }
    }
  };

  const handleMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const bs = boardStateRef.current;
    if (bs.type === "IDLE") return;

    const stage = e.target.getStage();
    if (!stage) return;

    const point = stage.getRelativePointerPosition();
    if (!point) return;

    switch (bs.type) {
      case "SELECTING": {
        if (!selectionRectRef.current) return;
        selectionRectRef.current.hide();
        const bbox = startEndPointToBoundingBox({ start: bs.start, end: point });
        const selected = paths.filter((x) => Konva.Util.haveIntersection(bbox, computeBoundingBox([x]))); // prettier-ignore
        setSelectedIDs(selected.map((x) => x.id));
        break;
      }
      case "DRAWING_FREEHAND": {
        bs.path.d = makeLineData(bs.path.d, point);
        API.emitBoardUpdate(params.bid, { type: "CREATE_OR_REPLACE_PATHS", paths: [bs.path] });
        break;
      }
      case "DRAWING_RECTANGLE": {
        bs.path.d = makeRectData({ start: bs.start, end: point });
        API.emitBoardUpdate(params.bid, { type: "CREATE_OR_REPLACE_PATHS", paths: [bs.path] });
        break;
      }
      case "DRAWING_CIRCLE": {
        bs.path.d = makeCircleData({ start: bs.start, end: point });
        API.emitBoardUpdate(params.bid, { type: "CREATE_OR_REPLACE_PATHS", paths: [bs.path] });
        break;
      }
      default: {
        [bs] satisfies [never];
        break;
      }
    }

    boardStateRef.current = { type: "IDLE" };
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.15;
    const newScale = e.evt.deltaY < 0 ? scaleBy : 1 / scaleBy;
    doZoom(newScale, pointer);
  };

  const handleZoomIn = () => {
    if (!stageRef.current) return;
    const stage = stageRef.current;
    doZoom(1.15, { x: stage.width() / 2, y: stage.height() / 2 });
  };

  const handleZoomOut = () => {
    if (!stageRef.current) return;
    const stage = stageRef.current;
    doZoom(1 / 1.15, { x: stage.width() / 2, y: stage.height() / 2 });
  };

  const doZoom = (scale: number, point: Point) => {
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const newScale = oldScale * scale;

    const mousePointTo = {
      x: (point.x - stage.x()) / oldScale,
      y: (point.y - stage.y()) / oldScale,
    };

    stage.scale({ x: newScale, y: newScale });
    stage.position({
      x: point.x - mousePointTo.x * newScale,
      y: point.y - mousePointTo.y * newScale,
    });
  };

  const handlePathDragEnd = (e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    const id = node.id();
    setPaths((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          p = { ...p, x: node.x(), y: node.y() };
          API.emitBoardUpdate(params.bid, { type: "CREATE_OR_REPLACE_PATHS", paths: [p] });
        }
        return p;
      }),
    );
  };

  const handlePathTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    const id = node.id();
    setPaths((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          p = { ...p, x: node.x(), y: node.y(), scaleX: node.scaleX(), scaleY: node.scaleY(), rotation: node.rotation() }; // prettier-ignore
          API.emitBoardUpdate(params.bid, { type: "CREATE_OR_REPLACE_PATHS", paths: [p] });
        }
        return p;
      }),
    );
  };

  const handleGenFillConfirm = (oldPaths: Path[], newPaths: Path[]) => {
    newPaths = newPaths.map((p) => ({ ...p, fromLocal: true }));
    setPaths((prev) => prev.filter((p) => !oldPaths.some((op) => op.id === p.id)).concat(newPaths));
    API.emitBoardUpdate(params.bid, { type: "DELETE_PATHS", ids: oldPaths.map((p) => p.id) });
    API.emitBoardUpdate(params.bid, { type: "CREATE_OR_REPLACE_PATHS", paths: newPaths });
  };

  const handleSettingsUpdate = (board: Board, shares: BoardShare[]) => {
    setBoard(board);
    setShares(shares);
  };

  const handleDelete = useCallback(() => {
    if (selectedIDs.length === 0) return;
    setPaths((prev) => prev.filter((path) => !selectedIDs.includes(path.id)));
    API.emitBoardUpdate(params.bid, { type: "DELETE_PATHS", ids: selectedIDs });
    setSelectedIDs([]);
  }, [selectedIDs, params.bid]);

  const handleExport = useCallback(() => {
    if (selectedIDs.length === 0) return;
    const selectedPaths = paths.filter((p) => selectedIDs.includes(p.id));
    setPathsForExport(selectedPaths);
    setSelectedIDs([]);
  }, [selectedIDs, paths]);

  const handleGenerativeFill = useCallback(() => {
    if (selectedIDs.length === 0) return;
    const selectedPaths = paths.filter((p) => selectedIDs.includes(p.id));
    setGenFillState({ boardID: params.bid, paths: selectedPaths });
    setSelectedIDs([]);
  }, [selectedIDs, paths, params.bid]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key === "Delete" || e.key === "Backspace") {
        handleDelete();
      } else if (e.key === "Escape") {
        setSelectedIDs([]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDelete]);

  if (!board) {
    return (
      <div className="fixed inset-0 flex justify-center items-center text-yellow-700/60 bg-yellow-50">
        <Spinner className="size-24 border-8" />
      </div>
    );
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-10 p-4 pointer-events-none">
        <div
          className={clsx(
            "flex items-center justify-between p-2",
            "bg-yellow-50 shadow-[3px_3px] shadow-blue-800/15",
            "border-2 border-gray-800/60 rounded-tl-[255px_15px] rounded-tr-[15px_225px] rounded-br-[225px_15px] rounded-bl-[15px_255px]",
          )}
        >
          <div className="flex items-center gap-8 pointer-events-auto">
            <Button
              icon={<MdArrowBack />}
              onClick={() => navigate("/dashboard")}
              variant="neutral"
              size="sm"
            >
              Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-blue-800">{board.name}</h1>
          </div>
          {(board.permission === "owner" || board.permission === "editor") && (
            <div className="flex items-center gap-2 pointer-events-auto">
              {selectedIDs.length > 0 ? (
                <Fragment key="selected-actions">
                  <Button
                    size="sm"
                    title="Delete"
                    variant="danger"
                    icon={<MdDelete />}
                    className="!w-10 !px-0"
                    onClick={handleDelete}
                  />
                  <Button
                    size="sm"
                    title="Delete"
                    variant="neutral"
                    icon={<FaFileExport />}
                    onClick={handleExport}
                  >
                    Export
                  </Button>
                  <Button size="sm" icon={<FaWandMagicSparkles />} onClick={handleGenerativeFill}>
                    Generative Fill
                  </Button>
                </Fragment>
              ) : (
                <Fragment key="no-selection-actions">
                  <Button
                    size="sm"
                    title="Pen tool"
                    variant={tool === "PEN" ? "primary" : "neutral"}
                    onClick={() => setTool("PEN")}
                    icon={<RiPenNibLine />}
                    className="!w-10 !px-0"
                  />
                  <Button
                    size="sm"
                    title="Rectangle tool"
                    variant={tool === "RECTANGLE" ? "primary" : "neutral"}
                    onClick={() => setTool("RECTANGLE")}
                    icon={<MdOutlineRectangle />}
                    className="!w-10 !px-0"
                  />
                  <Button
                    size="sm"
                    title="Circle tool"
                    variant={tool === "CIRCLE" ? "primary" : "neutral"}
                    onClick={() => setTool("CIRCLE")}
                    icon={<MdOutlineCircle />}
                    className="!w-10 !px-0"
                  />
                  <Button
                    size="sm"
                    title="Selection tool"
                    variant={tool === "SELECTION" ? "primary" : "neutral"}
                    onClick={() => setTool("SELECTION")}
                    icon={<PiRectangleDashedDuotone />}
                    className="!w-10 !px-0"
                  />
                  {tool !== "SELECTION" && (
                    <>
                      <Button
                        size="sm"
                        variant="neutral"
                        title="Stroke width"
                        onClick={() => setStrokeWidthIndex((i) => (i + 1) % strokeWidthOptions.length)} // prettier-ignore
                        className="!w-16 !px-0"
                      >
                        {strokeWidthOptions[strokeWidthIndex]}px
                      </Button>
                      <ColorPicker
                        title="Stroke color"
                        value={strokeColor}
                        onChange={setStrokeColor}
                        popoverClassName="!mt-4"
                      />
                    </>
                  )}
                  {(["RECTANGLE", "CIRCLE"] satisfies Tool[] as Tool[]).includes(tool) && (
                    <ColorPicker
                      title="Fill color"
                      value={fillColor}
                      onChange={setFillColor}
                      popoverClassName="!mt-4"
                    />
                  )}
                </Fragment>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-10 p-4 flex justify-between pointer-events-none">
        <div className="flex gap-2 pointer-events-auto">
          <Button
            size="sm"
            title="Zoom in"
            onClick={handleZoomIn}
            variant="neutral"
            className="!w-10"
          >
            +
          </Button>
          <Button
            size="sm"
            title="Zoom out"
            onClick={handleZoomOut}
            variant="neutral"
            className="!w-10"
          >
            -
          </Button>
        </div>
        <div className="flex gap-2 pointer-events-auto">
          <Button
            size="sm"
            onClick={() => setHelpDialogOpen(true)}
            icon={<MdHelpOutline />}
            variant="neutral"
          >
            Help
          </Button>
          {board.permission === "owner" && (
            <Button
              size="sm"
              onClick={() => setSettingsDialogOpen(true)}
              icon={<MdSettings />}
              variant="neutral"
            >
              Settings
            </Button>
          )}
        </div>
      </div>
      <Stage
        width={windowWidth}
        height={windowHeight}
        ref={stageRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        draggable={spacePressed}
        className={clsx({
          "cursor-grab": spacePressed && !mousePressed,
          "cursor-grabbing": spacePressed && mousePressed,
          "cursor-crosshair": tool !== "SELECTION" && !spacePressed,
          "cursor-default": tool === "SELECTION" && !spacePressed,
        })}
      >
        <Layer>
          {paths.map((path) => {
            const noSelection = selectedIDs.length === 0;
            const isSelected = tool === "SELECTION" && selectedIDs.includes(path.id);
            const fadeColor = (c: string) => c === "transparent" ? c : color(c).mix(color("white"), 0.8).string(); // prettier-ignore

            return (
              <KonvaPath
                id={path.id}
                key={path.id}
                data={path.d}
                strokeWidth={path.strokeWidth}
                stroke={isSelected || noSelection ? path.strokeColor : fadeColor(path.strokeColor)}
                fill={isSelected || noSelection ? path.fillColor : fadeColor(path.fillColor)}
                x={path.x}
                y={path.y}
                scaleX={path.scaleX}
                scaleY={path.scaleY}
                rotation={path.rotation}
                draggable={isSelected}
                listening={isSelected}
                ref={(node) => {
                  if (node) pathRefs.current.set(path.id, node);
                  else pathRefs.current.delete(path.id);
                }}
                onDragEnd={handlePathDragEnd}
                onTransformEnd={handlePathTransformEnd}
              />
            );
          })}
          <Transformer ref={transformerRef} shouldOverdrawWholeArea />
          <Rect
            ref={selectionRectRef}
            fill={colors.blue["400"]}
            stroke={colors.blue["700"]}
            strokeScaleEnabled={false}
            strokeWidth={4}
            dash={[8, 8]}
            opacity={0.2}
          />
        </Layer>
      </Stage>
      <GenFillDialog
        state={genFillState}
        onConfirm={handleGenFillConfirm}
        onClose={() => setGenFillState(null)}
      />
      <SettingsDialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        board={board}
        shares={shares}
        onUpdate={handleSettingsUpdate}
      />
      <ExportDialog paths={pathsForExport} onClose={() => setPathsForExport([])} />
      <HelpDialog open={helpDialogOpen} onClose={() => setHelpDialogOpen(false)} />
    </>
  );
};

export default EditBoard;
export { meta };
