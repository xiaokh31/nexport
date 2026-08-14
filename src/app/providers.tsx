// app/providers.tsx
'use client' // 必须添加此指令

import { SessionProvider } from 'next-auth/react'

export default function Providers({ 
  children, 
  session 
}: { 
  children: React.ReactNode
  session?: any // 可根据你的认证类型进行更严格的类型定义
}) {
  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  )
}