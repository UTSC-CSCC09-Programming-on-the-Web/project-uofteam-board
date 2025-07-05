import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { MdArrowBack, MdHelpOutline, MdOutlineCircle, MdOutlineRectangle } from "react-icons/md";
import { RiPenNibLine } from "react-icons/ri";
import { TbLine } from "react-icons/tb";
import { v4 as uuid } from "uuid";
import clsx from "clsx";

import type { Route } from "./+types/EditBoard";
import { Button, Spinner } from "~/components";
import type { Board, Path } from "~/types";
import { API } from "~/services";

import { useSpacePressed } from "./useSpacePressed";
import { ColorPicker } from "./ColorPicker";
import { ToolButton } from "./ToolButton";
import { HelpDialog } from "./HelpDialog";

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

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

type BoardState =
  | {
      type: "DRAWING_FREEHAND";
      path: Path;
    }
  | {
      type: "DRAWING_LINE";
      startPoint: Point;
      path: Path;
    }
  | {
      type: "DRAWING_RECTANGLE";
      startPoint: Point;
      path: Path;
    }
  | {
      type: "DRAWING_CIRCLE";
      startPoint: Point;
      path: Path;
    }
  | {
      type: "PANNING";
      startPoint: Point;
      startViewBox: ViewBox;
      path: null;
    }
  | {
      type: "IDLE";
      path: null;
    };

type ToolType = `${"PEN" | "LINE" | "RECTANGLE" | "CIRCLE"}_TOOL`;

export default function EditBoard({ params }: Route.ComponentProps) {
  const navigate = useNavigate();
  const spacePressed = useSpacePressed();
  const [board, setBoard] = useState<Board | null>(null);
  const renderCount = useRef(0);

  const [fillColor, setFillColor] = useState("#fff085");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [strokeColor, setStrokeColor] = useState("#193cb8");
  const [selectedTool, setSelectedTool] = useState<ToolType>("PEN_TOOL");
  const [viewBox, setViewBox] = useState<ViewBox>({ x: 0, y: 0, width: 480, height: 480 });
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [paths, setPaths] = useState<PathWithLocal[]>([]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const currPathElemRef = useRef<SVGPathElement | null>(null);
  const boardStateRef = useRef<BoardState>({ type: "IDLE", path: null });

  useEffect(() => {
    renderCount.current += 1;
  });

  useEffect(() => {
    (async () => {
      const res = await API.getBoard(params.bid);
      if (res.error !== null) {
        if (res.status === 401) navigate("/");
        else alert(`Error fetching board: ${res.error}`);
        return;
      }

      setBoard(res.data);
    })();
  }, [params.bid]);

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
          alert(`Socket closed: ${reason}`);
        },
      ),
    [params.bid],
  );

  const getEffectiveScale = (): number => {
    if (!svgRef.current) return 1;
    const svgRect = svgRef.current.getBoundingClientRect();
    const svgAspectRatio = svgRect.width / svgRect.height;
    const viewBoxAspectRatio = viewBox.width / viewBox.height;
    return svgAspectRatio > viewBoxAspectRatio
      ? viewBox.height / svgRect.height
      : viewBox.width / svgRect.width;
  };

  const getSvgPoint = (clientX: number, clientY: number): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };

    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };

    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(ctm.inverse());
  };

  const getSvgMidPoint = (): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svgRect = svgRef.current.getBoundingClientRect();
    const clientPoint: Point = { x: svgRect.left + svgRect.right / 2, y: svgRect.top + svgRect.height / 2 }; // prettier-ignore
    return getSvgPoint(clientPoint.x, clientPoint.y);
  };

  const handleDrawingStart = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;

    if (spacePressed) {
      boardStateRef.current = {
        type: "PANNING",
        startPoint: { x: e.clientX, y: e.clientY },
        startViewBox: { ...viewBox },
        path: null,
      };
      return;
    }

    const { x, y } = getSvgPoint(e.clientX, e.clientY);

    const commonPathProps = {
      id: uuid(),
      strokeColor,
      strokeWidth,
      fillColor,
      fromLocal: true,
    } satisfies Partial<PathWithLocal>;

    let newPath: PathWithLocal;
    switch (selectedTool) {
      case "PEN_TOOL":
        newPath = { ...commonPathProps, d: `M ${x} ${y} L ${x} ${y}`, fillColor: "none" };
        boardStateRef.current = { type: "DRAWING_FREEHAND", path: newPath };
        setPaths((prevPaths) => [...prevPaths, newPath]);
        break;
      case "LINE_TOOL":
        newPath = { ...commonPathProps, d: `M ${x} ${y} L ${x} ${y}`, fillColor: "none" };
        boardStateRef.current = { type: "DRAWING_LINE", path: newPath, startPoint: { x, y } };
        setPaths((prevPaths) => [...prevPaths, newPath]);
        break;
      case "RECTANGLE_TOOL":
        newPath = { ...commonPathProps, d: `M ${x} ${y} L ${x} ${y}` };
        boardStateRef.current = { type: "DRAWING_RECTANGLE", path: newPath, startPoint: { x, y } };
        setPaths((prevPaths) => [...prevPaths, newPath]);
        break;
      case "CIRCLE_TOOL":
        newPath = { ...commonPathProps, d: `M ${x} ${y} A 0 0 0 0 1 ${x} ${y}` };
        boardStateRef.current = { type: "DRAWING_CIRCLE", path: newPath, startPoint: { x, y } };
        setPaths((prevPaths) => [...prevPaths, newPath]);
        break;
      default:
        [selectedTool] satisfies [never];
        break;
    }
  };

  const handleDrawingMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const bs = boardStateRef.current;
    if (!svgRef.current || bs.type === "IDLE") return;

    if (bs.type === "PANNING") {
      const dx = e.clientX - bs.startPoint.x;
      const dy = e.clientY - bs.startPoint.y;
      const scale = getEffectiveScale();
      const newX = bs.startViewBox.x - dx * scale;
      const newY = bs.startViewBox.y - dy * scale;
      setViewBox((prev) => ({ ...prev, x: newX, y: newY }));
      return;
    }

    if (!currPathElemRef.current) return;
    const { x, y } = getSvgPoint(e.clientX, e.clientY);
    switch (bs.type) {
      case "DRAWING_FREEHAND":
        {
          const newD = `${bs.path.d} L ${x} ${y}`;
          currPathElemRef.current.setAttribute("d", newD);
          bs.path.d = newD;
        }
        break;
      case "DRAWING_LINE":
        {
          const newD = `M ${bs.startPoint.x} ${bs.startPoint.y} L ${x} ${y}`;
          currPathElemRef.current.setAttribute("d", newD);
          bs.path.d = newD;
        }
        break;
      case "DRAWING_RECTANGLE":
        {
          const newD = `M ${bs.startPoint.x} ${bs.startPoint.y} L ${x} ${bs.startPoint.y} L ${x} ${y} L ${bs.startPoint.x} ${y} Z`;
          currPathElemRef.current.setAttribute("d", newD);
          bs.path.d = newD;
        }
        break;
      case "DRAWING_CIRCLE":
        {
          const radius = Math.sqrt((x - bs.startPoint.x) ** 2 + (y - bs.startPoint.y) ** 2);
          const newD = `M ${bs.startPoint.x} ${bs.startPoint.y} m -${radius}, 0 a ${radius},${radius} 0 1,0 ${radius * 2},0 a ${radius},${radius} 0 1,0 -${radius * 2},0`;
          currPathElemRef.current.setAttribute("d", newD);
          bs.path.d = newD;
        }
        break;
      default:
        [bs] satisfies [never];
        break;
    }
  };

  const handleDrawingEnd = () => {
    const bs = boardStateRef.current;
    if (!svgRef.current || bs.type === "IDLE") return;

    if (
      bs.type === "DRAWING_FREEHAND" ||
      bs.type === "DRAWING_LINE" ||
      bs.type === "DRAWING_RECTANGLE" ||
      bs.type === "DRAWING_CIRCLE"
    ) {
      const newPath = bs.path;
      API.emitBoardUpdate(params.bid, { type: "CREATE_OR_REPLACE_PATHS", paths: [newPath] });
      setPaths((prevPaths) => {
        const updatedPaths = [...prevPaths];
        const existingIndex = updatedPaths.findIndex((p) => p.id === newPath.id);
        if (existingIndex !== -1) updatedPaths[existingIndex] = newPath;
        return updatedPaths;
      });
    }

    boardStateRef.current = { type: "IDLE", path: null };
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    let zoomFactor = 1.15;
    if (e.deltaY < 0) zoomFactor = 1 / zoomFactor;
    const point = getSvgPoint(e.clientX, e.clientY);
    doZoom(point, zoomFactor);
  };

  const handleZoomIn = () => doZoom(getSvgMidPoint(), 1 / 1.15);
  const handleZoomOut = () => doZoom(getSvgMidPoint(), 1.15);

  const doZoom = (point: Point, zoomFactor: number) => {
    setViewBox((prev) => {
      const newWidth = prev.width * zoomFactor;
      const newHeight = prev.height * zoomFactor;
      const newX = point.x - (point.x - prev.x) * (newWidth / prev.width);
      const newY = point.y - (point.y - prev.y) * (newHeight / prev.height);
      return { x: newX, y: newY, width: newWidth, height: newHeight };
    });
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
            <h1 className="text-2xl font-bold text-blue-800">Board Name {renderCount.current}</h1>
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            <ToolButton
              label="Pen Tool"
              selected={selectedTool === "PEN_TOOL"}
              onClick={() => setSelectedTool("PEN_TOOL")}
              icon={<RiPenNibLine />}
            />
            <ToolButton
              label="Line Tool"
              selected={selectedTool === "LINE_TOOL"}
              onClick={() => setSelectedTool("LINE_TOOL")}
              icon={<TbLine />}
            />
            <ToolButton
              label="Rectangle Tool"
              selected={selectedTool === "RECTANGLE_TOOL"}
              onClick={() => setSelectedTool("RECTANGLE_TOOL")}
              icon={<MdOutlineRectangle />}
            />
            <ToolButton
              label="Circle Tool"
              selected={selectedTool === "CIRCLE_TOOL"}
              onClick={() => setSelectedTool("CIRCLE_TOOL")}
              icon={<MdOutlineCircle />}
            />
            <ColorPicker value={strokeColor} onChange={setStrokeColor} />
            <ColorPicker value={fillColor} onChange={setFillColor} />
          </div>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-10 p-4 flex justify-between pointer-events-none">
        <div className="flex gap-2 pointer-events-auto">
          <Button size="sm" onClick={handleZoomIn}>
            +
          </Button>
          <Button size="sm" onClick={handleZoomOut}>
            -
          </Button>
        </div>
        <Button
          size="sm"
          onClick={() => setHelpDialogOpen(true)}
          icon={<MdHelpOutline size="1.3em" />}
          className="pointer-events-auto"
        >
          Help
        </Button>
      </div>
      <svg
        ref={svgRef}
        onWheel={handleWheel}
        onPointerDown={handleDrawingStart}
        onPointerMove={handleDrawingMove}
        onPointerUp={handleDrawingEnd}
        onPointerLeave={handleDrawingEnd}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className={"touch-none h-screen w-screen cursor-crosshair"}
      >
        {paths.map((path, index) => (
          <path
            key={index}
            d={path.d}
            fill={path.fillColor}
            stroke={path.strokeColor}
            strokeWidth={path.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            ref={path.id === boardStateRef.current.path?.id ? currPathElemRef : null}
          />
        ))}
      </svg>
      <HelpDialog open={helpDialogOpen} onClose={() => setHelpDialogOpen(false)} />
    </>
  );
}
