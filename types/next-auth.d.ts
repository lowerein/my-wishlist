// types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  /**
   * 擴充 Session 介面，加入自訂嘅 id
   */
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }
}