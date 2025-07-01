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

export interface Paginated<T> {
  totalItems: number;
  totalPages: number;
  currPage: number;
  prevPage: number | null;
  nextPage: number | null;
  limit: number;
  data: T[];
}