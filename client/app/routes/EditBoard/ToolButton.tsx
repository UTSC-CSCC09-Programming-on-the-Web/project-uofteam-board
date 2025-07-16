import clsx from "clsx";

type ToolButtonColor = "primary" | "danger";

interface ToolButtonProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  color?: ToolButtonColor;
  icon: React.ReactNode;
}

const colorMap: Record<ToolButtonColor, string> = {
  primary: "border-blue-800/60 bg-blue-200 text-blue-800 hover:bg-blue-300",
  danger: "border-red-800/60 bg-red-200 text-red-800 hover:bg-red-300",
};

function ToolButton({ label, selected, icon, color = "primary", onClick }: ToolButtonProps) {
  return (
    <button
      title={label}
      onClick={onClick}
      className={clsx(
        "flex justify-center items-center",
        "border-2 size-10 rounded-xl transition-all text-xl cursor-pointer",
        "shadow-[3px_3px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] shadow-blue-800/15",
        selected ? colorMap[color] : "border-gray-400 bg-gray-200 text-gray-800 hover:bg-gray-300",
      )}
    >
      {icon}
    </button>
  );
}

export { ToolButton, type ToolButtonProps, type ToolButtonColor };
