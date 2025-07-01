import { useEffect, useRef, useState } from "react";
import { PiStackDuotone } from "react-icons/pi";
import { FiPlus } from "react-icons/fi";
import { useNavigate } from "react-router";

import { API } from "~/services";
import { Button } from "~/components";
import { type Paginated, type Board } from "~/types";

import { QueryInput } from "./QueryInput";
import { BoardCard } from "./BoardCard";

export function meta() {
  return [{ title: "My Boards" }];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [creatingNewBoard, setCreatingNewBoard] = useState(false);
  const [lastPaginatedResponse, setLastPaginatedResponse] = useState<Paginated<Board> | null>(null);

  const latestReqID = useRef(0);
  useEffect(() => {
    (async () => {
      setBoardsLoading(true);
      const reqID = ++latestReqID.current;
      const res = await API.getBoards(0, 6, query);
      if (reqID !== latestReqID.current) return;

      if (res.error !== null) {
        if (res.status === 401) {
          navigate("/");
        } else {
          alert(`Error fetching boards: ${res.error}`);
          setBoardsLoading(false);
        }
        return;
      }

      setLastPaginatedResponse(res.data);
      setBoards(res.data.data);
      setBoardsLoading(false);
    })();
  }, [navigate, query]);

  const onLoadMore = async () => {
    if (!lastPaginatedResponse?.nextPage) return;

    setBoardsLoading(true);
    const reqID = ++latestReqID.current;
    const res = await API.getBoards(lastPaginatedResponse.nextPage, lastPaginatedResponse.limit, query); // prettier-ignore
    if (reqID !== latestReqID.current) return;
    if (res.error !== null) {
      alert(`Error loading more boards: ${res.error}`);
      setBoardsLoading(false);
      return;
    }

    setLastPaginatedResponse(res.data);
    setBoards((prev) => [...prev, ...res.data.data]);
    setBoardsLoading(false);
  };

  // TODO: add option to choose board name
  const onNewBoard = async () => {
    setCreatingNewBoard(true);
    const res = await API.createBoard((Math.random() + 1).toString(36).substring(2));
    setCreatingNewBoard(false);
    if (res.error !== null) {
      alert(`Error creating new board: ${res.error}`);
      return;
    }

    navigate(`/boards/${res.data.id}`);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-extrabold text-blue-800">My boards</h1>
        <Button icon={<FiPlus />} size="sm" onClick={onNewBoard} loading={creatingNewBoard}>
          New board
        </Button>
      </div>
      <QueryInput loading={boardsLoading} onChange={setQuery} className="mt-4" />
      {boards.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center text-gray-500">
          <PiStackDuotone className="size-12 text-gray-300" />
          <p className="mt-4 mb-2 text-xl font-medium">
            {boardsLoading ? "Loading boards..." : "No boards found."}
          </p>
          {!boardsLoading && (
            <>
              <p className="text-gray-400">
                {query
                  ? "Try changing your search query or creating a new board."
                  : "Create a new board to get started!"}
              </p>
              <Button
                icon={<FiPlus />}
                size="sm"
                variant="neutral"
                className="mt-6"
                onClick={onNewBoard}
                loading={creatingNewBoard}
              >
                New board
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-between mt-4 sm:mt-8">
          <div className="w-full grid gap-4 sm:gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {boards.map((x) => (
              <BoardCard
                key={x.id}
                title={x.name}
                imageURL="https://placehold.co/300x200"
                onClick={() => navigate(`/boards/${x.id}`)}
                chips={[
                  {
                    label: "Modified",
                    value: new Date(x.updatedAt).toLocaleString([], {
                      month: "long",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }),
                  },
                ]}
              />
            ))}
          </div>
          {lastPaginatedResponse?.nextPage && (
            <Button
              className="mt-16"
              variant="secondary"
              onClick={onLoadMore}
              loading={boardsLoading}
            >
              Load more
            </Button>
          )}
        </div>
      )}
    </>
  );
}
