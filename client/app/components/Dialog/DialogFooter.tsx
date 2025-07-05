import React from "react";
import clsx from "clsx";

type DialogFooterProps = React.HTMLAttributes<HTMLDivElement>;

function DialogFooter({ children, className, ...rest }: DialogFooterProps) {
  return (
    <div className={clsx("flex justify-end gap-2 mt-6", className)} {...rest}>
      {children}
    </div>
  );
}

export { DialogFooter, type DialogFooterProps };
