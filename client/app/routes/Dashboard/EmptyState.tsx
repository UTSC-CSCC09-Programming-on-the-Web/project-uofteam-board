import clsx from "clsx";
import { FiPlus } from "react-icons/fi";
import { MdDraw } from "react-icons/md";
import { Button } from "~/components";

interface EmptyStateProps {
  query: string;
  loadingBoards: boolean;
  creatingNewBoard: boolean;
  onCreateBoard: () => void;
  className?: string;
}

const EmptyState = ({
  query,
  loadingBoards,
  creatingNewBoard,
  onCreateBoard,
  className,
}: EmptyStateProps) => (
  <div className={clsx("flex flex-col items-center text-center", className)}>
    <MdDraw className="size-24 text-yellow-800/25" />
    <p className="mt-4 mb-2 text-xl font-medium text-yellow-950/70">
      {loadingBoards ? "Loading boards..." : "No boards found."}
    </p>
    {!loadingBoards && (
      <>
        <p className="text-yellow-950/60">
          {query
            ? "Try changing your search query or creating a new board."
            : "Create a new board to get started!"}
        </p>
        <Button
          size="sm"
          variant="neutral"
          icon={<FiPlus />}
          onClick={onCreateBoard}
          loading={creatingNewBoard}
          className="mt-6"
        >
          New board
        </Button>
      </>
    )}
  </div>
);

export { EmptyState, type EmptyStateProps };
