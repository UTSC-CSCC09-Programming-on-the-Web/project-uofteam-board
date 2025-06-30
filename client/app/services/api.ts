import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import type { Board, Paginated, Response, User } from "~/types";

class ApiService {
  private readonly client: AxiosInstance;

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

  public getLogoutRedirectUrl(): string {
    return `${this.client.defaults.baseURL}/auth/logout`;
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

  public createBoard(): Promise<Response<Board>> {
    return this.post("/boards");
  }

  public getBoard(id: string): Promise<Response<Board>> {
    return this.get(`/boards/${id}`);
  }

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

const API = new ApiService(process.env.API_BASE_URL || "http://localhost:3000/api");
export { API };
