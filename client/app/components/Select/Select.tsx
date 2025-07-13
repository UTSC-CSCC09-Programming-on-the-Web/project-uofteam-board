import clsx from "clsx";
import { HiChevronUpDown } from "react-icons/hi2";

type SelectSize = "sm" | "md";

interface SelectProps<T extends string>
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "size"> {
  size?: SelectSize;
  options: { value: T; label: string }[];
  onChange?: (newValue: T) => void;
  value?: T;
  containerClassName?: string;
}

const sizeMap: Record<SelectSize, string> = {
  sm: "h-10 text-md",
  md: "h-12 text-lg",
};

function Select<T extends string>({
  size = "md",
  options,
  onChange,
  containerClassName,
  className,
  ...rest
}: SelectProps<T>) {
  return (
    <div className={clsx("relative", containerClassName)}>
      <select
        {...rest}
        onChange={(e) => onChange?.(e.target.value as T)}
        className={clsx(
          "pl-2 pr-10 bg-blue-100/50 appearance-none",
          "border-2 border-gray-400 rounded-lg rounded-tl-[255px_25px] rounded-tr-[25px_225px] rounded-br-[225px_25px] rounded-bl-[25px_255px]",
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
}

export { Select, type SelectProps, type SelectSize };
