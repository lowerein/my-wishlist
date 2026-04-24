// app/api/migrate/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma"; // 確保路徑正確，或者用 '../../../lib/prisma'

export async function GET() {
  try {
    // 1. 搵第一個 User 嚟做個 Default List 嘅 Owner
    const firstUser = await prisma.user.findFirst();
    if (!firstUser) return NextResponse.json({ error: "無 User 喺 DB" });

    // 2. 搵晒所有現存嘅 Users
    const allUsers = await prisma.user.findMany();

    // 3. 建立一個「舊資料專用」嘅大廳 List，並將所有現有 User 加為 member
    const defaultList = await prisma.list.create({
      data: {
        title: "⭐ 玉桂狗與姆明的98 List (經典版) ⭐",
        description: "由舊系統無痛轉移過來的所有項目",
        ownerId: firstUser.id,
        members: {
          connect: allUsers.map((u) => ({ id: u.id })), // 所有舊玩家都有份入呢個 List
        },
      },
    });

    // 4. 將所有未有 listId 嘅 Wish，全部塞入呢個 Default List
    const updateResult = await prisma.wish.updateMany({
      where: { listId: null },
      data: { listId: defaultList.id },
    });

    return NextResponse.json({
      success: true,
      message: "無痛轉移成功！",
      updatedWishesCount: updateResult.count,
      listId: defaultList.id,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}
