// app/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from './lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from './lib/auth'

// 輔助函數：檢查登入狀態並回傳 User ID
async function getUserId() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("未登入，無法執行動作")
  return session.user.id
}

export async function addWish(formData: FormData) {
  const userId = await getUserId()
  const description = formData.get('description') as string
  const category = formData.get('category') as string
  const link = formData.get('link') as string

  await prisma.wish.create({
    data: {
      description,
      category,
      link,
      userId, // 綁定資料畀當前使用者！
    },
  })
  revalidatePath('/')
}

// 刪除：保留限制，只可以刪除自己加嘅項目
export async function deleteWish(id: string) {
  const userId = await getUserId()
  await prisma.wish.delete({ where: { id, userId } })
  revalidatePath('/')
}

// 打卡：放寬權限，任何人都可以幫手打卡 (唔洗 match userId)
export async function markAsVisited(id: string) {
  await getUserId() // 確保有登入就得
  await prisma.wish.update({ where: { id }, data: { isVisited: true } })
  revalidatePath('/')
}

// 新增：更新評分功能
export async function updateRating(id: string, rating: number) {
  await getUserId() // 確保有登入先可以評分
  await prisma.wish.update({ 
    where: { id }, 
    data: { rating } 
  })
}

// 修改：復原為未去 (順便清空埋評分)
export async function unmarkAsVisited(id: string) {
  await getUserId()
  await prisma.wish.update({ 
    where: { id }, 
    data: { isVisited: false, rating: null } // rating 變返 null
  })
  revalidatePath('/')
}