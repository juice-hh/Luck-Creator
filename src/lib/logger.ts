import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  base: { service: process.env.APP_NAME ?? 'luck-creator', env: process.env.NODE_ENV },
  transport: isDev ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
})

export default logger
// 用法：const log = logger.child({ module: 'api/health' }); log.info('ok')
