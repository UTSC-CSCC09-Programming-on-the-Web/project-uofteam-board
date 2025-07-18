import { v4 as uuid } from "uuid";
import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import type { Board, Paginated, Path, ServerBoardUpdate, Response, User, ClientBoardUpdate, BoardShare, BoardPermission, BoardShareUpdate } from "~/types"; // prettier-ignore
import { config } from "~/config";

class MockApiService {
  private readonly client: AxiosInstance;

  private mockBoardUpdates = new Map<string, ClientBoardUpdate[]>();
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

  public async getBoards(
    page: number,
    limit: number,
    query: string,
  ): Promise<Response<Paginated<Board>>> {
    const res = await this.get<Paginated<Board>>("/boards", { params: { page, limit, query } });
    if (res.data !== null) res.data.data = res.data.data.map((board) => ({ ...board, permission: board.permission || "owner" })); // prettier-ignore
    return res;
  }

  public createBoard(name: string): Promise<Response<Board>> {
    return this.post("/boards", { name });
  }

  public async getBoard(boardID: number): Promise<Response<Board>> {
    const res = await this.get<Board>(`/boards/${boardID}`);
    if (res.data !== null && !res.data.permission) res.data.permission = "owner";
    return res;
  }

  public async renameBoard(boardID: number, name: string): Promise<Response<Board>> {
    console.log(`Mocking renameBoard for board ${boardID} to "${name}"`);
    const res = await this.getBoard(boardID);
    if (res.data !== null) res.data.name = name;
    return res;
  }

  public deleteBoard(boardID: number): Promise<Response<Board>> {
    console.log(`Mocking delete for board ${boardID}`);
    return this.getBoard(boardID);
  }

  public getBoardShares(boardID: number): Promise<Response<BoardShare[]>> {
    console.log(`Mocking getBoardShares for board ${boardID}`);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          status: 200,
          error: null,
          data: [
            {
              boardID,
              permission: "editor",
              user: { id: 1, name: "John Doe", email: "johndoe@gmail.com" },
            },
            {
              boardID,
              permission: "viewer",
              user: { id: 2, name: "Jane Smith", email: "janesmith@gmail.com" },
            },
          ],
        });
      }, 1000);
    });
  }

  public shareBoard(boardID: number, userEmail: string): Promise<Response<BoardShare>> {
    console.log(`Mocking shareBoard for board ${boardID} with email ${userEmail}`);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          status: 200,
          error: null,
          data: {
            boardID,
            permission: "viewer",
            user: { id: Math.floor(Math.random() * 1000), name: "New User", email: userEmail },
          },
        });
      }, 2000);
    });
  }

  public updateBoardShares(
    boardID: number,
    updates: BoardShareUpdate[],
  ): Promise<Response<BoardShare[]>> {
    console.log(`Mocking updateBoardShares for board ${boardID}`);
    return new Promise((resolve) => {
      setTimeout(() => {
        const updatedShares = updates
          .filter((x) => x.permission !== "remove")
          .map<BoardShare>((update) => ({
            boardID,
            permission: update.permission as Exclude<BoardPermission, "owner">,
            user: { id: update.user.id, name: update.user.name, email: update.user.email },
          }));

        resolve({ status: 200, error: null, data: updatedShares });
      }, 1500);
    });
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
          strokeColor: this.randomColor(),
          fillColor: this.randomColor(),
          strokeWidth,
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
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

  public generativeFill(id: string, pathIDs: string[]): Promise<Response<Path[]>> {
    console.log(`Mocking generativeFill for board ${id} with paths:`, pathIDs);

    const shapeTemplates: { name: string; d: string }[] = [
      {
        name: "smiley",
        d: "M 50 10 A 40 40 0 1 1 49.99 10 Z M 35 35 A 5 5 0 1 1 34.99 35 Z M 65 35 A 5 5 0 1 1 64.99 35 Z M 35 60 Q 50 70 65 60",
      },
      {
        name: "star",
        d: "M 50 15 L 61 39 L 88 39 L 66 57 L 75 84 L 50 68 L 25 84 L 34 57 L 12 39 L 39 39 Z",
      },
      {
        name: "heart",
        d: "M 50 30 C 50 20, 70 20, 70 35 C 70 50, 50 60, 50 70 C 50 60, 30 50, 30 35 C 30 20, 50 20, 50 30 Z",
      },
      {
        name: "blob",
        d: "M 30 20 C 50 10, 70 10, 80 30 C 90 50, 70 70, 50 60 C 30 50, 10 40, 20 30 Z",
      },
    ];

    const makePath = (): Path => {
      const shape = shapeTemplates[Math.floor(Math.random() * shapeTemplates.length)];
      const scale = 0.5 + Math.random() * 1.5;
      const x = Math.floor(Math.random() * 300);
      const y = Math.floor(Math.random() * 200);

      return {
        id: `path-${uuid()}`,
        d: shape.d,
        x,
        y,
        scaleX: scale,
        scaleY: scale,
        rotation: 0,
        strokeWidth: 3,
        strokeColor: this.randomColor(),
        fillColor: "transparent",
      };
    };

    const count = 2 + Math.floor(Math.random() * 3);
    const paths: Path[] = Array.from({ length: count }, makePath);

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          status: 200,
          error: null,
          data: paths,
        });
      }, 1500);
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

  private randomColor(): string {
    return `#${Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, "0")}`;
  }
}

const API = new MockApiService(config.API_BASE_URL);
export { API };
