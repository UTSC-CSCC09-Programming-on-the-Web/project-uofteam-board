import { type ReactNode } from "react";
import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "neutral" | "danger";
type ButtonSize = "sm" | "md";

interface ButtonProps {
  label: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "text-blue-800 bg-blue-100 border-blue-800 shadow-[3px_3px] shadow-blue-950/20",
  secondary:
    "text-yellow-800 bg-yellow-100 border-yellow-800 shadow-[3px_3px] shadow-yellow-950/20",
  neutral: "text-gray-800 bg-gray-200 border-gray-800 shadow-[3px_3px] shadow-gray-950/20",
  danger: "text-red-900 bg-red-200 border-red-800 shadow-[3px_3px] shadow-red-950/20",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-xl",
};

function Button({
  label,
  size = "md",
  variant = "primary",
  disabled = false,
  loading = false,
  icon,
  onClick,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={clsx(
        "inline-flex items-center justify-center gap-2 transition-all cursor-pointer font-semibold",
        "border-2 rounded-tl-[255px_15px] rounded-tr-[15px_225px] rounded-br-[225px_15px] rounded-bl-[15px_255px]",
        "active:shadow-none active:translate-x-[3px] active:translate-y-[3px]",
        variantClasses[variant],
        sizeClasses[size],
        (loading || disabled) && "opacity-50 pointer-events-none",
      )}
    >
      {loading && (
        <div className="size-[1em] border-[.15em] rounded-full animate-spin border-current/25 border-t-current/75" />
      )}
      {!loading && icon}
      {label}
    </button>
  );
}

export { Button, type ButtonProps };
