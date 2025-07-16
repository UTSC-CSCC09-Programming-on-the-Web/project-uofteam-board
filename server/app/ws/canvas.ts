import { Server, Socket } from "socket.io";
import express from "express";
import { checkCanvasAuth } from "#middleware/checkAuth.ts";
import { ClientBoardUpdate, Path, ServerBoardUpdate } from "#types/api.ts";
import { Strokes } from "#models/Strokes.ts";
import util from "util";

const onUpdate = async (
  data: ClientBoardUpdate,
  boardId: number,
): Promise<ServerBoardUpdate | null> => {
  console.log("Received update:", data);
  switch (data.type) {
    case "CREATE_OR_REPLACE_PATHS": {
      data.paths.forEach(async (path) => {
        await Strokes.upsert({
          strokeId: path.id,
          boardId: boardId,
          d: path.d,
          color: path.strokeColor,
          width: path.strokeWidth,
          fillColor: path.fillColor,
          x: path.x,
          y: path.y,
          scaleX: path.scaleX,
          scaleY: path.scaleY,
          rotation: path.rotation,
        });
      });
      return data satisfies ServerBoardUpdate;
    }
    case "DELETE_PATHS": {
      await Strokes.destroy({ where: { strokeId: data.ids } });
      return data satisfies ServerBoardUpdate;
    }
  }
};

const initialLoad = async (boardId: string): Promise<ServerBoardUpdate | null> => {
  const strokes = await Strokes.findAll({ where: { boardId } });
  if (!strokes || strokes.length === 0) {
    return null;
  }
  const paths = strokes.map(
    (stroke) =>
      ({
        id: stroke.strokeId,
        d: stroke.d,
        strokeColor: stroke.color,
        strokeWidth: stroke.width,
        fillColor: stroke.fillColor,
        x: stroke.x,
        y: stroke.y,
        scaleX: stroke.scaleX,
        scaleY: stroke.scaleY,
        rotation: stroke.rotation,
      }) satisfies Path,
  );
  return { type: "CREATE_OR_REPLACE_PATHS", paths } satisfies ServerBoardUpdate;
};

export const registerWebSocket = (io: Server) => {
  io.on("connection", async (socket: Socket) => {
    const req = socket.request as express.Request;
    const session = req.session;
    const boardId = socket.handshake.query.boardId as string | undefined;

    console.log(`New socket connection: ${socket.id}, session: ${session.user}`);
    console.log(util.inspect(session.user, false, null));

    const userAuth =
      boardId && session.user ? await checkCanvasAuth(boardId, session.user) : undefined;
    if (!boardId || !userAuth) {
      console.log(`Bad socket request found for socket: ${socket.id}`);
      socket.disconnect();
      return;
    }

    // TODO: check if they are a viewer

    // Join the room for the board
    console.log(`Client ${socket.id} joining board room: ${boardId}`);
    socket.join(boardId);

    socket.on("disconnect", (reason) => {
      // Will leave room automatically
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on("update", async (data) => {
      onUpdate(data satisfies ClientBoardUpdate, Number(boardId))
        .then((update) => {
          if (update) {
            io.to(boardId).emit("update", update);
          }
        })
        .catch((err) => {
          console.error(`Error processing update for board ${boardId}:`, err);
        });
    });

    const initialData = await initialLoad(boardId);
    if (initialData) {
      io.to(socket.id).emit("update", initialData);
    }
  });
};
