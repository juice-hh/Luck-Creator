# Python 开发规范（个人项目版）

> 个人项目精简版：去掉公司的阿里云内网镜像强制、Jenkins、SonarQube、CLS 日志、固定服务器日志路径等。保留所有代码质量纪律。
> 默认技术栈：Flask + SQLAlchemy 2.x + Alembic + Pydantic 2.x。换成 FastAPI / SQLite 时，结构和原则照搬，只换具体 API。

---

## 1. 技术栈与版本

锁大版本，升级前确认。

| 包 | 版本策略 |
|---|---|
| `python` | 锁定（如 `3.12`），用 `.python-version` 固定 |
| `flask` | `^3.x` |
| `sqlalchemy` | `^2.0`（v2 与 v1 不兼容，用 2.x 风格 API） |
| `alembic` | `^1.x` |
| `pydantic` | `^2.x`（v2 与 v1 不兼容） |
| `structlog` | `^24.x`（或直接用标准库 logging，见 §10） |
| `gunicorn` | `^22.x`（生产用） |

- 用 **公共 PyPI** 即可，无需内网镜像。在国内嫌慢可临时加 `-i https://mirrors.aliyun.com/pypi/simple/`，但不写死进项目作为强制。
- 装新包先说装什么、为什么、有无更轻替代。**依赖能少则少。**
- 用虚拟环境（`venv` / `uv` / `poetry`），依赖锁进 `requirements.txt` 或 `pyproject.toml` + lock 文件并提交 git。

---

## 2. 项目结构

```
project-name/
├── app/
│   ├── __init__.py        # Flask app factory (create_app)
│   ├── config.py          # 配置类，从环境变量读取
│   ├── models/            # SQLAlchemy ORM 模型
│   ├── routes/            # Flask Blueprint 路由（只做请求/响应，不写业务）
│   ├── services/          # 业务逻辑层
│   ├── schemas/           # Pydantic 请求/响应 schema
│   └── lib/
│       ├── db.py          # SQLAlchemy session 管理
│       └── logger.py      # 日志实例
├── migrations/            # Alembic 迁移（已执行的不许改）
├── tests/
├── .env.example           # 提交 git（占位值）
├── .gitignore             # 必须忽略 .env / .env.local
├── requirements.txt       # 或 pyproject.toml
└── gunicorn.conf.py       # 生产配置（用 gunicorn 时）
```

- **业务逻辑必须放 `services/`**，不要写在路由里。
- **所有查询走 SQLAlchemy**，不在 `models/` 外拼裸 SQL。

---

## 3. 数据库

> PostgreSQL + SQLAlchemy 2.x + Alembic；个人小项目用 SQLite 同样适用，换连接串即可。

- 写查询前先定义 SQLAlchemy Model。
- 除非 ORM 表达不了，否则不写裸 SQL。
- **已执行的 Alembic migration 不得删改**，schema 变更一律新建 migration，禁止直接动数据库。
- 用 2.x 风格（`select()` / `session.scalars()`），不用 1.x 的 `Query` API。
- 写操作的 session 必须**成功 commit / 失败 rollback / 最后 close**，禁止只 close 不 rollback（脏数据残留）。Flask 没有 FastAPI 那种依赖注入，**不要把 session 写成 `yield` generator**（Flask 不会自动消费它，你会拿到生成器对象而非 session）——用 `with` 上下文管理器。

```python
# app/lib/db.py
from contextlib import contextmanager
from collections.abc import Iterator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session

class Base(DeclarativeBase):
    pass

# 引擎/Session 工厂在 create_app() 里通过 init_engine() 初始化，
# 不在模块顶层读 os.environ["DATABASE_URL"]——否则一 import 就强制要求配好环境变量，连单测都跑不起来。
_SessionLocal: sessionmaker | None = None

def init_engine(database_url: str) -> None:
    global _SessionLocal
    engine = create_engine(database_url, pool_pre_ping=True)
    _SessionLocal = sessionmaker(bind=engine)

@contextmanager
def session_scope() -> Iterator[Session]:
    """Flask 用法：with session_scope() as db: ...
    正常 commit、异常自动 rollback、最后必 close。"""
    if _SessionLocal is None:
        raise RuntimeError("DB 未初始化：请在 create_app() 中先调用 init_engine()")
    db = _SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()                 # 写失败回滚，禁止静默吞错
        raise
    finally:
        db.close()
```

---

## 4. 环境变量与配置

> ⚠️ **与公司内网规范最大的不同**：个人项目 `.env` **绝不提交 git**。仓库可能公开，密钥泄露不可逆。

- `.env` / `.env.local` 写进 `.gitignore`，只提交 `.env.example`（占位值）。
- 禁止在源码硬编码域名、密钥、连接串，一律从环境变量读。
- 关键变量（`SECRET_KEY`、`DATABASE_URL`）**禁止设默认 fallback**，缺失直接报错，避免漏配上线。
- 校验放在**实例化时**，不要写成类体里的模块级赋值——否则一 `import app.config` 就触发校验，没配 env 时连单测/静态检查都跑不了。在 `create_app()` 里 `Config()` 实例化、`init_engine(cfg.DATABASE_URL)`。

```python
# app/config.py
import os

class Config:
    def __init__(self) -> None:
        self.FLASK_ENV = os.environ.get("FLASK_ENV", "development")
        self.SECRET_KEY = self._required("SECRET_KEY")
        self.DATABASE_URL = self._required("DATABASE_URL")
        self.LOG_LEVEL = os.environ.get("LOG_LEVEL", "info")
        self.APP_NAME = os.environ.get("APP_NAME", "app")
        self.PORT = int(os.environ.get("PORT", "5000"))

    @staticmethod
    def _required(name: str) -> str:
        val = os.environ.get(name)
        if not val:
            raise RuntimeError(f"环境变量 {name} 未设置，请在 .env 中配置")
        return val

# create_app() 内：cfg = Config(); init_engine(cfg.DATABASE_URL)
# import 本模块本身不触发校验。
```

```bash
# .env.example —— 提交 git
FLASK_ENV=development
SECRET_KEY=change-me
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
LOG_LEVEL=info
PORT=5000
```

---

## 5. 接口规范

- 所有接口返回 **JSON**（错误响应也是 JSON），不返回纯文本/HTML。
- **统一响应结构以 `CLAUDE.md`「接口与契约 → 统一响应结构」为单一来源**（`{ code, data, msg }`，HTTP 码与业务码并存）。本节不再重复定义，改契约只改 CLAUDE.md，前后端同步。
- 入参**必须用 Pydantic 校验**，失败返回 400。
- 禁止把用户输入直接透传给 DB / 外部服务。

```python
from pydantic import BaseModel, EmailStr

class CreateUserSchema(BaseModel):
    email: EmailStr
    name: str

@bp.post("/users")
def create_user():
    body = CreateUserSchema.model_validate(request.get_json())  # 已校验，安全
    ...
```

---

## 6. Git 工作流

- `main`：稳定可部署。`feat/xxx`、`fix/xxx`：开发分支。
- **禁止自动 commit / push**：先暂存、给我看 diff、确认后提交。
- **禁止 `push --force` / `reset --hard` / 改历史。**
- Conventional Commits：`feat:` / `fix:` / `chore:`。
- 不直接 SSH 操作线上，部署交给平台或自建脚本。

---

## 7. 禁止操作清单（Python 特有）

> **通用禁令是单一来源，见 `CLAUDE.md`「需要确认才能做的事」**（删文件/目录、改三份规范文件、`git commit`/`push`/`reset --hard`/`push --force`/改历史、升级锁定依赖、把密钥写进会被 git 追踪的文件、未经确认调结构）。本节只列 Python 特有项，不重复通用项，避免多处 drift。

未经确认，以下 Python 特有操作**禁止**：

- 删除或修改已执行的 Alembic migration（schema 变更一律新建 migration）
- 直接改数据库结构（必须走 Alembic）
- 全局安装 pip 包（一律装进虚拟环境）

---

## 8. 代码生成规范

- 新建模块/工具前先翻 `app/` 有没有可复用的。
- 遵循现有目录结构，不在 `app/` 外乱建业务目录。
- **类型注解必填**：所有函数参数和返回值都要标类型。
- 所有 Blueprint 在 `create_app()` 里统一注册，不在模块级直接挂路由。
- 开发端口默认 **5000**：
  ```bash
  flask run --port 5000                          # 本地开发
  gunicorn -c gunicorn.conf.py "app:create_app()"  # 生产
  ```

---

## 9. 代码质量（替代 SonarQube）

个人项目用本地工具链：

- **Ruff**：lint + format 二合一，又快又全，提交前跑一遍（`ruff check . && ruff format .`）。
- **mypy**：静态类型检查，作为提交前门槛。
- 可选：**pre-commit** 钩子自动跑 ruff + mypy。
- 标准对齐 `CLAUDE.md` 的 DoD。

---

## 10. 日志

> 个人项目不接 CLS、不写死服务器路径。默认输出 **stdout**，由平台 / `docker logs` / `gunicorn` 收集。需要文件日志时用标准库 `RotatingFileHandler`，路径从环境变量读，别写死 `/home/admin/...`。

- 统一从 `app/lib/logger.py` 导入，禁止业务代码直接 `print()` 或裸 `logging.info()`。
- 每条日志单行 JSON（用 `structlog`）或可读文本（开发期）。
- 必填字段：`timestamp`(ISO8601 含时区) / `level` / `service` / `module` / `event`。

```python
# app/lib/logger.py —— 最小可用版
import logging, os, sys, structlog

def configure_logging(service: str) -> None:
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=os.environ.get("LOG_LEVEL", "info").upper(),
    )
    structlog.configure(
        processors=[
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        logger_factory=structlog.PrintLoggerFactory(),
    )

logger = structlog.get_logger()
# 用法：log = logger.bind(module="routes.auth"); log.info("login_ok", user_id="u_1")
```

**敏感信息严禁进日志**：密码、明文 token、cookie、数据库串、API key、完整手机号/身份证。调试只打脱敏值（`token[:8] + "..."`）。

| 级别 | 何时用 |
|---|---|
| `debug` | 仅开发；中间状态、变量值 |
| `info` | 正常业务事件 |
| `warning` | 可恢复异常：重试、降级、慢查询(>500ms) |
| `error` | 需人工介入：未处理异常、外部服务不可用 |

---

## 11. 安全

### 11.1 密码
- 禁止明文存储，用 `bcrypt` hash。最短 8 位，且在「大写字母、小写字母、数字」三类中至少包含两类。
- 密码不进日志、响应体、URL。

### 11.2 SQL 注入
- 一律 SQLAlchemy ORM 或参数化查询，**禁止拼 SQL 字符串**。
```python
# 正确
stmt = select(User).where(User.email == email)
# 错误
stmt = text(f"SELECT * FROM users WHERE email = '{email}'")
```

### 11.3 输入校验
- 入参必须 Pydantic 校验，失败返回 400。
- 不把用户输入直接透传给 DB / 文件 / 外部 API。

### 11.4 Secret 管理（与公司内网相反）
- 密钥只放 gitignore 的 `.env`，绝不提交 git，绝不硬编码。
- 生产环境用平台的环境变量功能注入。

### 11.5 依赖安全
- 偶尔跑 `pip-audit`，出现高危漏洞优先修或换包。
```bash
pip install pip-audit
pip-audit
```

---

## 12. 一次性脚本的提醒

纯本地一次性脚本：多用户权限、统一响应结构等可酌情跳过，但 **"不硬编码密钥""错误别静默吞""类型注解""命名有意义"** 任何时候不放松。判断标准：**会不会对外暴露、会不会被未来的我重用**——会，就按完整规范来。
