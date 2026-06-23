import type { ApiResponse } from '@/types/api'

// 业务错误码：HTTP 状态码与业务码并存，业务码用于前端精细化处理。
export enum BizCode {
  OK = 0,
  INVALID_PARAM = 40001,
  UNAUTHORIZED = 40101,
  FORBIDDEN = 40301,
  NOT_FOUND = 40401,
  INTERNAL = 50001,
}

export function ok<T>(data: T, msg = 'ok'): ApiResponse<T> {
  return { code: BizCode.OK, data, msg }
}

export function fail(code: BizCode, msg: string): ApiResponse<null> {
  return { code, data: null, msg }
}
