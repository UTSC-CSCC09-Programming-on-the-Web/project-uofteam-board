import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { MdArrowBack, MdDelete, MdHelpOutline, MdSettings, MdOutlineRectangle, MdOutlineCircle } from "react-icons/md"; // prettier-ignore
import { Stage, Layer, Rect, Path as KonvaPath, Transformer } from "react-konva";
import { FaWandMagicSparkles, FaFileExport } from "react-icons/fa6";
import { PiRectangleDashedDuotone } from "react-icons/pi";
import { RiPenNibLine } from "react-icons/ri";
import { useNavigate } from "react-router";
import colors from "tailwindcss/colors";
import toast from "react-hot-toast";
import { v4 as uuid } from "uuid";
import Konva from "konva";
import clsx from "clsx";
import color from "color";

import type { Route } from "./+types/EditBoard";
import type { Board, BoardShare, Path } from "~/types";
import { Button, ColorPicker, Spinner, Tooltip } from "~/components";
import { API } from "~/services";

import { HelpDialog } from "./HelpDialog";
import { ExportDialog } from "./ExportDialog";
import { SettingsDialog } from "./SettingsDialog";
import { LostAccessDialog } from "./LostAccessDialog";
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
  const boardID = Number(params.bid);
  const navigate = useNavigate();
  const mousePressed = useMousePressed();
  const spacePressed = useSpacePressed();
  const [boardLoading, setBoardLoading] = useState(true);
  const [board, setBoard] = useState<Board | null>(null);
  const [shares, setShares] = useState<BoardShare[]>([]);
  const [lostAccessDialogOpen, setLostAccessDialogOpen] = useState(false);
  const selectionRectRef = useRef<Konva.Rect | null>(null);

  const [fillColor, setFillColor] = useState("#fff085aa");
  const [strokeColor, setStrokeColor] = useState("#193cb8");
  const [updateFillColor, setUpdateFillColor] = useState(fillColor);
  const [updateStrokeColor, setUpdateStrokeColor] = useState(strokeColor);
  const [updateFillColorVisible, setUpdateFillColorVisible] = useState(false);
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
  const latestReqID = useRef(0);

  const fetchBoard = useCallback(
    async (reconnecting: boolean) => {
      setBoardLoading(true);
      const reqID = ++latestReqID.current;
      const [boardRes, boardSharesRes] = await Promise.all([
        API.getBoard(boardID),
        API.getBoardShares(boardID),
      ]);
      if (reqID !== latestReqID.current) return;

      for (const res of [boardRes, boardSharesRes]) {
        if (res.error !== null) {
          if (res.status === 401) {
            if (reconnecting) {
              toast("Looks like your login session has expired.");
              setBoardLoading(false);
            } else {
              navigate("/?error=not_logged_in");
            }
          } else if (res.status === 403) {
            toast(res.error);
            if (reconnecting) setBoardLoading(false);
            else navigate("/dashboard");
          } else if (res.status === 404) {
            toast(`Board #${boardID} does not exist, or you don't have access to it.`);
            if (reconnecting) setBoardLoading(false);
            else navigate("/dashboard");
          } else {
            toast(`Unexpected error fetching board:\n ${res.error}`);
            setLostAccessDialogOpen(true);
            setBoardLoading(false);
          }
          return;
        }
      }

      if (boardRes.data === null || boardSharesRes.data === null) {
        // This should never happen, but it satisfies TypeScript
        toast("Unexpected state reached!");
        setLostAccessDialogOpen(true);
        setBoardLoading(false);
        return;
      }

      setBoard(boardRes.data);
      setShares(boardSharesRes.data);
      setLostAccessDialogOpen(false);
      setBoardLoading(false);
    },
    [boardID],
  );

  useEffect(() => {
    fetchBoard(false);
  }, [fetchBoard]);

  useEffect(() => {
    if (!board) return;
    let firstLoad = true;
    return API.listenForBoardUpdates(
      board.id,
      (update) => {
        switch (update.type) {
          case "CREATE_OR_REPLACE_PATHS":
            setPaths((prev) => {
              if (firstLoad) {
                // On the first load, we replace the paths
                // so that we are in sync with the server.
                firstLoad = false;
                return update.paths;
              }

              const prevCopy = [...prev];
              update.paths.forEach((newPath) => {
                const existingIndex = prevCopy.findIndex((p) => p.id === newPath.id);
                if (existingIndex === -1) {
                  prevCopy.push(newPath);
                  return;
                }

                const existingPath = prevCopy[existingIndex];
                if (existingPath.fromLocal) {
                  // If the existing path was created from local, we make sure to
                  // delete it and add the new path to the end of the list. This ensures
                  // that the paths for different clients appear in the exact same order.
                  prevCopy.splice(existingIndex, 1);
                  prevCopy.push(newPath);
                } else {
                  prevCopy[existingIndex] = newPath;
                }
              });
              return prevCopy;
            });
            break;
          case "DELETE_PATHS":
            setPaths((prev) => prev.filter((path) => !update.ids.includes(path.id)));
            break;
          default:
            [update] satisfies [never];
            break;
        }
      },
      () => {
        setLostAccessDialogOpen(true);
      },
      (reason) => {
        if (reason !== "io client disconnect") {
          setLostAccessDialogOpen(true);
        }
      },
    );
  }, [board]);

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
        const selectedPaths = paths.filter((x) => Konva.Util.haveIntersection(bbox, computeBoundingBox([x]))); // prettier-ignore
        if (selectedPaths.length === 0) {
          setSelectedIDs([]);
          break;
        }

        const firstStrokeColor = selectedPaths[0].strokeColor;
        if (selectedPaths.every((x) => x.strokeColor === firstStrokeColor)) {
          setUpdateStrokeColor(firstStrokeColor);
        } else {
          setUpdateStrokeColor(strokeColor);
        }

        const firstFillColor = selectedPaths[0].fillColor;
        if (selectedPaths.every((x) => x.fillColor === firstFillColor)) {
          setUpdateFillColor(firstFillColor);
          // A fill color of "transparent" means the paths are hand-drawn and we
          // should not allow the user to erroneously update the fill color.
          setUpdateFillColorVisible(firstFillColor !== "transparent");
        } else {
          setUpdateFillColor(fillColor);
          setUpdateFillColorVisible(true);
        }

        setSelectedIDs(selectedPaths.map((x) => x.id));
        break;
      }
      case "DRAWING_FREEHAND": {
        bs.path.d = makeLineData(bs.path.d, point);
        API.emitBoardUpdate(boardID, { type: "CREATE_OR_REPLACE_PATHS", paths: [bs.path] });
        break;
      }
      case "DRAWING_RECTANGLE": {
        bs.path.d = makeRectData({ start: bs.start, end: point });
        API.emitBoardUpdate(boardID, { type: "CREATE_OR_REPLACE_PATHS", paths: [bs.path] });
        break;
      }
      case "DRAWING_CIRCLE": {
        bs.path.d = makeCircleData({ start: bs.start, end: point });
        API.emitBoardUpdate(boardID, { type: "CREATE_OR_REPLACE_PATHS", paths: [bs.path] });
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
          API.emitBoardUpdate(boardID, { type: "CREATE_OR_REPLACE_PATHS", paths: [p] });
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
          API.emitBoardUpdate(boardID, { type: "CREATE_OR_REPLACE_PATHS", paths: [p] });
        }
        return p;
      }),
    );
  };

  const handleGenFillConfirm = (oldPaths: Path[], newPaths: Path[]) => {
    newPaths = newPaths.map((p) => ({ ...p, fromLocal: true }));
    setPaths((prev) => prev.filter((p) => !oldPaths.some((op) => op.id === p.id)).concat(newPaths));
    API.emitBoardUpdate(boardID, { type: "DELETE_PATHS", ids: oldPaths.map((p) => p.id) });
    API.emitBoardUpdate(boardID, { type: "CREATE_OR_REPLACE_PATHS", paths: newPaths });
  };

  const handleSettingsUpdate = (board: Board, shares: BoardShare[]) => {
    setBoard(board);
    setShares(shares);
  };

  const handleDelete = useCallback(() => {
    if (selectedIDs.length === 0) return;
    setPaths((prev) => prev.filter((path) => !selectedIDs.includes(path.id)));
    API.emitBoardUpdate(boardID, { type: "DELETE_PATHS", ids: selectedIDs });
    setSelectedIDs([]);
  }, [selectedIDs, params.bid]);

  const handleExport = useCallback(() => {
    const selectedPaths = paths.filter((p) => selectedIDs.includes(p.id));
    if (selectedPaths.length === 0) {
      setSelectedIDs([]);
      return;
    }

    setPathsForExport(selectedPaths);
    setSelectedIDs([]);
  }, [selectedIDs, paths]);

  const handleGenerativeFill = useCallback(() => {
    const selectedPaths = paths.filter((p) => selectedIDs.includes(p.id));
    if (selectedPaths.length === 0) {
      setSelectedIDs([]);
      return;
    }

    setGenFillState({ boardID, paths: selectedPaths });
    setSelectedIDs([]);
  }, [selectedIDs, paths, boardID]);

  const handleUpdateFillColor = (color: string) => {
    setFillColor(color);
    setUpdateFillColor(color);
    const selectedPaths = paths.filter((p) => selectedIDs.includes(p.id));
    const coalesceColor = (prev: string) => (prev === "transparent" ? "transparent" : color);
    const updatedPaths = selectedPaths.map((p) => ({ ...p, fillColor: coalesceColor(p.fillColor) })); // prettier-ignore
    setPaths((prev) => prev.map((p) => selectedIDs.includes(p.id) ? { ...p, fillColor: coalesceColor(p.fillColor) } : p)); // prettier-ignore
    API.emitBoardUpdate(boardID, { type: "CREATE_OR_REPLACE_PATHS", paths: updatedPaths });
  };

  const handleUpdateStrokeColor = (strokeColor: string) => {
    setStrokeColor(strokeColor);
    setUpdateStrokeColor(strokeColor);
    const selectedPaths = paths.filter((p) => selectedIDs.includes(p.id));
    const updatedPaths = selectedPaths.map((p) => ({ ...p, strokeColor }));
    setPaths((prev) => prev.map((p) => (selectedIDs.includes(p.id) ? { ...p, strokeColor } : p)));
    API.emitBoardUpdate(boardID, { type: "CREATE_OR_REPLACE_PATHS", paths: updatedPaths });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
      <>
        <div className="fixed inset-0 flex justify-center items-center text-yellow-700/60 bg-yellow-50">
          <Spinner className="size-24 border-8" />
        </div>
        <LostAccessDialog
          beforeConnection
          open={lostAccessDialogOpen}
          onBack={() => navigate("/dashboard")}
          onRetry={() => fetchBoard(true)}
          retrying={boardLoading}
        />
      </>
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
                  <Tooltip text="Delete" position="bottom">
                    <Button
                      size="sm"
                      title="Delete"
                      variant="danger"
                      icon={<MdDelete />}
                      className="!w-10 !px-0"
                      onClick={handleDelete}
                    />
                  </Tooltip>
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
                  <Tooltip text="Stroke color" position="bottom">
                    <ColorPicker
                      value={updateStrokeColor}
                      onChange={handleUpdateStrokeColor}
                      popoverClassName="!mt-4"
                    />
                  </Tooltip>
                  {updateFillColorVisible && (
                    <Tooltip text="Fill color" position="bottom">
                      <ColorPicker
                        value={updateFillColor}
                        onChange={handleUpdateFillColor}
                        popoverClassName="!mt-4"
                      />
                    </Tooltip>
                  )}
                </Fragment>
              ) : (
                <Fragment key="no-selection-actions">
                  <Tooltip text="Pen" position="bottom">
                    <Button
                      size="sm"
                      variant={tool === "PEN" ? "primary" : "neutral"}
                      onClick={() => setTool("PEN")}
                      icon={<RiPenNibLine />}
                      className="!w-10 !px-0"
                    />
                  </Tooltip>
                  <Tooltip text="Rectangle" position="bottom">
                    <Button
                      size="sm"
                      variant={tool === "RECTANGLE" ? "primary" : "neutral"}
                      onClick={() => setTool("RECTANGLE")}
                      icon={<MdOutlineRectangle />}
                      className="!w-10 !px-0"
                    />
                  </Tooltip>
                  <Tooltip text="Circle" position="bottom">
                    <Button
                      size="sm"
                      variant={tool === "CIRCLE" ? "primary" : "neutral"}
                      onClick={() => setTool("CIRCLE")}
                      icon={<MdOutlineCircle />}
                      className="!w-10 !px-0"
                    />
                  </Tooltip>
                  <Tooltip text="Select" position="bottom">
                    <Button
                      size="sm"
                      variant={tool === "SELECTION" ? "primary" : "neutral"}
                      onClick={() => setTool("SELECTION")}
                      icon={<PiRectangleDashedDuotone />}
                      className="!w-10 !px-0"
                    />
                  </Tooltip>
                  {tool !== "SELECTION" && (
                    <>
                      <Tooltip text="Stroke width" position="bottom">
                        <Button
                          size="sm"
                          variant="neutral"
                          onClick={() => setStrokeWidthIndex((i) => (i + 1) % strokeWidthOptions.length)} // prettier-ignore
                          className="!w-16 !px-0"
                        >
                          {strokeWidthOptions[strokeWidthIndex]}px
                        </Button>
                      </Tooltip>
                      <Tooltip text="Stroke color" position="bottom">
                        <ColorPicker
                          value={strokeColor}
                          onChange={setStrokeColor}
                          popoverClassName="!mt-4"
                        />
                      </Tooltip>
                    </>
                  )}
                  {(["RECTANGLE", "CIRCLE"] satisfies Tool[] as Tool[]).includes(tool) && (
                    <Tooltip text="Fill color" position="bottom">
                      <ColorPicker
                        value={fillColor}
                        onChange={setFillColor}
                        popoverClassName="!mt-4"
                      />
                    </Tooltip>
                  )}
                </Fragment>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-10 p-4 flex justify-between pointer-events-none">
        <div className="flex gap-2 pointer-events-auto">
          <Tooltip text="Zoom in">
            <Button size="sm" onClick={handleZoomIn} variant="neutral" className="!w-10">
              +
            </Button>
          </Tooltip>
          <Tooltip text="Zoom out">
            <Button
              size="sm"
              title="Zoom out"
              onClick={handleZoomOut}
              variant="neutral"
              className="!w-10"
            >
              -
            </Button>
          </Tooltip>
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
      <LostAccessDialog
        beforeConnection={false}
        open={lostAccessDialogOpen}
        onBack={() => navigate("/dashboard")}
        onRetry={() => fetchBoard(true)}
        retrying={boardLoading}
      />
    </>
  );
};

export default EditBoard;
export { meta };
