import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { MdArrowBack, MdDelete, MdHelpOutline, MdSettings } from "react-icons/md";
import { Stage, Layer, Rect, Path as KonvaPath, Transformer } from "react-konva";
import { RiPenNibLine, RiOpenaiFill } from "react-icons/ri";
import { PiRectangleDashedDuotone } from "react-icons/pi";
import colors from "tailwindcss/colors";
import { v4 as uuid } from "uuid";
import Konva from "konva";
import clsx from "clsx";
import color from "color";

import type { Route } from "./+types/EditBoard";
import { Button, Spinner } from "~/components";
import type { Board, BoardShare, Path } from "~/types";
import { API } from "~/services";

import { useSpacePressed } from "./useSpacePressed";
import { GenFillDialog, type GenFillDialogState } from "./GenFillDialog";
import { ColorPicker } from "./ColorPicker";
import { ToolButton } from "./ToolButton";
import { HelpDialog } from "./HelpDialog";
import { SettingsDialog } from "./SettingsDialog";
import { computeBoundingBox } from "./utils";

export function meta() {
  return [{ title: "Edit Board" }];
}

interface PathWithLocal extends Path {
  // fromLocal is used to indicate if the path was created locally. This is done
  // so that when the path is sent to the server and the server responds with
  // the same path, we know to move the local path to the end of the list.
  // Otherwise, different clients might have different orders of paths.
  fromLocal?: boolean;
}

interface Point {
  x: number;
  y: number;
}

type BoardState =
  | {
      type: "SELECTING";
    }
  | {
      type: "DRAWING_FREEHAND";
      pathID: string;
    }
  | {
      type: "IDLE";
    };

type Tool = "SELECTION" | "PEN";

export default function EditBoard({ params }: Route.ComponentProps) {
  const navigate = useNavigate();
  const spacePressed = useSpacePressed();
  const [board, setBoard] = useState<Board | null>(null);
  const [shares, setShares] = useState<BoardShare[]>([]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [fillColor, setFillColor] = useState("#fff085");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [strokeColor, setStrokeColor] = useState("#193cb8");
  const [genFillState, setGenFillState] = useState<GenFillDialogState | null>(null);

  const [tool, setTool] = useState<Tool>("PEN");
  const [selectedIDs, setSelectedIDs] = useState<string[]>([]);
  const [selectionRect, setSelectionRect] = useState<null | { start: Point; end: Point }>(null);
  const pathRefs = useRef<Map<string, Konva.Path>>(new Map());
  const transformerRef = useRef<Konva.Transformer>(null);

  const width = window.innerWidth;
  const height = window.innerHeight;
  const stageRef = useRef<Konva.Stage>(null);
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

  useEffect(
    () =>
      API.listenForBoardUpdates(
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
      ),
    [params.bid],
  );

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (spacePressed) return;
    const stage = e.target.getStage();
    if (!stage) return;

    const ptr = stage.getRelativePointerPosition();
    if (!ptr) return;
    const { x, y } = ptr;

    const commonPathProps = {
      id: uuid(),
      strokeColor,
      strokeWidth,
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
      case "SELECTION":
        if (e.target !== stage) return;
        boardStateRef.current = { type: "SELECTING" };
        setSelectionRect({ start: ptr, end: ptr });
        break;

      case "PEN":
        newPath = { ...commonPathProps, d: `M ${x} ${y} L ${x} ${y}`, fillColor: "transparent" };
        boardStateRef.current = { type: "DRAWING_FREEHAND", pathID: newPath.id };
        setPaths((prevPaths) => [...prevPaths, newPath]);
        break;

      default:
        [tool] satisfies [never];
        break;
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const bs = boardStateRef.current;
    if (bs.type === "IDLE") return;

    const stage = e.target.getStage();
    if (!stage) return;

    const ptr = stage.getRelativePointerPosition();
    if (!ptr) return;
    const { x, y } = ptr;

    switch (bs.type) {
      case "SELECTING":
        if (!selectionRect) return;
        setSelectionRect({ ...selectionRect, end: ptr });
        break;

      case "DRAWING_FREEHAND":
        setPaths((prevPaths) => {
          const paths = [...prevPaths];
          const pathIndex = paths.findIndex((p) => p.id === bs.pathID);
          if (pathIndex === -1) return prevPaths;
          const path = paths[pathIndex];
          const newD = `${path.d} L ${x} ${y}`;
          paths[pathIndex] = { ...path, d: newD };
          return paths;
        });
        break;

      default:
        [bs] satisfies [never];
        break;
    }
  };

  const handleMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const bs = boardStateRef.current;
    if (bs.type === "IDLE") return;

    const stage = e.target.getStage();
    if (!stage) return;

    switch (bs.type) {
      case "SELECTING":
        if (!selectionRect) return;
        setSelectionRect(null);

        const selBox = {
          x: Math.min(selectionRect.start.x, selectionRect.end.x),
          y: Math.min(selectionRect.start.y, selectionRect.end.y),
          width: Math.abs(selectionRect.start.x - selectionRect.end.x),
          height: Math.abs(selectionRect.start.y - selectionRect.end.y),
        };

        const selected = paths.filter((x) => Konva.Util.haveIntersection(selBox, computeBoundingBox([x]))); // prettier-ignore
        setSelectedIDs(selected.map((x) => x.id));
        break;

      case "DRAWING_FREEHAND":
        const path = paths.find((p) => p.id === bs.pathID);
        if (path) API.emitBoardUpdate(params.bid, { type: "CREATE_OR_REPLACE_PATHS", paths: [path] }); // prettier-ignore
        break;

      default:
        [bs] satisfies [never];
        break;
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
                <>
                  <ToolButton
                    selected
                    color="danger"
                    label="Delete"
                    icon={<MdDelete />}
                    onClick={() => {
                      setPaths((prev) => prev.filter((path) => !selectedIDs.includes(path.id)));
                      API.emitBoardUpdate(params.bid, { type: "DELETE_PATHS", ids: selectedIDs });
                      setSelectedIDs([]);
                    }}
                  />
                  <ToolButton
                    selected={false}
                    label="Generative Fill"
                    icon={<RiOpenaiFill />}
                    onClick={() => {
                      const selectedPaths = paths.filter((p) => selectedIDs.includes(p.id));
                      setGenFillState({ boardID: params.bid, paths: selectedPaths });
                      setSelectedIDs([]);
                    }}
                  />
                </>
              ) : (
                <>
                  <ToolButton
                    label="Pen Tool"
                    selected={tool === "PEN"}
                    onClick={() => setTool("PEN")}
                    icon={<RiPenNibLine />}
                  />
                  <ToolButton
                    label="Selection Tool"
                    selected={tool === "SELECTION"}
                    onClick={() => setTool("SELECTION")}
                    icon={<PiRectangleDashedDuotone />}
                  />
                  {/* <ToolButton
              label="Line Tool"
              selected={tool === "PEN"}
              onClick={() => setTool("PEN")}
              icon={<TbLine />}
            /> */}
                  {/* <ToolButton
              label="Circle Tool"
              selected={tool === "PEN"}
              onClick={() => setTool("PEN")}
              icon={<MdOutlineCircle />}
            /> */}
                  <ColorPicker value={strokeColor} onChange={setStrokeColor} />
                  {/* <ColorPicker value={fillColor} onChange={setFillColor} /> */}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-10 p-4 flex justify-between pointer-events-none">
        <div className="flex gap-2 pointer-events-auto">
          <Button size="sm" onClick={handleZoomIn} variant="neutral">
            +
          </Button>
          <Button size="sm" onClick={handleZoomOut} variant="neutral">
            -
          </Button>
        </div>
        <div className="flex gap-2 pointer-events-auto">
          <Button
            size="sm"
            onClick={() => setHelpDialogOpen(true)}
            icon={<MdHelpOutline size="1.3em" />}
            variant="neutral"
          >
            Help
          </Button>
          {board.permission === "owner" && (
            <Button
              size="sm"
              onClick={() => setSettingsDialogOpen(true)}
              icon={<MdSettings size="1.3em" />}
              variant="neutral"
            >
              Settings
            </Button>
          )}
        </div>
      </div>
      <Stage
        width={width}
        height={height}
        ref={stageRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        draggable={spacePressed}
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
          {selectionRect && (
            <Rect
              x={Math.min(selectionRect.start.x, selectionRect.end.x)}
              y={Math.min(selectionRect.start.y, selectionRect.end.y)}
              width={Math.abs(selectionRect.start.x - selectionRect.end.x)}
              height={Math.abs(selectionRect.start.y - selectionRect.end.y)}
              fill={colors.blue["600"]}
              stroke={colors.blue["600"]}
              strokeWidth={3}
              dash={[5, 5]}
              opacity={0.2}
            />
          )}
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
      <HelpDialog open={helpDialogOpen} onClose={() => setHelpDialogOpen(false)} />
    </>
  );
}
