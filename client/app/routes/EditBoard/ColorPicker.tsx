import clsx from "clsx";
import { useDebouncedCallback } from "use-debounce";
import styles from "./ColorPicker.module.css";

interface ColorPickerProps {
  initialValue: string;
  onChange: (color: string) => void;
}

function ColorPicker({ initialValue, onChange }: ColorPickerProps) {
  const debounced = useDebouncedCallback(onChange, 100);

  return (
    <input
      type="color"
      value={initialValue}
      onChange={(e) => debounced(e.target.value)}
      className={clsx("w-10 h-10 border-2 border-gray-600 cursor-pointer", styles.input)}
    />
  );
}

export { ColorPicker, type ColorPickerProps };
