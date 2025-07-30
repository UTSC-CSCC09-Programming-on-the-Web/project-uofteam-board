import React from "react";
import clsx from "clsx";

type DialogTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

const DialogTitle = ({ children, className, ...rest }: DialogTitleProps) => (
  <h3 {...rest} className={clsx("text-2xl font-bold mb-4", className)}>
    {children}
  </h3>
);

export { DialogTitle, type DialogTitleProps };
