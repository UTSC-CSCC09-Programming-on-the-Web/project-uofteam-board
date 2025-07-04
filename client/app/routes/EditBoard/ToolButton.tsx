import clsx from "clsx";

interface ToolButtonProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

function ToolButton({ label, selected, icon, onClick }: ToolButtonProps) {
  return (
    <button
      title={label}
      onClick={onClick}
      className={clsx(
        "flex justify-center items-center",
        "border-2 size-10 rounded-xl transition-all text-xl cursor-pointer",
        "shadow-[3px_3px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] shadow-blue-800/15",
        selected
          ? "border-blue-800/60 bg-blue-200 text-blue-800"
          : "border-gray-400 bg-gray-200 text-gray-800 hover:bg-gray-300",
      )}
    >
      {icon}
    </button>
  );
}

export { ToolButton, type ToolButtonProps };
