import { Server, Socket } from "socket.io";
import express from 'express';
import { checkCanvasAuth } from "#middleware/checkAuth.ts";
import { ClientBoardUpdate, Path, ServerBoardUpdate } from "#types/api.ts";
import { Strokes } from "#models/Strokes.ts";


const onUpdate = async (data: ClientBoardUpdate) => {
  console.log("Received update:", data);
  switch (data.type) {
    case "CREATE_OR_REPLACE_PATHS": {
      data.paths.forEach(async (path) => {
        await Strokes.create({
          d: path.d,
          color: path.strokeColor,
          width: path.strokeWidth,
          fillColor: path.fillColor,
        })
      })
      break;
    }
    case "DELETE_PATHS": {
      data.ids.forEach(async (strokeId) => {
        await Strokes.destroy({ where: { strokeId } });
      });
      break;
    }
  }
}

const initialLoad = async (boardId: string): Promise<ServerBoardUpdate | null> => {
  const strokes = await Strokes.findAll({ where: { boardId } });
  if (!strokes || strokes.length === 0) {
    return null;
  }
  const paths = strokes.map(stroke => ({
    id: stroke.strokeId,
    d: stroke.d,
    strokeColor: stroke.color,
    strokeWidth: stroke.width,
    fillColor: stroke.fillColor,
  } satisfies Path));
  return { type: "CREATE_OR_REPLACE_PATHS", paths } satisfies ServerBoardUpdate;
}

export const registerWebSocket = (io: Server) => {
  io.on('connection', async (socket: Socket) => {
    const req = socket.request as express.Request;
    const session = req.session;
    const boardId = socket.handshake.query.boardId as string | undefined;
    
    console.log(`New socket connection: ${socket.id}, session: ${session.user}`);
    if (!session.user || !boardId || !(await checkCanvasAuth(boardId, session.user))) {
      console.log(`Bad socket request found for socket: ${socket.id}`);
      socket.disconnect();
      return;
    }
    
    socket.on('disconnect', (reason) => { // Will leave room automatically
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on('update', async (data) => {
      onUpdate(data satisfies ClientBoardUpdate);
    });

    const initialData = await initialLoad(boardId);
    if (initialData) {
      io.to(socket.id).emit('update', initialData);
    }
  });
}