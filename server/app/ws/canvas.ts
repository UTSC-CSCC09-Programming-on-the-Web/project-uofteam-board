import { Server, Socket } from "socket.io";
import express from "express";
import { checkCanvasAuth } from "#middleware/checkAuth.js";
import { BoardPermission, ClientBoardUpdate, Path, ServerBoardUpdate } from "#types/api.js";
import { Strokes } from "#models/Strokes.js";
import util from "util";
import { Boards } from "#models/Boards.js";
import { forceNewCachePreview } from "#services/cachepreview.js";

let socketio: Server | null = null;

const onUpdate = async (
  data: ClientBoardUpdate,
  boardId: number,
): Promise<ServerBoardUpdate | null> => {
  console.log("Received update:", data);
  switch (data.type) {
    case "CREATE_OR_REPLACE_PATHS": {
      const modifiedBoards = new Set<number>();
      const newStrokes = data.paths.map(async (path) => {
        modifiedBoards.add(boardId);
        return Strokes.upsert({
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

      const boardsToChange = await Boards.findAll({ where: { boardId: Array.from(modifiedBoards) } });
      const updatedBoards = boardsToChange.map((board) => {
        board.changed('updatedAt', true);
        return board.update({ updatedAt: new Date() })
      });

      await Promise.allSettled([...newStrokes, ...updatedBoards]);
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
  socketio = io;  // Save to use for kicking

  io.on("connection", async (socket: Socket) => {
    const req = socket.request as express.Request;
    const session = req.session;
    const boardId = socket.handshake.query.boardId as string | undefined;

    console.log(`New socket connection: ${socket.id}, session: ${session.user}`);
    console.log(util.inspect(session.user, false, null));

    let userAuth: BoardPermission | null = null;
    if (!boardId || !session.user || !session.user.paid || !(userAuth = await checkCanvasAuth(boardId, session.user))) {
      console.log(`Bad socket request found for socket: ${socket.id}`);
      socket.disconnect();
      return;
    }

    // Join the room for the board
    console.log(`Client ${socket.id} joining board room: ${boardId}`);
    socket.userData = session.user;
    socket.join(boardId);

    socket.on("disconnect", (reason) => {
      // Generate new preview image for the room they were in
      if (userAuth !== 'viewer') forceNewCachePreview(boardId);
      // Will leave room automatically
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on("update", async (data) => {
      if (userAuth === 'viewer' || !socket.userData?.paid) return;

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
    if (initialData && socket.userData?.paid) {
      io.to(socket.id).emit("update", initialData);
    }
  });
};

export const disconnectUnpaidUser = async (userId: number) => {
  if (socketio === null) throw Error("Cannot kick users before registering web socket!");

  for (const [id, connectedSocket] of socketio.sockets.sockets) {
    if (!connectedSocket.userData) {
      connectedSocket.disconnect(true);
      continue;
    }
    if (connectedSocket.userData.id === userId) {
      connectedSocket.userData.paid = false;
      socketio.to(id).emit("DC", "You have been disconnected due to failure of payment.")

      // Prevent automatic reconnection
      connectedSocket.disconnect(true);
    }
  }
}