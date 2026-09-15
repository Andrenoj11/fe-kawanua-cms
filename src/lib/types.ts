export type Role = "ADMIN" | "EDITOR";
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
}
export type RecordData = { id?: string; [key: string]: unknown };
export interface Meta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}
export interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: Meta;
  errors?: Record<string, string>;
}
export type TokenPair = {
  access_token: string;
  refresh_token: string;
  access_expires_at: number;
  refresh_expires_at: number;
};
