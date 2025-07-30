import clsx from "clsx";
import { HiChevronUpDown } from "react-icons/hi2";

type SelectSize = "sm" | "md";

interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectProps<T extends string>
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "size"> {
  size?: SelectSize;
  options: SelectOption<T>[];
  onChange?: (newValue: T) => void;
  value?: T;
  containerClassName?: string;
}

const sizeMap: Record<SelectSize, string> = {
  sm: "h-10 text-md",
  md: "h-12 text-lg",
};

const Select = <T extends string>({
  size = "md",
  options,
  onChange,
  containerClassName,
  className,
  ...rest
}: SelectProps<T>) => (
  <div className={clsx("relative", containerClassName)}>
    <select
      {...rest}
      onChange={(e) => onChange?.(e.target.value as T)}
      className={clsx(
        "pl-2 pr-10 bg-blue-100/50 border-2 border-gray-400 rounded-organic-sm appearance-none",
        sizeMap[size],
        className,
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-500">
      <HiChevronUpDown className="size-6" />
    </div>
  </div>
);

export { Select, type SelectProps, type SelectOption, type SelectSize };
