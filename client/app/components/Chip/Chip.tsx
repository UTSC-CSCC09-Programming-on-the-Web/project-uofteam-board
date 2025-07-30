import clsx from "clsx";
import React from "react";

type ChipVariant = "primary" | "secondary" | "neutral" | "success" | "danger";

interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
}

const variantClasses: Record<ChipVariant, string> = {
  primary: "text-blue-800 bg-blue-100 border-blue-800/50",
  secondary: "text-yellow-800 bg-yellow-100 border-yellow-800/50",
  neutral: "text-gray-800 bg-gray-200 border-gray-800/50",
  success: "text-green-800 bg-green-100 border-green-800/50",
  danger: "text-red-800 bg-red-100 border-red-800/50",
};

const Chip = ({ variant = "neutral", children, className, ...rest }: ChipProps) => (
  <span
    {...rest}
    className={clsx(
      "h-8 flex items-center border rounded-full px-3 text-sm font-semibold",
      variantClasses[variant],
      className,
    )}
  >
    {children}
  </span>
);

export { Chip, type ChipProps };
