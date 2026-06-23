import { describe, it, expect, vi, afterEach } from 'vitest'
import { apiFetch } from '@/lib/api'

afterEach(() => vi.restoreAllMocks())

describe('apiFetch', () => {
  it('成功返回 JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ code: 0, data: { x: 1 }, msg: 'ok' }), { status: 200 }),
    ))
    const res = await apiFetch<{ code: number; data: { x: number }; msg: string }>('/api/x')
    expect(res.data?.x).toBe(1)
  })

  it('非 2xx 抛错', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('err', { status: 500 })))
    await expect(apiFetch('/api/x')).rejects.toThrow(/500/)
  })
})
