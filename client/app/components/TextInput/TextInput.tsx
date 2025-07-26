import clsx from "clsx";
import React from "react";

type TextInputSize = "sm" | "md";

interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: TextInputSize;
  icon?: React.ReactNode;
  containerClassName?: string;
}

const sizeMap: Record<TextInputSize, string> = {
  sm: "h-10 text-md",
  md: "h-12 text-lg",
};

function TextInput({ size = "md", icon, containerClassName, className, ...rest }: TextInputProps) {
  return (
    <div className={clsx("relative", containerClassName)}>
      {icon && React.isValidElement<{ className?: string }>(icon) && (
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
          {React.cloneElement(icon, { className: clsx(icon.props.className, "size-6") })}
        </div>
      )}
      <input
        {...rest}
        className={clsx(
          icon ? "pl-11" : "pl-4",
          "w-full pr-4 bg-blue-100/50 border-2 border-gray-400 rounded-organic-sm",
          sizeMap[size],
          className,
        )}
      />
    </div>
  );
}

export { TextInput, type TextInputProps, type TextInputSize };
