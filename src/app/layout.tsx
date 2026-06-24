import type { Metadata, Viewport } from 'next'
import Providers from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: '好运池',
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
      <body className="mx-auto min-h-dvh max-w-md bg-white text-neutral-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
