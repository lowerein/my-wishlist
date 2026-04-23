// app/components/ThemeToggle.tsx
'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  // 確保喺 Client-side 先 render，防止報錯
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div className="w-8 h-8"></div> // 佔位符

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 transition"
      title="切換深淺色模式"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}