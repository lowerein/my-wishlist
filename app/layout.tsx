// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

// 👇 就係改呢度 👇
export const metadata: Metadata = {
  title: '⭐98 98 98 List⭐',
  description: '記錄低我想去食買玩嘅地方', // 你可以順便改埋個描述，對 SEO 有幫助
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
