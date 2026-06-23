# Next.js 开发规范（个人项目版）

> 个人项目精简版：去掉了公司的内部 registry、COS/CDN 上传、nginx 路径代理、Jenkins、SonarQube、CLS 日志采集等基础设施。保留所有跟"代码质量"相关的纪律。
> 默认部署形态：**单应用、根路径部署**（Vercel / Netlify / 自建单机）。如果你真要做路径前缀代理，再单独加 `basePath`，默认不碰。

---

## 1. 技术栈与版本

锁定大版本，避免被破坏性更新坑到。**升级大版本前先确认。**

| 包 | 版本策略 | 说明 |
|---|---|---|
| `node` | 锁 LTS（如 `22.x`）| 用 `.nvmrc` 固定，团队/多机一致 |
| `next` | 锁大版本 | App Router |
| `react` / `react-dom` | 跟随 next 要求，两者必须一致 | |
| `typescript` | `^5` | 必须开 `strict` |
| `tailwindcss` | `^4` | v4 与 v3 不兼容，注意 |
| `antd` / `@ant-design/icons` | 锁 v6，两者大版本一致 | React 复杂组件库；与 Tailwind 分工见 §6 |
| `prisma` / `@prisma/client` | 安装后精确锁定，两者完全一致 | ORM，可选 |

- 用 **公共 npm registry** 即可，无需内部源。装新包时告诉我装了什么、为什么、有没有更轻的替代。
- **依赖能少则少**：个人项目最容易被一堆"顺手装的"包拖垮。每个依赖都是维护负担。
- 锁文件（`package-lock.json` / `pnpm-lock.yaml`）必须提交 git。

---

## 2. 数据库（如果用）

> 默认假设 PostgreSQL + Prisma；个人小项目用 SQLite / Prisma 同样适用，换 `provider` 即可。Supabase / Neon 等托管库也走 Prisma。

- 写任何查询代码前，**先定义 Prisma schema**。
- 除非 Prisma 表达不了，否则不写原生 SQL。
- **已执行的 migration 文件不得删除或修改**，schema 变更一律新建 migration。
- 数据库连接串只走环境变量 `DATABASE_URL`，禁止硬编码。

---

## 3. 环境变量与配置

> ⚠️ **与公司内网规范最大的不同**：个人项目的 `.env` **绝不提交 git**。仓库可能公开，密钥泄露不可逆。

规则：

- `.env`、`.env.local`、`.env.*.local` 一律写进 `.gitignore`。
- 只提交 **`.env.example`**（占位值，无真实密钥），作为配置模板和文档。
- 服务端密钥（数据库串、第三方 API key、`SECRET`）**不加** `NEXT_PUBLIC_` 前缀，绝不能进客户端 bundle。
- 只有真正要暴露给浏览器的值才用 `NEXT_PUBLIC_`，并且默认它会被任何人看到。
- 禁止在源码里硬编码任何域名、密钥、接口地址，一律从 `process.env` 读。

```bash
# .env.example —— 提交 git，占位值
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
SESSION_SECRET="change-me"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# .env.local —— 不提交，放真实值
```

后端接口调用统一封装在 `src/lib/api.ts`，禁止在组件里到处拼 URL。**先分清两种场景**：

- **客户端组件 → 本站自己的 `/api` 路由**：用**相对路径**，不需要 `BASE_URL`。
- **服务端代码 → 外部 API / 独立后端服务**：才需要 base 地址，从 server-only 变量 `process.env.API_BASE_URL` 读，**绝不能加 `NEXT_PUBLIC_`**（否则会进客户端 bundle 泄露）。

两种场景共用同一个封装。CLAUDE.md 要求**所有网络请求必须有 timeout**，所以封装里默认带上超时，并能与调用方传入的取消信号合并：

```ts
const DEFAULT_TIMEOUT_MS = 10_000

// path 传相对地址(客户端调本站 /api)或绝对地址(服务端调外部服务)均可
export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = init ?? {}
  // 默认超时 + 调用方的 cancel 信号(组件卸载/路由切换)，任一触发即中断
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

> `AbortSignal.timeout` / `AbortSignal.any` 需 Node 18.17+ 与现代浏览器；锁定的 Node LTS 已满足。
> 服务端调外部服务时，先校验 `process.env.API_BASE_URL` 存在（**在请求处或启动时校验，不要在模块顶层 `throw`**，否则一 import 就炸、连测试都跑不了），拼好绝对地址再传给 `apiFetch`。

> 默认根路径部署，客户端直接 `apiFetch('/api/xxx')` 即可，不需要 `basePath`。
> **只有当你确实要把应用挂在 `/子路径` 下时**，才在 `next.config.ts` 配 `basePath` 并把请求统一加前缀。否则别引入这层复杂度。

### Mock 数据（前端先行）

后端没好时，前端**照统一响应 `{ code, data, msg }` 造假数据**，封装在数据层、用 env 开关切换。切真接口时只改数据源，组件零改动：

```ts
// src/lib/bills.ts
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === '1'

export async function getBills(): Promise<ApiResponse<Bill[]>> {
  if (USE_MOCK) return { code: 0, data: mockBills, msg: 'ok' }   // 形状与真接口完全一致
  return apiFetch<ApiResponse<Bill[]>>('/api/bills')
}
```

> mock 数据的字段名/枚举/嵌套结构**必须和真接口完全一致**，否则切接口时组件全要返工——等于给未来的自己埋坑。
> 页面仍按四态写（mock 也可以故意造 loading 延时 / 报错 / 空数组，验证 error 态和空状态）。

---

## 4. Git 工作流

个人项目用简单的分支模型即可：

- `main`：稳定分支，可部署。
- `feat/xxx`、`fix/xxx`：开发分支，做完合回 `main`。
- 一个人也建议走分支 + 自己 review 一遍 diff 再合，比直接怼 `main` 安全。
- **禁止自动 commit / push**：先暂存、给我看 diff、确认后再提交。
- **禁止 `push --force` / `reset --hard` / 改历史。**
- Commit message 用 Conventional Commits：
  ```
  feat: 新增用户登录页面
  fix: 修复移动端图片路径错误
  chore: 升级 prisma schema
  ```

部署：交给平台（Vercel/Netlify push 自动构建）或自建脚本，**不直接 SSH 操作线上**，不在代码里写部署逻辑。

---

## 5. 禁止操作清单（Next 特有）

> **通用禁令是单一来源，见 `CLAUDE.md`「需要确认才能做的事」**（删文件/目录、改三份规范文件、`git commit`/`push`/`reset --hard`/`push --force`/改历史、升级锁定依赖、把密钥写进会被 git 追踪的文件、未经确认调结构）。本节只列 Next/前端特有项，不重复通用项，避免多处 drift。

未经我明确确认，以下 Next 特有操作**禁止**：

- 删除或修改已执行的 Prisma migration（schema 变更一律新建 migration）
- 全局安装 npm 包（一律装本地）
- 未被要求时改动 `next.config.ts`、`tsconfig.json`、ESLint/CI 配置等基础设施文件

---

## 6. 代码生成规范

- 新建组件/工具前，先翻 `src/` 有没有能复用的。
- 遵循项目现有目录结构。
- 用户可见文字若项目用了 i18n（`next-intl` 等），就走 i18n，别硬编码；纯个人单语项目可直接写中文/英文，但同一处别中英混。
- **组件库 antd v6 + Tailwind 分工**：复杂交互组件（表单、表格、弹窗、日期选择、上传、消息提示等）用 **antd**；**布局、间距、栅格、响应式、视觉微调用 Tailwind**。不再引入第三种 UI 方案（MUI / Chakra 等）。
  - antd 自带的 CSS-in-JS 是该库实现细节，属许可例外；**业务代码本身不手写 CSS-in-JS**（styled-components / emotion 等一律不引入）。
  - 优先用 antd 组件的既有能力，别用 Tailwind 去硬覆盖 antd 内部样式（容易被版本升级打破）；确需定制走 antd `ConfigProvider` / `theme` token。
- 必须 TypeScript + `strict`，非必要不用 `any`。
- App Router 默认 **Server Components**，需要交互才加 `"use client"`。
- API 路由放 `src/app/api/`，遵循 App Router 约定。
- API 路由 / Server Actions 的对外响应**统一用 `CLAUDE.md`「接口与契约 → 统一响应结构」定义的 `{ code, data, msg }` 封装**（含错误响应），别每个接口各发明一套。前端解析逻辑只写一份。
- 开发端口默认 **3000**，`package.json`：
  ```json
  {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  }
  ```
  > `next lint` 自 Next 15.5 起已废弃（将在 Next 16 移除），官方迁移到直接用 ESLint CLI。新项目一律 `eslint .`，旧项目可跑 `npx @next/codemod next-lint-to-eslint-cli` 迁移。

---

## 7. 代码质量（替代 SonarQube）

个人项目用本地工具链兜底，无需 SonarQube CI：

- **ESLint**（`eslint .`，非废弃的 `next lint`）+ **Prettier**：保存即格式化，提交前过一遍。
- **`tsc --noEmit`**：类型检查作为提交前硬门槛，类型不过不准提交。
- 可选：装 **husky + lint-staged**，commit 前自动跑 lint + typecheck。
- 自检标准对齐 `CLAUDE.md` 的 DoD，不靠机器替你想清楚边界。

---

## 8. 日志

> 个人项目不接 CLS。默认输出到 **stdout**，由平台或 `pm2` / `docker logs` 收集即可。需要文件日志再加。

- 服务端用 `pino`：开发环境 `pino-pretty` 美化，生产环境输出单行 JSON 到 stdout。
- 日志实例统一从 `src/lib/logger.ts` 导入，禁止各模块自己 `new`。
- **客户端组件不写文件日志**，`console.*` 仅限开发环境：
  ```ts
  if (process.env.NODE_ENV === 'development') console.log('[Comp]', props)
  ```
- 禁止在客户端 import `pino`（Node-only，会炸 bundle）。

```ts
// src/lib/logger.ts
import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  base: { service: process.env.APP_NAME ?? 'app', env: process.env.NODE_ENV },
  transport: isDev ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
})

export default logger
// 用法：const log = logger.child({ module: 'api/auth' }); log.info({ userId }, 'login ok')
```

**敏感信息严禁进日志**：密码、明文 token、cookie、数据库串、API key、完整手机号/身份证。要调试只打脱敏值（`token.slice(0,8) + '...'`）。

---

## 9. 安全

### 9.1 密码
- **禁止明文存储**，用 `bcrypt` / `argon2` hash。
- 最短 8 位，且在「大写字母、小写字母、数字」三类中至少包含两类。
- 密码不得出现在日志、响应体、URL。

### 9.2 Secret 管理（与公司内网相反）
- 密钥**只放 gitignore 的 `.env`**，绝不提交 git，绝不硬编码进源码。
- 部署平台的环境变量功能（Vercel/Netlify env vars）是放生产密钥的正道。

### 9.3 HTTP 安全头
在 `next.config.ts` 配最基本的几条：
```ts
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
]
// next.config.ts: async headers() { return [{ source: '/(.*)', headers: securityHeaders }] }
```

### 9.4 输入校验
- API 路由 / Server Actions 入参**必须用 `zod` 校验**，失败返回 400。
- 禁止把用户输入直接透传给 DB 查询 / 文件操作 / 外部 API。
```ts
const schema = z.object({ email: z.string().email(), name: z.string().min(1).max(50) })
const parsed = schema.safeParse(await request.json())
if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })
```

### 9.5 依赖安全
- 偶尔跑 `npm audit`，出现 high/critical 漏洞优先修或换包。
- 个人项目无需 CI 强制，但养成习惯。

---

## 10. 给非技术用途 / 临时脚本的提醒

如果只是写个一次性脚本或纯本地工具：上面的"多用户权限校验""安全头"等可酌情跳过，但 **"不硬编码密钥""错误别静默吞""命名要有意义"** 这几条任何时候都不放松。判断标准：**这段代码会不会对外暴露、会不会被未来的我重用**——会，就按完整规范来。
