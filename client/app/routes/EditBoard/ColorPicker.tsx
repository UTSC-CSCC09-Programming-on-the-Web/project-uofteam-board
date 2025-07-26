import clsx from "clsx";
import { useDebouncedCallback } from "use-debounce";
import styles from "./ColorPicker.module.css";

interface ColorPickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  onChange: (color: string) => void;
}

function ColorPicker({ onChange, className, ...rest }: ColorPickerProps) {
  const debounced = useDebouncedCallback(onChange, 100);

  return (
    <input
      {...rest}
      type="color"
      onChange={(e) => debounced(e.target.value)}
      className={clsx("w-10 h-10 border-2 border-gray-600 cursor-pointer", styles.input, className)}
    />
  );
}

export { ColorPicker, type ColorPickerProps };
