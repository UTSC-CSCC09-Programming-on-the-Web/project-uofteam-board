import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import type { Route } from "./+types/EditBoard";
import type { Board } from "~/types";
import { API } from "~/services";

export function meta() {
  return [{ title: "Edit Board" }];
}

export default function EditBoard({ params }: Route.ComponentProps) {
  const [board, setBoard] = useState<Board | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const res = await API.getBoard(params.bid);
      if (res.error !== null) {
        if (res.status === 401) navigate("/");
        else alert(`Error fetching board: ${res.error}`);
        return;
      }

      setBoard(res.data);
    })();
  }, [params.bid]);

  return board ? (
    <>
      <p>Loaded board {board.id}</p>
      <div className="mt-4 flex flex-col gap-2">
        <p>ID: {board.name}</p>
        <p>Name: {board.name}</p>
        <p>Created at: {board.createdAt}</p>
        <p>Updated at: {board.updatedAt}</p>
      </div>
    </>
  ) : (
    <p>Loading board {params.bid}...</p>
  );
}
