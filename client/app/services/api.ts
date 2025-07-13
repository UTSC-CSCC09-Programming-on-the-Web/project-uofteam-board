import { io, Socket } from "socket.io-client";
import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import type { Board, Paginated, ServerBoardUpdate, Response, User, ClientBoardUpdate, Path, BoardShare, BoardShareUpdate } from "~/types"; // prettier-ignore
import { config } from "~/config";

class ApiService {
  private readonly client: AxiosInstance;
  private sockets = new Map<string, Socket>();

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      withCredentials: true,
      headers: { "Content-Type": "application/json" },
    });
  }

  public getLoginRedirectUrl(): string {
    return `${this.client.defaults.baseURL}/auth/login`;
  }

  public postLogout(): Promise<Response<User>> {
    return this.post("/auth/logout");
  }

  public getMe(): Promise<Response<User>> {
    return this.get("/auth/me");
  }

  public getBoards(
    page: number,
    limit: number,
    query: string,
  ): Promise<Response<Paginated<Board>>> {
    return this.get("/boards", { params: { page, limit, query } });
  }

  public createBoard(name: string): Promise<Response<Board>> {
    return this.post("/boards", { name });
  }

  public getBoard(boardID: number): Promise<Response<Board>> {
    return this.get(`/boards/${boardID}`);
  }

  public renameBoard(boardID: number, name: string): Promise<Response<Board>> {
    return this.post(`/boards/${boardID}/rename`, { name });
  }

  public deleteBoard(boardID: number): Promise<Response<Board>> {
    return this.delete(`/boards/${boardID}`);
  }

  public getBoardShares(boardID: number): Promise<Response<BoardShare[]>> {
    return this.get(`/boards/${boardID}/shares`);
  }

  public shareBoard(boardID: number, userEmail: string): Promise<Response<BoardShare>> {
    return this.post(`/boards/${boardID}/shares`, { userEmail });
  }

  public updateBoardShares(
    boardID: number,
    updates: BoardShareUpdate[],
  ): Promise<Response<BoardShare[]>> {
    return this.post(`/boards/${boardID}/shares/update`, updates);
  }

  public listenForBoardUpdates(
    id: string,
    onUpdate: (update: ServerBoardUpdate) => void,
    onError: (error: Error) => void,
    onClose: (reason: string) => void,
  ): () => void {
    if (this.sockets.has(id)) {
      this.sockets.get(id)?.disconnect();
      this.sockets.delete(id);
    }

    const socket = io(`${config.WS_BASE_URL}/boards/${id}`);
    this.sockets.set(id, socket);

    socket.on("connect", () => {
      console.log(`Socket connected for board ${id} (socket ID: ${socket.id})`);
    });

    socket.on("update", (update: ServerBoardUpdate) => {
      onUpdate(update);
    });

    socket.on("connect_error", (err) => {
      onError(err);
    });

    socket.on("disconnect", (reason) => {
      this.sockets.delete(id);
      onClose(reason);
    });

    return () => {
      if (socket.connected) {
        socket.disconnect();
        this.sockets.delete(id);
      }
    };
  }

  public emitBoardUpdate(id: string, update: ClientBoardUpdate): void {
    const socket = this.sockets.get(id);
    if (socket && socket.connected) {
      console.log(`Emitting update:`, update);
      socket.emit("update", update);
    } else {
      console.warn(`Socket for board ${id} is not connected. Cannot emit update.`);
    }
  }

  public generativeFill(id: string, pathIDs: string[]): Promise<Response<Path[]>> {
    return this.post(`/boards/${id}/generative-fill`, { pathIDs });
  }

  // -------------------------------------------------------------------------------------------------------------------

  private get<T>(url: string, config?: AxiosRequestConfig): Promise<Response<T>> {
    return this.request<T>({ ...config, method: "get", url });
  }

  private post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<Response<T>> {
    return this.request<T>({ ...config, method: "post", url, data });
  }

  private delete<T>(url: string, config?: AxiosRequestConfig): Promise<Response<T>> {
    return this.request<T>({ ...config, method: "delete", url });
  }

  private async request<T>(config: AxiosRequestConfig): Promise<Response<T>> {
    try {
      const res = await this.client.request<T>(config);
      return { status: res.status, error: null, data: res.data };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        return {
          status: err.response?.status || 500,
          error: err.response?.data?.error || err.message,
          data: null,
        };
      }

      return {
        status: 500,
        error: "An unexpected error occurred",
        data: null,
      };
    }
  }
}

const API = new ApiService(config.API_BASE_URL);
export { API };
