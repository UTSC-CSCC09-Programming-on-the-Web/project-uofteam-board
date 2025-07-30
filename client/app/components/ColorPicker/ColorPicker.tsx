import { useRef, useState, useEffect } from "react";
import { HexAlphaColorPicker } from "react-colorful";
import { useDebouncedCallback } from "use-debounce";
import clsx from "clsx";

import { Button } from "../Button";
import styles from "./ColorPicker.module.css";

type ColorPickerSize = "sm" | "md";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  popoverClassName?: string;
  size?: ColorPickerSize;
}

const sizeMap: Record<ColorPickerSize, string> = {
  sm: "!size-8",
  md: "!size-10",
};

const ColorPicker = ({ value, onChange, popoverClassName, size = "md" }: ColorPickerProps) => {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const debounced = useDebouncedCallback(onChange, 100);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className={clsx("relative", sizeMap[size])}>
      <div className="cursor-pointer">
        <Button
          disabled={open}
          variant="neutral"
          onClick={() => setOpen(true)}
          className={clsx(
            "!p-1 !bg-transparent !translate-0 !shadow-none !border-gray-800",
            sizeMap[size],
          )}
        >
          <div className={clsx("size-full outline-2 outline-gray-400", styles["preview-bg"])}>
            <div className="size-full" style={{ backgroundColor: value }} />
          </div>
        </Button>
      </div>
      {open && (
        <div
          ref={popoverRef}
          className={clsx(
            "mt-1 absolute right-0 z-10 p-4 bg-white offset-shadow-lg shadow-gray-500/30",
            "border-2 border-gray-700 rounded-organic-md",
            popoverClassName,
          )}
        >
          <HexAlphaColorPicker color={value} onChange={debounced} />
        </div>
      )}
    </div>
  );
};

export { ColorPicker, type ColorPickerProps };
