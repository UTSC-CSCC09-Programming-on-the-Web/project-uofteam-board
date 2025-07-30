import { useState, type ReactNode } from "react";
import clsx from "clsx";

type TooltipPosition = "top" | "bottom";

interface TooltipProps {
  text: string;
  children: ReactNode;
  position?: TooltipPosition;
}

const tooltipClasses: Record<TooltipPosition, string> = {
  top: "bottom-full mb-2",
  bottom: "top-full mt-2",
};

const arrowClasses: Record<TooltipPosition, string> = {
  top: "top-full border-t-gray-800 border-t-4",
  bottom: "bottom-full border-b-gray-800 border-b-4",
};

const Tooltip = ({ text, children, position = "top" }: TooltipProps) => {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={clsx(
            "absolute left-1/2 -translate-x-1/2 px-2 py-1 w-max bg-gray-800 rounded-md z-10",
            tooltipClasses[position],
          )}
        >
          <span className="text-white text-xs">{text}</span>
          <div
            className={clsx(
              "absolute left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent",
              arrowClasses[position],
            )}
          />
        </div>
      )}
    </div>
  );
};

export { Tooltip, type TooltipProps, type TooltipPosition };
