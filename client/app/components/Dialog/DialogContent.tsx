import React from "react";
import clsx from "clsx";

type DialogContentProps = React.HTMLAttributes<HTMLDivElement>;

const DialogContent = ({ children, className, ...rest }: DialogContentProps) => (
  <div {...rest} className={clsx("text-gray-700", className)}>
    {children}
  </div>
);

export { DialogContent, type DialogContentProps };
