import { MdRefresh } from "react-icons/md";
import { Button } from "~/components";

interface ErrorStateProps {
  onRetry: () => void;
  retrying: boolean;
}

const ErrorState = ({ onRetry, retrying }: ErrorStateProps) => {
  return (
    <div className="min-h-80 flex flex-col items-center justify-center">
      <div className="max-w-lg text-center">
        <h3 className="text-2xl font-bold text-red-800">Something went wrong!</h3>
        <p className="mt-4 text-red-600">
          We encountered an unexpected error while trying to load your account. Please try again.
        </p>
        <Button onClick={onRetry} icon={<MdRefresh />} loading={retrying} className="mt-8">
          Try again
        </Button>
      </div>
    </div>
  );
};

export { ErrorState, type ErrorStateProps };
