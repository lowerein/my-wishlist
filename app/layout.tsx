// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from './components/ThemeProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '⭐玉桂狗與姆明的98 List (CM98)⭐', // <--- 改咗呢度
  description: '記錄低我想去食買玩嘅地方',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // suppressHydrationWarning 係 next-themes 官方要求加嘅，防止 React 報錯
    <html lang="en" suppressHydrationWarning> 
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-950 text-black dark:text-gray-100 transition-colors duration-300`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}