import React from "react";
import clsx from "clsx";

interface DialogProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean;
}

const Dialog = ({ open, children, className, ...rest }: DialogProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        {...rest}
        className={clsx(
          "bg-white p-6 w-full shadow-2xl max-w-md m-4",
          "border-2 border-gray-700 rounded-organic-lg",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
};

export { Dialog, type DialogProps };
