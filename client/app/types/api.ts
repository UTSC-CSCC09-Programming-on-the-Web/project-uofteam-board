export type Response<T> =
  | { status: number; error: string; data: null }
  | { status: number; error: null; data: T };

export interface Board {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
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
  | { type: "GENERATIVE_FILL"; ids: string[] }
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
