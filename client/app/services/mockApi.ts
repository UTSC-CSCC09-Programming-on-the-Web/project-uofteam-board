import type { Board, Paginated, Response, User } from "~/types";

class MockApiService {
  private boards: Board[] = [];
  private currentUser: User | null = null;

  private LOCAL_STORAGE_BOARDS_KEY = "mockApiBoards";
  private LOCAL_STORAGE_USER_KEY = "mockApiCurrentUser";

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    const storedBoards = localStorage.getItem(this.LOCAL_STORAGE_BOARDS_KEY);
    if (storedBoards) this.boards = JSON.parse(storedBoards);
    else this.seedData();

    const storedUser = localStorage.getItem(this.LOCAL_STORAGE_USER_KEY);
    this.currentUser = storedUser ? JSON.parse(storedUser) : null;
  }

  private saveToLocalStorage() {
    localStorage.setItem(this.LOCAL_STORAGE_BOARDS_KEY, JSON.stringify(this.boards));
    if (this.currentUser)
      localStorage.setItem(this.LOCAL_STORAGE_USER_KEY, JSON.stringify(this.currentUser));
    else localStorage.removeItem(this.LOCAL_STORAGE_USER_KEY);
  }

  private seedData() {
    const now = new Date().toISOString();
    this.boards = [];
    for (let i = 1; i <= 16; i++) {
      this.boards.push({
        id: i,
        name: `Board ${i}`,
        createdAt: now,
        updatedAt: now,
      });
    }
    this.saveToLocalStorage();
  }

  private async simulateDelay(min = 1500, max = 3000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise((res) => setTimeout(res, delay));
  }

  public getLoginRedirectUrl(): string {
    this.currentUser = {
      id: 1,
      name: "John Doe",
      email: "name@domain.com",
    };

    this.saveToLocalStorage();
    return "http://localhost:5173/dashboard";
  }

  public getLogoutRedirectUrl(): string {
    this.currentUser = null;
    this.saveToLocalStorage();
    return "http://localhost:5173";
  }

  public async getMe(): Promise<Response<User>> {
    await this.simulateDelay();
    return this.currentUser
      ? { status: 200, error: null, data: this.currentUser }
      : { status: 401, error: "Not authenticated", data: null };
  }

  public async getBoards(
    page: number,
    limit: number,
    query: string,
  ): Promise<Response<Paginated<Board>>> {
    await this.simulateDelay();
    if (!this.currentUser)
      return { status: 401, error: "Authentication required to view boards", data: null };

    const filtered = this.boards.filter((b) => b.name.toLowerCase().includes(query.toLowerCase()));
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / limit);
    const currPage = Math.max(1, Math.min(page, totalPages));
    const offset = (currPage - 1) * limit;

    const paginated: Paginated<Board> = {
      totalItems,
      totalPages,
      currPage,
      prevPage: currPage > 1 ? currPage - 1 : null,
      nextPage: currPage < totalPages ? currPage + 1 : null,
      limit,
      data: filtered.slice(offset, offset + limit),
    };

    return { status: 200, error: null, data: paginated };
  }

  public async createBoard(): Promise<Response<Board>> {
    await this.simulateDelay();
    if (!this.currentUser)
      return { status: 401, error: "Authentication required to create board", data: null };

    const newBoard: Board = {
      id: this.boards.length + 1,
      name: `Board ${this.boards.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.boards.push(newBoard);
    this.saveToLocalStorage();
    return { status: 201, error: null, data: newBoard };
  }

  public async getBoard(id: number): Promise<Response<Board>> {
    await this.simulateDelay();
    if (!this.currentUser)
      return { status: 401, error: "Authentication required to view board details", data: null };

    const board = this.boards.find((b) => b.id === id);
    return board
      ? { status: 200, error: null, data: board }
      : { status: 404, error: "Board not found", data: null };
  }
}

const API = new MockApiService();
export { API };
