export type Response<T> =
  | { status: number; error: string; data: null }
  | { status: number; error: null; data: T };

export interface Board {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Paginated<T> {
  totalItems: number;
  totalPages: number;
  currPage: number;
  prevPage: number | null;
  nextPage: number | null;
  limit: number;
  data: T[];
}
