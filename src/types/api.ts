// 前后端共享的统一响应契约。改契约只改这里。
export interface ApiResponse<T> {
  code: number
  data: T | null
  msg: string
}
