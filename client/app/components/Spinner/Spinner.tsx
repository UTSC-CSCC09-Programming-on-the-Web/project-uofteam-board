import clsx from "clsx";

type SpinnerProps = React.HTMLAttributes<HTMLDivElement>;

function Spinner({ className, ...rest }: SpinnerProps) {
  return (
    <div
      {...rest}
      style={{}}
      className={clsx("rounded-full animate-spin border-current/25 border-t-current/75", className)}
    />
  );
}

export { Spinner, type SpinnerProps };
