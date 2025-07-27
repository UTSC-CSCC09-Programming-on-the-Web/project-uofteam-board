import clsx from "clsx";

interface LoadingTextProps {
  size: string;
}

const LoadingText = ({ size }: LoadingTextProps) => (
  <span className={clsx("inline-block bg-gray-800/20 rounded-full animate-pulse", size)}>
    &nbsp;
  </span>
);

export { LoadingText, type LoadingTextProps };
