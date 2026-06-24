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
