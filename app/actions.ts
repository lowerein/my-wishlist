// app/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from './lib/prisma'

// 新增 Wishlist 項目 (拎走咗 isVisited)
export async function addWish(formData: FormData) {
  const description = formData.get('description') as string
  const category = formData.get('category') as string
  const link = formData.get('link') as string

  await prisma.wish.create({
    data: {
      description,
      category,
      link,
      // isVisited 會自動變 false，唔洗寫
    },
  })

  revalidatePath('/')
}

// 刪除 Wishlist 項目
export async function deleteWish(id: string) {
  await prisma.wish.delete({
    where: { id },
  })

  revalidatePath('/')
}

// 新增：標記為「已去」
export async function markAsVisited(id: string) {
  await prisma.wish.update({
    where: { id },
    data: { isVisited: true },
  })

  revalidatePath('/')
}

// 新增：標記為「未去」 (Undone)
export async function unmarkAsVisited(id: string) {
  await prisma.wish.update({
    where: { id },
    data: { isVisited: false },
  })
  revalidatePath('/')
}