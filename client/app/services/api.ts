import { io, Socket } from "socket.io-client";
import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import type { Board, Paginated, ServerBoardUpdate, Response, User, ClientBoardUpdate, Path, BoardShare, BoardShareUpdate, UrlLink } from "~/types"; // prettier-ignore
import { config } from "~/config";

class ApiService {
  private readonly client: AxiosInstance;
  private socket: Socket | null = null;
  private boardID: number | null = null;
  private csrfToken: string | null = null;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      withCredentials: true,
      headers: { "Content-Type": "application/json" },
    });
  }

  public getLoginRedirectURL(): Promise<Response<UrlLink>> {
    return this.get("/auth/login");
  }

  public createStripeCheckoutSession(): Promise<Response<UrlLink>> {
    return this.post("/stripe/create-checkout-session");
  }

  public createStripePortalSession(): Promise<Response<UrlLink>> {
    return this.post("/stripe/create-portal-session");
  }

  public postLogout(): Promise<Response<User>> {
    const response = this.post<User>("/auth/logout");
    this.csrfToken = null;
    return response;
  }

  public getMe(): Promise<Response<User>> {
    return this.get("/auth/me");
  }

  public getUserPictureURL(): string {
    return `${this.client.defaults.baseURL}/auth/me/picture`;
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
    boardID: number,
    onUpdate: (update: ServerBoardUpdate) => void,
    onError: (error: Error) => void,
    onClose: (reason: string) => void,
  ): () => void {
    if (this.boardID === boardID) {
      this.socket?.disconnect();
      this.socket = null;
      this.boardID = null;
    }

    // Use the correct protocol and path for Socket.IO
    const socket = io(config.WS_BASE_URL, {
      path: "/ws/",
      query: { boardId: boardID.toString() },
      transports: ["websocket"],
      withCredentials: true,
    });
    this.socket = socket;
    this.boardID = boardID;

    socket.on("connect", () => {
      if (config.LOGGING_ENABLED)
        console.log(`Socket connected for board ${boardID} (socket ID: ${socket.id})`);
    });

    socket.on("update", (update: ServerBoardUpdate) => {
      if (config.LOGGING_ENABLED)
        console.log(`Received an update over socket for board ${boardID}:`, update);
      onUpdate(update);
    });

    socket.on("connect_error", (err) => {
      if (config.LOGGING_ENABLED)
        console.error(`Socket connection error for board ${boardID}:`, err.stack || err);
      onError(err);
    });

    socket.on("disconnect", (reason) => {
      if (config.LOGGING_ENABLED)
        console.warn(`Socket disconnected for board ${boardID} (reason: ${reason})`);
      this.socket = null;
      this.boardID = null;
      onClose(reason);
    });

    return () => {
      socket?.disconnect();
      this.socket = null;
      this.boardID = null;
    };
  }

  public emitBoardUpdate(boardID: number, update: ClientBoardUpdate): void {
    if (this.socket?.connected) {
      if (config.LOGGING_ENABLED) console.log(`Emitting update for board ${boardID}:`, update);
      this.socket.emit("update", update);
    } else if (config.LOGGING_ENABLED) {
      console.warn(`Socket for board ${boardID} is not connected. Cannot emit update.`);
    }
  }

  public getBoardPreviewImageURL(boardID: number): string {
    return `${this.client.defaults.baseURL}/boards/${boardID}/picture`;
  }

  public generativeFill(boardID: number, pathIDs: string[]): Promise<Response<Path[]>> {
    return this.post(`/boards/${boardID}/generative-fill`, { pathIDs });
  }

  // -----------------------------------------------------------------------------------------------

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

  private async getCsrfToken() {
    const token = await this.get<{ token: string }>("/csrf-token");
    if (token?.data) {
      this.csrfToken = token.data.token;
    }
  }

  private async request<T>(config: AxiosRequestConfig): Promise<Response<T>> {
    if (config.method !== "get" && this.csrfToken === null) await this.getCsrfToken();
    const res = await this.plainRequest<T>({
      ...config,
      headers: { "x-csrf-token": this.csrfToken },
    });
    if (res.status === 403) {
      // Retry with new token (in case session expired)
      await this.getCsrfToken();
      return await this.plainRequest<T>({ ...config, headers: { "x-csrf-token": this.csrfToken } });
    }
    return res;
  }

  private async plainRequest<T>(config: AxiosRequestConfig): Promise<Response<T>> {
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
