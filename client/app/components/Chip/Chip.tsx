import clsx from "clsx";
import React from "react";

type ChipVariant = "primary" | "secondary" | "neutral";

interface ChipProps
  extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
  variant?: ChipVariant;
}

const variantClasses: Record<ChipVariant, string> = {
  primary: "text-blue-800 bg-blue-100 border-blue-800 shadow-blue-950/20",
  secondary: "text-yellow-800 bg-yellow-100 border-yellow-800 shadow-yellow-950/20",
  neutral: "text-gray-800 bg-gray-200 border-gray-800 shadow-gray-950/20",
};

function Chip({ variant = "neutral", children, className, ...rest }: ChipProps) {
  return (
    <div
      className={clsx(
        "font-semibold border rounded-full px-2 py-1 text-sm",
        variantClasses[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export { Chip, type ChipProps };
