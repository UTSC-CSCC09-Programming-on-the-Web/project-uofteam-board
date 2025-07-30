import clsx from "clsx";

type SpinnerProps = React.HTMLAttributes<HTMLDivElement>;

const Spinner = ({ className, ...rest }: SpinnerProps) => (
  <div
    {...rest}
    className={clsx("rounded-full animate-spin border-current/25 border-t-current/75", className)}
  />
);

export { Spinner, type SpinnerProps };
