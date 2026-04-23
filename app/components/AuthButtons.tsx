// app/components/AuthButtons.tsx
'use client'

import { signIn, signOut } from "next-auth/react"

export function LoginButton() {
  return (
    <button 
      onClick={() => signIn('google')} 
      className="bg-blue-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-700 transition shadow-lg"
    >
      用 Google 登入開始記錄
    </button>
  )
}

export function LogoutButton() {
  return (
    <button 
      onClick={() => signOut()} 
      className="text-sm text-gray-500 hover:text-red-600 border border-gray-300 hover:border-red-600 px-3 py-1 rounded transition"
    >
      登出
    </button>
  )
}