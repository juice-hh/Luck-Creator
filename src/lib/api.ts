const DEFAULT_TIMEOUT_MS = 10_000

// path: 客户端调本站 /api 传相对地址；服务端调外部服务传绝对地址。
export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = init ?? {}
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  const mergedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal

  const res = await fetch(path, {
    ...rest,
    signal: mergedSignal,
    headers: { 'Content-Type': 'application/json', ...rest.headers },
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json() as Promise<T>
}
