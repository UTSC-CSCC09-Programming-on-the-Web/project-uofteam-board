export type Response<T = null> =
  | { status: number; error: string; data: null }
  | { status: number; error: null; data: T };

export type BoardPermission = "owner" | "editor" | "viewer";

export interface UrlLink {
  url: string
}

export interface Board {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  permission: BoardPermission;
}

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface BoardShare {
  user: User;
  boardID: number;
  permission: Exclude<BoardPermission, "owner">;
}

export interface BoardShareUpdate {
  user: User;
  boardID: number;
  permission: Exclude<BoardPermission, "owner"> | "remove";
}

export interface Path {
  id: string;
  d: string;
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

export type ServerBoardUpdate =
  | { type: "CREATE_OR_REPLACE_PATHS"; paths: Path[] }
  | { type: "DELETE_PATHS"; ids: string[] };

export type ClientBoardUpdate =
  | { type: "CREATE_OR_REPLACE_PATHS"; paths: Path[] }
  | { type: "DELETE_PATHS"; ids: string[] };

export interface Paginated<T> {
  totalItems: number;
  totalPages: number;
  currPage: number;
  prevPage: number | null;
  nextPage: number | null;
  limit: number;
  data: T[];
}
