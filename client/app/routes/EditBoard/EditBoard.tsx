import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import type { Route } from "./+types/EditBoard";
import { Spinner } from "~/components";
import type { Board } from "~/types";
import { API } from "~/services";

export function meta() {
  return [{ title: "Edit Board" }];
}

interface Path {
  d: string;
  strokeColor: string;
  strokeWidth: number;
}

export default function EditBoard({ params }: Route.ComponentProps) {
  const navigate = useNavigate();

  const [strokeWidth] = useState(4);
  const [strokeColor] = useState("#000000");
  const [paths, setPaths] = useState<Path[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [board, setBoard] = useState<Board | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const currentPathRef = useRef<Path | null>(null);

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

  const getCoords = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>,
  ): { x: number; y: number } => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();

    let x: number, y: number;
    if ("touches" in e.nativeEvent && e.nativeEvent.touches.length > 0) {
      x = e.nativeEvent.touches[0].clientX - rect.left;
      y = e.nativeEvent.touches[0].clientY - rect.top;
    } else {
      const mouseEvent = e as React.MouseEvent<SVGSVGElement>;
      x = mouseEvent.clientX - rect.left;
      y = mouseEvent.clientY - rect.top;
    }
    return { x, y };
  };

  const handleDrawingStart = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>,
  ) => {
    e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getCoords(e);
    const newPath: Path = { d: `M ${x} ${y}`, strokeColor, strokeWidth };
    currentPathRef.current = newPath;
    setPaths((prevPaths) => [...prevPaths, newPath]);
  };

  const handleDrawingMove = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>,
  ) => {
    if (!isDrawing || !currentPathRef.current) return;
    e.preventDefault();
    const { x, y } = getCoords(e);
    const newD = `${currentPathRef.current.d} L ${x} ${y}`;
    currentPathRef.current.d = newD;
    setPaths((prevPaths) => {
      const newPaths = [...prevPaths];
      newPaths[newPaths.length - 1] = { ...newPaths[newPaths.length - 1], d: newD };
      return newPaths;
    });
  };

  const handleDrawingEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    currentPathRef.current = null;
  };

  if (!board) {
    return (
      <div className="flex-1 flex justify-center items-center text-yellow-700/60">
        <Spinner className="size-24 border-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-1">
      <svg
        ref={svgRef}
        onMouseDown={handleDrawingStart}
        onMouseMove={handleDrawingMove}
        onMouseUp={handleDrawingEnd}
        onMouseLeave={handleDrawingEnd}
        onTouchStart={handleDrawingStart}
        onTouchMove={handleDrawingMove}
        onTouchEnd={handleDrawingEnd}
        onTouchCancel={handleDrawingEnd}
        className="cursor-crosshair touch-none w-full bg-blue-50"
      >
        {paths.map((path, index) => (
          <path
            key={index}
            d={path.d}
            stroke={path.strokeColor}
            strokeWidth={path.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
      </svg>
    </div>
  );
}
