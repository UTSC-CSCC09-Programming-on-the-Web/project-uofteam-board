import React, { type ReactNode } from "react";
import { Spinner } from "../Spinner";
import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "neutral" | "danger";
type ButtonSize = "sm" | "md";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "text-blue-800 bg-blue-100 border-blue-800 shadow-blue-950/20 hover:bg-blue-200",
  secondary:
    "text-yellow-800 bg-yellow-100 border-yellow-800 shadow-yellow-950/20 hover:bg-yellow-200",
  neutral: "text-gray-800 bg-gray-200 border-gray-800 shadow-gray-950/20 hover:bg-gray-300",
  danger: "text-red-900 bg-red-200 border-red-800 shadow-red-950/20 hover:bg-red-300",
};

const variantDisabledClasses: Record<ButtonVariant, string> = {
  primary: "text-blue-800/40 bg-blue-50 border-blue-800/15",
  secondary: "text-yellow-800/40 bg-yellow-50 border-yellow-800/15",
  neutral: "text-gray-800/40 bg-gray-100 border-gray-800/15",
  danger: "text-red-900/40 bg-red-100 border-red-800/15",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 h-10 text-sm",
  md: "px-4 h-12 text-md",
};

function Button({
  children,
  size = "md",
  variant = "primary",
  disabled = false,
  loading = false,
  icon,
  onClick,
  className,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={clsx(
        "inline-flex items-center justify-center gap-2 transition-all cursor-pointer font-semibold",
        "border-2 rounded-tl-[255px_15px] rounded-tr-[15px_225px] rounded-br-[225px_15px] rounded-bl-[15px_255px]",
        "active:shadow-none active:translate-x-[3px] active:translate-y-[3px]",
        isDisabled ? variantDisabledClasses[variant] : variantClasses[variant],
        isDisabled ? "pointer-events-none saturate-75" : "shadow-[3px_3px]",
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {loading && <Spinner className="size-[1.3em] border-[.15em]" />}
      {!loading &&
        React.isValidElement<{ className?: string }>(icon) &&
        React.cloneElement(icon, { className: clsx(icon.props.className, "size-[1.3em]") })}
      {children}
    </button>
  );
}

export { Button, type ButtonProps };
