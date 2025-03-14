export interface ApiError extends Error {
  response?: {
    status?: number;
  };
  status?: number;
  code?: number;
}
