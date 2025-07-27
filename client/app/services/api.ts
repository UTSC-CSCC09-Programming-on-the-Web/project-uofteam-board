import { io, Socket } from "socket.io-client";
import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import type { Board, Paginated, ServerBoardUpdate, Response, User, ClientBoardUpdate, Path, BoardShare, BoardShareUpdate, UrlLink } from "~/types"; // prettier-ignore
import { config } from "~/config";

class ApiService {
  private readonly client: AxiosInstance;
  private socket: Socket | null = null;
  private boardId: string | null = null;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      withCredentials: true,
      headers: { "Content-Type": "application/json" },
    });
  }

  public getLoginRedirectUrl(): Promise<Response<UrlLink>> {
    return this.get("/auth/login");
  }

  public createCheckoutSession(): Promise<Response<UrlLink>> {
    return this.post("/stripe/create-checkout-session");
  }

  public createCustomerPortalSession(): Promise<Response<UrlLink>> {
    return this.post("/stripe/create-portal-session");
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
    return this.patch(`/boards/${boardID}`, { name });
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
    if (this.boardId === id) {
      this.socket?.disconnect();
      this.socket = null;
      this.boardId = null;
    }

    // Use the correct protocol and path for Socket.IO
    const socket = io(config.WS_BASE_URL, {
      path: "/ws/",
      query: { boardId: id.toString() },
      transports: ["websocket"],
      withCredentials: true,
    });
    this.socket = socket;
    this.boardId = id;

    socket.on("connect", () => {
      console.log(`Socket connected for board ${id} (socket ID: ${socket.id})`);
    });

    socket.on("update", (update: ServerBoardUpdate) => {
      onUpdate(update);
    });

    socket.on("connect_error", (err) => {
      console.log(`Socket connection error for board ${id}:`, err.stack || err);
      onError(err);
    });

    socket.on("disconnect", (reason) => {
      this.socket = null;
      this.boardId = null;
      onClose(reason);
    });

    return () => {
      console.log(`Disconnecting socket for board ${id} (socket ID: ${socket.id})`);
      socket?.disconnect();
      this.socket = null;
      this.boardId = null;
    };
  }

  public emitBoardUpdate(id: string, update: ClientBoardUpdate): void {
    if (this.socket?.connected) {
      console.log(`Emitting update:`, update);
      this.socket.emit("update", update);
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

  private patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<Response<T>> {
    return this.request<T>({ ...config, method: "patch", url, data });
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
