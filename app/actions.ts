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

// 1. 新增項目
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
      userId,
    },
  })
  revalidatePath('/')
}

// 2. 刪除項目 (只准刪除自己建立嘅)
export async function deleteWish(id: string) {
  const userId = await getUserId()
  await prisma.wish.delete({ where: { id, userId } })
  revalidatePath('/')
}

// 3. 打卡 (標記為已去)
export async function markAsVisited(id: string) {
  await getUserId() // 確保有登入就可以打卡
  await prisma.wish.update({ 
    where: { id }, 
    data: { isVisited: true } 
  })
  revalidatePath('/')
}

// 4. 復原 (標記為未去，並清空所有人對呢個項目嘅評分)
export async function unmarkAsVisited(id: string) {
  await getUserId() // 確保有登入就可以復原
  
  await prisma.wish.update({ 
    where: { id }, 
    data: { isVisited: false } 
  })
  
  // 刪除呢個項目嘅所有評分紀錄
  await prisma.rating.deleteMany({ 
    where: { wishId: id } 
  })
  
  revalidatePath('/')
}

// 5. 更新評分同短評
export async function updateRating(wishId: string, score: number, comment?: string) {
  const userId = await getUserId()
  
  await prisma.rating.upsert({
    where: {
      wishId_userId: { wishId, userId },
    },
    update: { 
      score, 
      comment: comment || null // 用 || null 防止 undefined 引發 Prisma 型別報錯
    },
    create: { 
      wishId, 
      userId, 
      score, 
      comment: comment || null 
    },
  })
  
  revalidatePath('/')
}