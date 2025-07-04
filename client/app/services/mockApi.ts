import { v4 as uuid } from "uuid";
import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import type {
  Board,
  Paginated,
  Path,
  ServerBoardUpdate,
  Response,
  User,
  ClientBoardUpdate,
} from "~/types";
import { config } from "~/config";

class MockApiService {
  private readonly client: AxiosInstance;

  private mockBoardUpdates = new Map<string, ServerBoardUpdate[]>();
  private mockUpdateCallbacks = new Map<string, ((update: ServerBoardUpdate) => void)[]>();
  private mockIntervals = new Map<string, NodeJS.Timeout>();

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

  public getBoard(id: string): Promise<Response<Board>> {
    return this.get(`/boards/${id}`);
  }

  public listenForBoardUpdates(
    id: string,
    onUpdate: (update: ServerBoardUpdate) => void,
    onError: (error: Error) => void,
    onClose: (reason: string) => void,
  ): () => void {
    console.log(`Mocking listenForBoardUpdates for board ${id}`);

    if (!this.mockUpdateCallbacks.has(id)) this.mockUpdateCallbacks.set(id, []);
    this.mockUpdateCallbacks.get(id)?.push(onUpdate);

    if (!this.mockIntervals.has(id)) {
      const interval = setInterval(() => {
        const size = Math.random() * 90 + 10;
        const x = Math.random() * (480 - size);
        const y = Math.random() * (480 - size);
        const strokeWidth = Math.random() * 10 + 4;
        const newPath: Path = {
          id: `path-${uuid()}`,
          d: `M ${x},${y} h${size} v${size} h-${size} Z`,
          strokeColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
          fillColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
          strokeWidth,
        };

        const mockUpdate: ServerBoardUpdate = { type: "CREATE_OR_REPLACE_PATHS", paths: [newPath] };
        this.mockUpdateCallbacks.get(id)?.forEach((callback) => callback(mockUpdate));
      }, 5000);
      this.mockIntervals.set(id, interval);
    }

    const pendingUpdates = this.mockBoardUpdates.get(id) || [];
    pendingUpdates.forEach((update) => {
      console.log(`Mocking delayed update for board ${id} from emit:`, update);
      onUpdate(update);
    });
    this.mockBoardUpdates.set(id, []);

    return () => {
      console.log(`Mocking cleanup for board ${id}`);
      const callbacks = this.mockUpdateCallbacks.get(id);
      if (callbacks) {
        const index = callbacks.indexOf(onUpdate);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
        if (callbacks.length === 0) {
          this.mockUpdateCallbacks.delete(id);
        }
      }
      if (this.mockIntervals.has(id)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        clearInterval(this.mockIntervals.get(id)!);
        this.mockIntervals.delete(id);
      }
      onClose("mocked disconnect");
    };
  }

  public emitBoardUpdate(id: string, update: ClientBoardUpdate): void {
    console.log(`Mocking emitBoardUpdate for board ${id}:`, update);
    if (!this.mockBoardUpdates.has(id)) this.mockBoardUpdates.set(id, []);
    this.mockBoardUpdates.get(id)?.push(update);
    this.mockUpdateCallbacks.get(id)?.forEach((callback) => {
      console.log(`Mocking immediate feedback for board ${id} from emit:`, update);
      callback(update);
    });
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

const API = new MockApiService(config.API_BASE_URL);
export { API };
