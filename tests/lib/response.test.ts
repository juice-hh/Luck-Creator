import { describe, it, expect } from 'vitest'
import { ok, fail, BizCode } from '@/lib/response'

describe('统一响应', () => {
  it('ok 返回 code=0 + data + msg=ok', () => {
    expect(ok({ a: 1 })).toEqual({ code: 0, data: { a: 1 }, msg: 'ok' })
  })

  it('ok 可自定义 msg', () => {
    expect(ok(null, '成功')).toEqual({ code: 0, data: null, msg: '成功' })
  })

  it('fail 返回业务码 + data=null + 错误信息', () => {
    expect(fail(BizCode.INVALID_PARAM, '参数错误')).toEqual({
      code: BizCode.INVALID_PARAM,
      data: null,
      msg: '参数错误',
    })
  })
})
