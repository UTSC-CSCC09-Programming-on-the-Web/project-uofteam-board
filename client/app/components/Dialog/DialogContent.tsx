import React from "react";
import clsx from "clsx";

type DialogContentProps = React.HTMLAttributes<HTMLDivElement>;

function DialogContent({ children, className, ...rest }: DialogContentProps) {
  return (
    <div className={clsx("text-gray-700", className)} {...rest}>
      {children}
    </div>
  );
}

export { DialogContent, type DialogContentProps };
