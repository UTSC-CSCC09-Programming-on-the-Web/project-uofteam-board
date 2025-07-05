import React from "react";
import clsx from "clsx";

type DialogTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

function DialogTitle({ children, className, ...rest }: DialogTitleProps) {
  return (
    <h3 className={clsx("text-2xl font-bold mb-4", className)} {...rest}>
      {children}
    </h3>
  );
}

export { DialogTitle, type DialogTitleProps };
