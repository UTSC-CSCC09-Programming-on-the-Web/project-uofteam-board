import React from "react";
import clsx from "clsx";

interface DialogProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
}

function Dialog({ open, onClose, children, className, ...rest }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className={clsx(
          "bg-white p-6 w-full shadow-2xl max-w-md m-4",
          "border-2 border-gray-700 rounded-tl-[50px_10px] rounded-tr-[10px_50px] rounded-br-[50px_10px] rounded-bl-[50px_10px]",
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    </div>
  );
}

export { Dialog, type DialogProps };
