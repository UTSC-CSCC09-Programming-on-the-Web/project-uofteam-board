import { Server, Socket } from "socket.io";
import express from 'express';
import { checkCanvasAuth } from "#middleware/checkAuth.ts";
import { ClientBoardUpdate, Path, ServerBoardUpdate } from "#types/api.ts";
import { Strokes } from "#models/Strokes.ts";
import { render } from "#image-ai/render.ts";
import { main as aiModel } from "#image-ai/model.js";


const onUpdate = async (data: ClientBoardUpdate, boardId: number): Promise<ServerBoardUpdate | null> => {
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
        })
      });
      return data satisfies ServerBoardUpdate;
    }
    case "GENERATIVE_FILL": {
      const base64Image = await render(data.ids);
      aiModel(base64Image);
      return null;
    }
    case "DELETE_PATHS": {
      await Strokes.destroy({ where: { strokeId: data.ids } });
      return data satisfies ServerBoardUpdate;
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
    x: stroke.x,
    y: stroke.y,
    scaleX: stroke.scaleX,
    scaleY: stroke.scaleY,
    rotation: stroke.rotation,
  } satisfies Path));
  return { type: "CREATE_OR_REPLACE_PATHS", paths } satisfies ServerBoardUpdate;
}

export const registerWebSocket = (io: Server) => {
  
  // render(['8f98b6a6-df79-41d4-b944-9f97e3b31f5f','06d2c47f-eb91-4df1-b7de-33691d48747c']);
  
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
    
    socket.join(boardId);

    socket.on('disconnect', (reason) => { // Will leave room automatically
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on('update', async (data) => {
      onUpdate(data satisfies ClientBoardUpdate, Number(boardId))
        .then((update) => {
          if (update) {
            io.to(boardId).emit('update', update);
          }
        })
        .catch((err) => {
          console.error(`Error processing update for board ${boardId}:`, err);
        });
    });


    const initialData = await initialLoad(boardId);
    if (initialData) {
      io.to(socket.id).emit('update', initialData);
    }
  });
}