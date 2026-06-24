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
