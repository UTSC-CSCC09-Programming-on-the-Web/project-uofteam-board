import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { FiPlus } from "react-icons/fi";
import toast from "react-hot-toast";

import { API } from "~/services";
import { Button } from "~/components";
import { type Paginated, type Board } from "~/types";

import type { Route } from "./+types/Dashboard";
import { QueryInput } from "./QueryInput";
import { BoardCard } from "./BoardCard";
import { EmptyState } from "./EmptyState";
import { sleep } from "~/utils";

const meta: Route.MetaFunction = () => [{ title: "Dashboard" }];

const Dashboard = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [creatingNewBoard, setCreatingNewBoard] = useState(false);
  const [pagination, setPagination] = useState<Paginated<Board> | null>(null);
  const latestReqID = useRef(0);

  useEffect(() => {
    (async () => {
      setBoardsLoading(true);
      const reqID = ++latestReqID.current;
      // Sleep ensures the loading state is not visually jarring
      const [, res] = await Promise.all([sleep(600), API.getBoards(0, 6, query)]);
      if (reqID !== latestReqID.current) return;

      if (res.error !== null) {
        if (res.status === 401) {
          navigate("/?error=not_logged_in");
        } else if (res.status === 403) {
          toast("You need to be subscribed to access the dashboard");
          navigate("/account");
        } else {
          toast(`Failed to fetch boards:\n ${res.error}`);
          setBoardsLoading(false);
        }
        return;
      }

      setPagination(res.data);
      setBoards(res.data.data);
      setBoardsLoading(false);
    })();
  }, [navigate, query]);

  const handleLoadMore = async () => {
    if (!pagination?.nextPage) return;

    setBoardsLoading(true);
    const reqID = ++latestReqID.current;
    const res = await API.getBoards(pagination.nextPage, pagination.limit, query);
    if (reqID !== latestReqID.current) return;
    if (res.error !== null) {
      toast(`Failed to fetch boards:\n ${res.error}`);
      setBoardsLoading(false);
      return;
    }

    setPagination(res.data);
    setBoards((prev) => [...prev, ...res.data.data]);
    setBoardsLoading(false);
  };

  const handleCreateBoard = async () => {
    setCreatingNewBoard(true);
    const res = await API.createBoard("Untitled board");
    setCreatingNewBoard(false);
    if (res.error !== null) {
      toast(`Failed to create board:\n ${res.error}`);
      return;
    }

    navigate(`/boards/${res.data.id}`);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-extrabold text-blue-800">Dashboard</h1>
        <Button icon={<FiPlus />} size="sm" onClick={handleCreateBoard} loading={creatingNewBoard}>
          New board
        </Button>
      </div>
      <QueryInput loading={boardsLoading} onChange={setQuery} className="mt-4" />
      {boards.length === 0 ? (
        <EmptyState
          query={query}
          loadingBoards={boardsLoading}
          creatingNewBoard={creatingNewBoard}
          onCreateBoard={handleCreateBoard}
          className="mt-16"
        />
      ) : (
        <div className="flex flex-col items-center justify-between mt-4 sm:mt-8">
          <div className="w-full grid gap-4 sm:gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {boards.map((x) => (
              <BoardCard
                key={x.id}
                title={x.name}
                imageURL={API.getBoardPreviewImageURL(x.id)}
                onClick={() => navigate(`/boards/${x.id}`)}
                chips={[
                  {
                    label: "Role",
                    value: x.permission,
                  },
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
          {pagination?.nextPage && (
            <Button
              className="mt-16"
              variant="secondary"
              loading={boardsLoading}
              onClick={handleLoadMore}
            >
              Load more
            </Button>
          )}
        </div>
      )}
    </>
  );
};

export { Dashboard as default, meta };
