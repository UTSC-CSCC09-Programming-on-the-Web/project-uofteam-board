import clsx from "clsx";
import styles from "./ColorPicker.module.css";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={clsx("w-10 h-10 border-2 border-gray-600 rounded-xl cursor-pointer", styles.input)}
    />
  );
}

export { ColorPicker, type ColorPickerProps };
