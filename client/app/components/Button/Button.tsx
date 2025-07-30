import React, { type ReactNode } from "react";
import { Spinner } from "../Spinner";
import clsx from "clsx";

type ButtonSize = "sm" | "md";
type ButtonVariant = "primary" | "secondary" | "neutral" | "danger";

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

const Button = ({
  children,
  size = "md",
  variant = "primary",
  disabled = false,
  loading = false,
  icon,
  onClick,
  className,
  ...rest
}: ButtonProps) => {
  const isDisabled = disabled || loading;
  const iconSizeClass = "size-[1.3em]";

  return (
    <button
      {...rest}
      onClick={onClick}
      disabled={isDisabled}
      className={clsx(
        "inline-flex items-center justify-center gap-2 transition-colors cursor-pointer font-semibold select-none border-2 rounded-organic-sm",
        isDisabled ? variantDisabledClasses[variant] : variantClasses[variant],
        isDisabled ? "pointer-events-none saturate-75" : "clickable-offset-shadow-md",
        sizeClasses[size],
        className,
      )}
    >
      {loading && <Spinner className={clsx(iconSizeClass, "border-[.15em]")} />}
      {!loading &&
        React.isValidElement<{ className?: string }>(icon) &&
        React.cloneElement(icon, { className: clsx(icon.props.className, iconSizeClass) })}
      {children}
    </button>
  );
};

export { Button, type ButtonProps };
