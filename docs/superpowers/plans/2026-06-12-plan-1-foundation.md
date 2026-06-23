# 计划 1：项目地基 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭起一个能跑起来的 Next.js H5 应用地基：脚手架 + 工具链 + 数据层 + 统一响应契约 + 健康检查 + 移动端壳，为后续功能计划打底。

**Architecture:** Next.js App Router（默认 Server Components）+ TypeScript strict。数据层用 Prisma + SQLite（后续可换 provider）。对外响应一律走统一 `{ code, data, msg }` 封装。日志走 pino。测试用 Vitest。本计划不含任何业务玩法，只产出"可构建、类型通过、lint 通过、健康检查端到端跑通"的地基。

**Tech Stack:** Next.js(App Router) · TypeScript strict · Tailwind v4 · antd v6 · Prisma + SQLite · zod · pino · Vitest

**对应规范：** 严格遵循同仓 `next开发规范.md` 与 `CLAUDE.md`。所有对外 JSON 走统一响应；密钥只进 gitignore 的 `.env`；禁止自动 commit/push（每个 Commit 步骤都需用户先看 diff 再确认）。

---

## 新增依赖说明（动手前需用户确认）

| 依赖 | 用途 | 为什么需要 / 更轻替代 |
|---|---|---|
| `vitest` + `@vitejs/plugin-react` | 单元/集成测试 | 全局规范要求 TDD + 测试；Vitest 是 TS 原生、配置最少的轻量选择，比 Jest 更轻。这是 TDD 纪律的必需基建。 |
| `prisma` / `@prisma/client` | ORM（SQLite） | 规范指定 ORM；SQLite 零运维，适合起步。**两者版本必须完全一致，安装后在 package.json 精确锁定（去掉 `^`）**（规范 §1） |
| `zod` | 入参校验 | 规范 §9.4 强制 |
| `pino` / `pino-pretty` | 日志 | 规范 §8 指定 |
| `antd` v6 / `@ant-design/icons` | 复杂交互组件 | 规范 §6 指定 |

> ⚠️ 执行到 Task 1/2/7 安装依赖前，按 `CLAUDE.md` 需先得到用户确认。

---

## File Structure（本计划创建/涉及的文件）

```
.nvmrc                          # 锁 Node LTS
.gitignore                      # 忽略 .env*、node_modules、prisma dev.db 等
.env.example                    # 配置模板（占位值，提交 git）
package.json                    # scripts: dev/build/start/lint/typecheck/test
vitest.config.ts                # 测试配置
prisma/schema.prisma            # 数据模型（首版仅 User 锚定身份）
src/app/layout.tsx              # 根布局：移动端 viewport + antd ConfigProvider
src/app/page.tsx                # 占位首页（证明壳能渲染）
src/app/api/health/route.ts     # 健康检查：返回统一响应 + DB ping
src/lib/response.ts             # 统一响应 {code,data,msg} 封装 + 业务码
src/lib/api.ts                  # apiFetch（带超时+取消信号）
src/lib/logger.ts               # pino logger 单例
src/lib/prisma.ts               # PrismaClient 单例
src/types/api.ts                # ApiResponse<T> 类型（前后端共享契约）
tests/lib/response.test.ts
tests/lib/api.test.ts
tests/app/api/health.test.ts
```

每个 `src/lib/*` 文件单一职责、可独立测试；契约类型集中在 `src/types/`，前后端共享，避免字段漂移。

---

## Task 1: 初始化 Next.js 项目 + git

**Files:** 整个项目骨架（由 create-next-app 生成）、`.nvmrc`

- [ ] **Step 1: 初始化 Next 项目（App Router + TS + Tailwind + src 目录）**

> ⚠️ **此步为交互式、需人工执行**（不可交给自动 subagent）：当前目录非空（已有 `CLAUDE.md`、`docs/` 等），`create-next-app .` 会**交互式询问是否在非空目录继续**，自动执行会卡在 stdin 等待。请由人手动跑并确认。

在项目根目录执行：

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --eslint --import-alias "@/*"
```

- 遇到"目录非空 / 是否继续"提示，选 **Yes**；其余选项按上面 flag 已指定，若仍交互式询问则接受默认。
- **保留**已有的 `*.md` 规范文件与 `docs/` 目录（不要让脚手架覆盖）。
- Turbopack 开关用 create-next-app 的**默认值即可**（不同版本 flag 名不一，别纠结），不影响地基。

- [ ] **Step 2: 锁定 Node 版本**

创建 `.nvmrc`：

```
22
```

- [ ] **Step 3: 确认 TS strict 已开**

检查 `tsconfig.json` 中 `"strict": true`（create-next-app 默认开启）。若未开，手动设为 true。

- [ ] **Step 4: 初始化 git 并验证可构建**

```bash
git init
npm run build
```

Expected: 构建成功，无类型/lint 报错。

- [ ] **Step 5: Commit（需用户先看 diff 确认）**

```bash
git add -A
git commit -m "chore: 初始化 Next.js 项目脚手架"
```

---

## Task 2: 工具链与脚本

**Files:** `package.json`、`vitest.config.ts`

- [ ] **Step 1: 安装测试依赖（需用户确认）**

```bash
npm i -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: 配置 Vitest**

创建 `vitest.config.ts`：

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

- [ ] **Step 3: 补齐 package.json scripts**

确保 `package.json` 的 `scripts` 含（`lint` 用非废弃的 ESLint CLI）：

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 4: 加一个冒烟测试验证 Vitest 跑通**

创建 `tests/smoke.test.ts`：

```ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: 运行测试**

Run: `npm test`
Expected: 1 passed。

- [ ] **Step 6: Commit（需用户确认）**

```bash
git add -A
git commit -m "chore: 接入 Vitest 测试工具链与脚本"
```

---

## Task 3: 环境变量与 gitignore

**Files:** `.gitignore`、`.env.example`

- [ ] **Step 1: 确认 .gitignore 忽略敏感与本地文件**

> ⚠️ **高频翻车点**：create-next-app 默认 `.gitignore` 通常含通配 `.env*`，会**误伤 `.env.example`**，导致 Step 5 `git add .env.example` 加不进去。务必加 `!.env.example` 例外。

确保 `.gitignore` 含以下条目（补齐缺的，例外行放在 env 段之后）：

```
# env（忽略真实密钥，但放行模板）
.env
.env.local
.env.*.local
!.env.example

# prisma sqlite
prisma/dev.db
prisma/dev.db-journal
```

- [ ] **Step 1.5: 验证 .env.example 未被忽略**

Run: `git check-ignore .env.example || echo "OK: .env.example 可被提交"`
Expected: 输出 `OK: .env.example 可被提交`

- [ ] **Step 2: 创建 .env.example（占位值，提交 git）**

创建 `.env.example`：

```bash
# 数据库（SQLite，本地文件）
DATABASE_URL="file:./dev.db"
# 站点地址（客户端可见）
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
# 日志级别
LOG_LEVEL="debug"
APP_NAME="haoyun"
```

- [ ] **Step 3: 本地创建 .env.local（不提交）**

```bash
cp .env.example .env.local
```

- [ ] **Step 4: 验证 .env.local 不会被追踪**

Run: `git status --porcelain | grep -E "\.env\.local" || echo "OK: .env.local 未被追踪"`
Expected: 输出 `OK: .env.local 未被追踪`

- [ ] **Step 5: Commit（需用户确认）**

```bash
git add .gitignore .env.example
git commit -m "chore: 配置环境变量模板与 gitignore"
```

---

## Task 4: 统一响应契约（TDD）

**Files:**
- Create: `src/types/api.ts`、`src/lib/response.ts`
- Test: `tests/lib/response.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `tests/lib/response.test.ts`：

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/lib/response.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 写类型契约**

创建 `src/types/api.ts`：

```ts
// 前后端共享的统一响应契约。改契约只改这里。
export interface ApiResponse<T> {
  code: number
  data: T | null
  msg: string
}
```

- [ ] **Step 4: 写最小实现**

创建 `src/lib/response.ts`：

```ts
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
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npx vitest run tests/lib/response.test.ts`
Expected: PASS（3 个用例）

- [ ] **Step 6: Commit（需用户确认）**

```bash
git add src/types/api.ts src/lib/response.ts tests/lib/response.test.ts
git commit -m "feat: 统一响应契约 {code,data,msg} 与业务码"
```

---

## Task 5: apiFetch 封装（TDD）

**Files:**
- Create: `src/lib/api.ts`
- Test: `tests/lib/api.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `tests/lib/api.test.ts`：

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/lib/api.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 写实现（含默认超时 + 取消信号合并，照规范 §3）**

创建 `src/lib/api.ts`：

```ts
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/lib/api.test.ts`
Expected: PASS（2 个用例）

- [ ] **Step 5: Commit（需用户确认）**

```bash
git add src/lib/api.ts tests/lib/api.test.ts
git commit -m "feat: apiFetch 封装（默认超时 + 取消信号合并）"
```

---

## Task 6: logger（pino 单例）

**Files:** `src/lib/logger.ts`

- [ ] **Step 1: 安装 pino（需用户确认）**

```bash
npm i pino && npm i -D pino-pretty
```

- [ ] **Step 2: 写 logger 单例（照规范 §8）**

创建 `src/lib/logger.ts`：

```ts
import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  base: { service: process.env.APP_NAME ?? 'haoyun', env: process.env.NODE_ENV },
  transport: isDev ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
})

export default logger
// 用法：const log = logger.child({ module: 'api/health' }); log.info('ok')
```

- [ ] **Step 3: 验证类型通过**

Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 4: Commit（需用户确认）**

```bash
git add src/lib/logger.ts package.json package-lock.json
git commit -m "feat: pino logger 单例"
```

---

## Task 7: Prisma + SQLite 数据层

**Files:** `prisma/schema.prisma`、`src/lib/prisma.ts`

- [ ] **Step 1: 安装 Prisma（需用户确认）**

```bash
npm i -D prisma && npm i @prisma/client
npx prisma init --datasource-provider sqlite
```

装好后**在 `package.json` 把 `prisma` 与 `@prisma/client` 改成精确版本（去掉 `^`，两者一致）**，并提交 lock 文件（规范 §1）。

> ⚠️ `prisma init` 会自动生成一个 `.env` 并写入 `DATABASE_URL`。**Prisma CLI（`migrate dev` 等）只读 `.env`，不读 `.env.local`**——所以这个 `.env` 必须保留（它已被 Task 3 的 gitignore 忽略，不会进 git）。别手动删它，否则 Step 3 的 `migrate dev` 取不到 `DATABASE_URL`。Next 运行时仍从 `.env.local` 读其余变量，两者并存不冲突。

- [ ] **Step 2: 定义首版 schema（仅 User，锚定匿名身份；身份逻辑在计划 2）**

> ⚠️ **关键**：Prisma v6 的 `init` 可能给 generator 生成自定义 `output`（如 `../generated/prisma`），那样 client 就**不再从 `@prisma/client` 导出**，Task 7 Step 4 的 `import { PrismaClient } from '@prisma/client'` 会报"找不到 PrismaClient"。务必确认 generator 块为**默认输出**（无 `output` 行）：

```prisma
generator client {
  provider = "prisma-client-js"
  // 不要有 output = ...；保持默认输出到 node_modules/@prisma/client
}
```

确认 datasource 为 sqlite：

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

定义首版 model：

```prisma
// 匿名身份锚点。首版仅占位 + 证明数据层连通；发放 token 的逻辑见计划 2。
model User {
  id        String   @id @default(cuid())
  anonId    String   @unique          // 匿名标识（cookie 携带）
  createdAt DateTime @default(now())
}
```

- [ ] **Step 3: 生成首个 migration**

```bash
npx prisma migrate dev --name init_user
```

Expected: 生成 `prisma/migrations/*_init_user/`，dev.db 创建成功。

- [ ] **Step 4: 写 PrismaClient 单例（避免开发热重载泄漏连接）**

创建 `src/lib/prisma.ts`：

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
```

- [ ] **Step 5: 验证类型与构建**

Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 6: Commit（需用户确认）**

```bash
git add prisma src/lib/prisma.ts package.json package-lock.json
git commit -m "feat: 接入 Prisma + SQLite，首个 User migration"
```

---

## Task 8: 健康检查 API 路由（TDD，端到端验证地基）

**Files:**
- Create: `src/app/api/health/route.ts`
- Test: `tests/app/api/health.test.ts`

- [ ] **Step 1: 写失败测试（直接调用路由 handler）**

创建 `tests/app/api/health.test.ts`：

> ⚠️ **关键**：API route handler 依赖 `next/server`（Web 标准 `Request`/`Response`），在 jsdom 环境会报 `Request is not defined` 等错。**必须用 node 环境**——靠文件首行的 docblock `// @vitest-environment node` 指定（Vitest 按文件覆盖全局 jsdom）。后续所有 `tests/app/api/**` 测试都要带这行。

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/app/api/health.test.ts`
Expected: FAIL（路由不存在）

- [ ] **Step 3: 写实现（统一响应 + DB ping + 错误分层，不静默吞错）**

创建 `src/app/api/health/route.ts`：

```ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { ok, fail, BizCode } from '@/lib/response'
import logger from '@/lib/logger'

const log = logger.child({ module: 'api/health' })

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json(ok({ db: 'ok' }), { status: 200 })
  } catch (err) {
    log.error({ err }, 'health check db failed')
    return NextResponse.json(fail(BizCode.INTERNAL, '服务暂时不可用'), { status: 500 })
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/app/api/health.test.ts`
Expected: PASS

- [ ] **Step 5: 端到端手动验证**

```bash
npm run dev
# 另开终端：
curl -s http://localhost:3000/api/health
```

Expected: `{"code":0,"data":{"db":"ok"},"msg":"ok"}`

- [ ] **Step 6: Commit（需用户确认）**

```bash
git add src/app/api/health/route.ts tests/app/api/health.test.ts
git commit -m "feat: 健康检查 /api/health（统一响应 + DB ping）"
```

---

## Task 9: 移动端布局壳

**Files:** `src/app/layout.tsx`、`src/app/providers.tsx`、`src/app/page.tsx`

- [ ] **Step 1: 安装 antd + App Router SSR 样式 registry（需用户确认）**

```bash
npm i antd @ant-design/icons @ant-design/nextjs-registry
```

> `@ant-design/nextjs-registry` 是 antd 官方的 App Router 适配：用 `useServerInsertedHTML` 在 SSR 时注入 antd 的 CSS-in-JS 样式，**避免首屏样式闪烁（FOUC）**。不接它，Step 5 验证时会看到样式错乱，工程师会误以为是 bug。

- [ ] **Step 2: 写客户端 Providers（`'use client'`，这是 App Router + antd 的标准写法，不是 fallback）**

`ConfigProvider` 是客户端上下文，**不能直接放进 Server Component 的 layout**。创建 `src/app/providers.tsx`：

```tsx
'use client'

import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { AntdRegistry } from '@ant-design/nextjs-registry'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistry>
      <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#d4380d' } }}>
        {children}
      </ConfigProvider>
    </AntdRegistry>
  )
}
```

- [ ] **Step 3: 写根布局（Server Component，移动端 viewport + 引入 Providers）**

覆写 `src/app/layout.tsx`：

```tsx
import type { Metadata, Viewport } from 'next'
import Providers from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: '好运众筹',
  description: '攒好运、积福气的小天地',
}

// 移动端 H5：禁止缩放、贴合设备宽度
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="mx-auto min-h-dvh max-w-md bg-white text-neutral-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: 写占位首页（证明壳能渲染 + 移动端居中）**

覆写 `src/app/page.tsx`：

```tsx
export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-bold">🧧 好运众筹</h1>
      <p className="text-neutral-500">地基已就绪，玩法即将上线</p>
    </main>
  )
}
```

- [ ] **Step 5: 构建 + lint + 类型三关全过**

Run: `npm run build && npm run lint && npm run typecheck`
Expected: 全部通过，无报错。

- [ ] **Step 6: 手动验证移动端渲染 + 无兼容警告**

```bash
npm run dev
```

浏览器开 `http://localhost:3000`，用移动端模拟（宽 ~390px）确认：
- 内容居中、最大宽度受限、首页文案显示、**无样式闪烁**；
- **打开浏览器 Console，确认无 antd / React 19 兼容性警告**（antd v6 + create-next-app 默认的 React 19 组合若有不兼容会在此报警）。若出现 React 19 兼容警告，按 antd 官方文档接入对应 patch 后再继续。

- [ ] **Step 7: Commit（需用户确认）**

```bash
git add src/app/layout.tsx src/app/providers.tsx src/app/page.tsx package.json package-lock.json
git commit -m "feat: 移动端布局壳（viewport + antd Providers + SSR 样式 registry + 占位首页）"
```

---

## 计划 1 完成判据（DoD）

- [ ] `npm run build` / `npm run lint` / `npm run typecheck` / `npm test` 四关全过。
- [ ] `curl /api/health` 返回 `{code:0,data:{db:"ok"},msg:"ok"}`。
- [ ] `.env.local` 未被 git 追踪；仓库中无任何真实密钥。
- [ ] 移动端首页正常渲染、内容居中限宽。
- [ ] 统一响应、apiFetch、logger、prisma 单例均有对应测试或被健康检查覆盖。
- [ ] 每个 Commit 前均经用户看过 diff 确认（无自动提交）。

## 顺带提示（不在本计划动手）

- 业务数据模型（心愿 / 双货币好运·积福 / 福气卡）将在计划 2+ 按"新建 migration"逐步加入，不在地基期预建。
- 微信授权绑定、广场、分享物料等均为后续计划范围。
