import React from "react";
import clsx from "clsx";

type DialogFooterProps = React.HTMLAttributes<HTMLDivElement>;

const DialogFooter = ({ children, className, ...rest }: DialogFooterProps) => (
  <div {...rest} className={clsx("flex justify-end gap-2 mt-6", className)}>
    {children}
  </div>
);

export { DialogFooter, type DialogFooterProps };
