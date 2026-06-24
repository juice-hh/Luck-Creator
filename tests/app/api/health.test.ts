// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: { $queryRaw: vi.fn(async () => []) },
}))

import { GET } from '@/app/api/health/route'

describe('GET /api/health', () => {
  it('返回统一响应且 db=ok', async () => {
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.code).toBe(0)
    expect(body.data.db).toBe('ok')
  })
})
