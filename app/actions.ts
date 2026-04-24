// app/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from './lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from './lib/auth'
import { redirect } from 'next/navigation' // 記得 import redirect

// 輔助函數：檢查登入狀態並回傳 User ID
async function getUserId() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("未登入，無法執行動作")
  return session.user.id
}

// app/actions.ts

// 1. 修改 addWish (加入 listId 讀取)
export async function addWish(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("未登入")

  const description = formData.get('description') as string
  const category = formData.get('category') as string
  const link = formData.get('link') as string
  const isPrivate = formData.get('isPrivate') === 'on'
  const listId = formData.get('listId') as string // <--- 新增：讀取隱藏嘅 listId

  await prisma.wish.create({
    data: {
      description,
      category,
      link,
      isPrivate,
      userId: session.user.id,
      listId, // <--- 寫入資料庫
    },
  })
  revalidatePath(`/list/${listId}`) // <--- 刷新當前 List 頁面
}

// 2. 全新功能：建立新清單 (Create List)
export async function createList(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("未登入")

  const title = formData.get('title') as string
  const description = formData.get('description') as string

  // 建立新清單
  const newList = await prisma.list.create({
    data: {
      title,
      description,
      ownerId: session.user.id,
      // 自動將自己加埋入 members 名單
      members: {
        connect: { id: session.user.id }
      }
    }
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
// app/actions.ts入面嘅 updateSystemConfig 函數
export async function updateSystemConfig(siteTitle: string, browserTitle: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) throw new Error("未登入")

  // 檢查權限
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } })
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
  const isAdmin = dbUser?.isAdmin || adminEmails.includes(session.user.email)

  if (!isAdmin) throw new Error("權限不足")

  await prisma.systemConfig.upsert({
    where: { id: 1 },
    update: { siteTitle, browserTitle },
    create: { id: 1, siteTitle, browserTitle }
  })
  
  revalidatePath('/', 'layout') // 刷新全站
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

// --- 獨立清單管理員功能 ---
export async function updateListSettings(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("未登入")

  const listId = formData.get('listId') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const categories = formData.get('categories') as string

  // 保安檢查：確保修改者係呢個 List 嘅 Owner
  const list = await prisma.list.findUnique({ where: { id: listId } })
  if (!list || list.ownerId !== session.user.id) {
    throw new Error("只有清單擁有者可以修改設定")
  }

  // 更新 List 資料
  await prisma.list.update({
    where: { id: listId },
    data: { title, description, categories }
  })

  // 刷新頁面 (連大廳都要刷新，因為標題可能改咗)
  revalidatePath(`/list/${listId}`)
  revalidatePath('/')
}

// app/actions.ts

// 1. 透過 Email 邀請成員 (改為接收 FormData)
export async function addMemberByEmail(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("未登入")

  const listId = formData.get('listId') as string
  const email = formData.get('email') as string

  // 檢查權限：只有 Owner 可以加人
  const list = await prisma.list.findUnique({ 
    where: { id: listId },
    select: { ownerId: true } 
  })
  if (list?.ownerId !== session.user.id) throw new Error("權限不足")

  // 搵出目標 User
  const targetUser = await prisma.user.findUnique({ where: { email } })
  if (!targetUser) throw new Error("找不到此用戶，請確保對方已登入過本系統")

  // 加入成員
  await prisma.list.update({
    where: { id: listId },
    data: {
      members: {
        connect: { id: targetUser.id }
      }
    }
  })

  revalidatePath(`/list/${listId}`)
}

// 2. 移除成員
export async function removeMember(listId: string, userId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("未登入")

  const list = await prisma.list.findUnique({ 
    where: { id: listId },
    select: { ownerId: true } 
  })
  if (list?.ownerId !== session.user.id) throw new Error("權限不足")

  await prisma.list.update({
    where: { id: listId },
    data: {
      members: {
        disconnect: { id: userId }
      }
    }
  })

  revalidatePath(`/list/${listId}`)
}

export async function deleteList(listId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("未登入")

  // 1. 搵出目標 List
  const list = await prisma.list.findUnique({ where: { id: listId } })
  if (!list) return

  // 2. 檢查權限 (必須係 Owner 或者係 Global Admin)
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } })
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
  const isGlobalAdmin = dbUser?.isAdmin || (session.user.email ? adminEmails.includes(session.user.email) : false)

  if (list.ownerId !== session.user.id && !isGlobalAdmin) {
    throw new Error("只有擁有者或系統管理員可以刪除清單")
  }

  // 3. 執行刪除 (Prisma schema 設有 Cascade，所以裡面的 Wish 同 Rating 會一併刪除)
  await prisma.list.delete({
    where: { id: listId }
  })

  // 4. 刷新並導向
  revalidatePath('/')
  redirect('/') // 刪除後自動返大廳
}