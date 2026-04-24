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
  const isPrivate = formData.get('isPrivate') === 'on' // <--- 讀取 Checkbox

  await prisma.wish.create({
    data: {
      description,
      category,
      link,
      isPrivate, // <--- 寫入 Database
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

export async function togglePrivacy(id: string) {
  const userId = await getUserId()
  
  // 先搵出呢個 Item
  const wish = await prisma.wish.findUnique({ where: { id } })
  if (!wish) throw new Error("搵唔到呢個項目")
  if (wish.userId !== userId) throw new Error("你無權限修改呢個項目") // 保安檢查
  
  await prisma.wish.update({
    where: { id },
    data: { isPrivate: !wish.isPrivate } // 反轉狀態
  })
  
  revalidatePath('/')
}

// --- 輔助函數：檢查 Admin 權限 (結合 DB 同 ENV) ---
async function verifyAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("未登入")
  
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
  
  // 如果 DB 寫咗係 Admin，或者 Email 喺 .env 名單入面，就當係 Admin
  const isAdmin = user?.isAdmin || (session.user.email && adminEmails.includes(session.user.email))
  
  if (!isAdmin) throw new Error("權限不足")
  return true
}

// 1. 更新系統設定 (標題 & 類別)
export async function updateSystemConfig(siteTitle: string, browserTitle: string, categories: string) {
  await verifyAdmin()

  await prisma.systemConfig.upsert({
    where: { id: 1 },
    update: { siteTitle, browserTitle, categories },
    create: { id: 1, siteTitle, browserTitle, categories }
  })
  revalidatePath('/')
  revalidatePath('/admin')
}

// 2. 切換用戶權限 (允許/禁止進入)
export async function toggleUserAccess(targetUserId: string) {
  await verifyAdmin()

  const target = await prisma.user.findUnique({ where: { id: targetUserId } })
  await prisma.user.update({
    where: { id: targetUserId },
    data: { isAllowed: !target?.isAllowed }
  })
  revalidatePath('/admin')
}

// 3. 提升/降職 Admin
export async function toggleAdminStatus(targetUserId: string) {
  await verifyAdmin()

  const target = await prisma.user.findUnique({ where: { id: targetUserId } })
  await prisma.user.update({
    where: { id: targetUserId },
    data: { isAdmin: !target?.isAdmin }
  })
  revalidatePath('/admin')
}