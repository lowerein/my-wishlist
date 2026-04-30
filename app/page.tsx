// app/page.tsx
import { prisma } from "./lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "./lib/auth";
import Link from "next/link";
import { LoginButton, LogoutButton } from "./components/AuthButtons";
import ThemeToggle from "./components/ThemeToggle";
import {
  createList,
  updateSystemConfig,
  toggleUserAccess,
  toggleAdminStatus,
  deleteList, leaveList
} from "./actions";

import DeleteConfirmButton from "./components/DeleteConfirmButton";

// 動態生成大廳頁面嘅瀏覽器標題 (Browser Tab)
export async function generateMetadata() {
  const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
  return {
    title: config?.browserTitle || "CM98 Wishlists",
  };
}

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  // 1. 優先讀取全域設定 (等未登入畫面都可以用動態大標題)
  const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
  const siteTitle = config?.siteTitle || "CM98 Wishlists";

  // 2. 未登入畫面
  if (!session?.user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-950 text-black dark:text-white transition-colors">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        {/* 👇 依家會真正反映你設定嘅大標題 👇 */}
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-center">
          ⭐ {siteTitle} ⭐
        </h1>
        <p className="mb-8 text-gray-500">請先登入以管理你的共享清單</p>
        <LoginButton />
      </main>
    );
  }

  // 3. 讀取用戶資料與權限
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { ownedLists: true, memberOf: true },
  });

  // 檢查是否被封鎖
  if (dbUser && !dbUser.isAllowed) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 text-center bg-gray-50 dark:bg-gray-950 text-black dark:text-white">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-lg border border-red-200 dark:border-red-900">
          <h1 className="text-3xl font-bold text-red-500 mb-4">🚫 存取被拒</h1>
          <p className="mb-6">你已被管理員禁止進入系統。</p>
          <LogoutButton />
        </div>
      </main>
    );
  }

  // 判斷 Admin (ENV + DB)
  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
  const isAdmin =
    dbUser?.isAdmin ||
    (session.user.email ? adminEmails.includes(session.user.email) : false);

  // 4. 處理一般用戶嘅 List 顯示
  const rawLists = [...(dbUser?.ownedLists || []), ...(dbUser?.memberOf || [])];
  const uniqueLists = Array.from(
    new Map(rawLists.map((list) => [list.id, list])).values(),
  );

  // 5. 如果係 Admin，預先讀取埋系統管理所需嘅資料
  let allUsers: any[] = [];
  let allSystemLists: any[] = [];

  if (isAdmin) {
    allUsers = await prisma.user.findMany({
      include: { _count: { select: { wishes: true, ownedLists: true } } },
      orderBy: { name: "asc" },
    });
    allSystemLists = await prisma.list.findMany({
      include: {
        owner: true,
        _count: { select: { wishes: true, members: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-8 text-black dark:text-gray-100 transition-colors duration-300">
      {/* 頂部 Header */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm mb-10 border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          {session.user.image && (
            <img
              src={session.user.image}
              className="w-10 h-10 rounded-full"
              alt="avatar"
            />
          )}
          <div>
            <p className="text-sm text-gray-500">歡迎返嚟,</p>
            <div className="flex items-center gap-2">
              <p className="font-bold">{session.user.name}</p>
              {isAdmin && (
                <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 text-[10px] px-2 py-0.5 rounded font-bold">
                  Admin
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>

      {/* ========================================= */}
      {/* 區塊 1：一般用戶大廳 (My Wishlists) */}
      {/* ========================================= */}
      <div className="mb-16">
        <h1 className="text-3xl font-extrabold mb-8 px-2">我的 Wishlists 🗂️</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 新增清單 Form */}
          <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-800">
            <h2 className="text-lg font-bold mb-4 text-blue-700 dark:text-blue-300">
              + 建立新清單
            </h2>
            <form action={createList} className="space-y-3">
              <input
                name="title"
                required
                placeholder="清單名稱 (例如: 同事食飯)"
                className="w-full p-2.5 text-sm rounded-lg border border-blue-100 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                name="description"
                placeholder="簡單描述 (Optional)"
                className="w-full p-2.5 text-sm rounded-lg border border-blue-100 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition shadow-lg shadow-blue-500/20"
              >
                立即建立
              </button>
            </form>
          </div>

          {/* 現有清單列表 */}
          {uniqueLists.map((list) => (
            <div key={list.id} className="relative group">
              {/* 1. 清單卡片連結 */}
              <Link href={`/list/${list.id}`}>
                <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 h-full flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group-hover:border-blue-400">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h2 className="text-xl font-bold group-hover:text-blue-600 transition-colors pr-2">
                        {list.title}
                      </h2>
                      <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-500 whitespace-nowrap">
                        {list.ownerId === session.user.id
                          ? "👑 擁有者"
                          : "👥 成員"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {list.description || "未有描述"}
                    </p>
                  </div>

                  {/* 底部區域：左邊係進入，右邊留空位畀刪除掣 */}
                  <div className="mt-6 flex items-center text-blue-500 font-bold text-sm">
                    進入清單{" "}
                    <span className="ml-1 group-hover:ml-3 transition-all">
                      →
                    </span>
                  </div>
                </div>
              </Link>

              {/* 2. 刪除掣 (放置於右下角) */}
<div className="absolute bottom-5 right-5 z-10">
              {list.ownerId === session.user.id ? (
                // Owner 見到刪除掣
                <form action={deleteList.bind(null, list.id)}>
                  <DeleteConfirmButton 
                    label="🗑️ 刪除" 
                    confirmMessage="確定要永久刪除此清單及其所有內容嗎？"
                    className="text-xs text-gray-400 hover:text-red-600 bg-white/50 dark:bg-gray-900/50 hover:bg-red-50 dark:hover:bg-red-900/30 px-3 py-1.5 rounded-md transition-all duration-300 backdrop-blur-sm"
                  />
                </form>
              ) : (
                // 成員/Admin 見到離開掣
                <form action={leaveList.bind(null, list.id)}>
                  <DeleteConfirmButton 
                    label="🚪 離開" 
                    confirmMessage="確定要離開此共享清單嗎？離開後你將無法再看到裡面的內容。"
                    className="text-xs text-gray-400 hover:text-orange-600 bg-white/50 dark:bg-gray-900/50 hover:bg-orange-50 dark:hover:bg-orange-900/30 px-3 py-1.5 rounded-md transition-all duration-300 backdrop-blur-sm"
                  />
                </form>
              )}
            </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================= */}
      {/* 區塊 2：超級管理員後台 (只限 Admin 可見) */}
      {/* ========================================= */}
      {isAdmin && (
        <div className="mt-16 pt-12 border-t-4 border-gray-100 dark:border-gray-800">
          <h2 className="text-3xl font-extrabold mb-8 flex items-center gap-2">
            <span>⚙️</span> 管理員後台 (Admin Panel)
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左側：系統設定 & 概覽 */}
            <div className="lg:col-span-1 space-y-6">
              <section className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                <h3 className="text-xl font-bold mb-4">系統全域設定</h3>
                <form
                  action={async (formData) => {
                    "use server";
                    await updateSystemConfig(
                      formData.get("siteTitle") as string,
                      formData.get("browserTitle") as string,
                    );
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      登入頁大標題 (H1)
                    </label>
                    <input
                      name="siteTitle"
                      defaultValue={siteTitle}
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      瀏覽器標題 (Tab 顯示)
                    </label>
                    <input
                      name="browserTitle"
                      defaultValue={config?.browserTitle || "CM98 Wishlists"}
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                  {/* 👇 已移除「全域預設類別」輸入框 👇 */}
                  <button
                    type="submit"
                    className="w-full bg-purple-600 text-white px-4 py-2 rounded font-bold hover:bg-purple-700 transition"
                  >
                    💾 儲存系統設定
                  </button>
                </form>
              </section>

              <section className="bg-gradient-to-br from-purple-600 to-blue-600 p-6 rounded-xl shadow-sm text-white">
                <h3 className="text-lg font-bold mb-4">系統概覽</h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-white/20 p-3 rounded-lg">
                    <p className="text-3xl font-extrabold">
                      {allSystemLists.length}
                    </p>
                    <p className="text-xs uppercase opacity-80 mt-1">
                      總清單數
                    </p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg">
                    <p className="text-3xl font-extrabold">{allUsers.length}</p>
                    <p className="text-xs uppercase opacity-80 mt-1">
                      註冊用戶
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {/* 右側：表格區 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 用戶管理表 */}
              <section className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <h3 className="text-lg font-bold">用戶管理</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 text-xs uppercase text-gray-500">
                        <th className="py-3 px-4">用戶</th>
                        <th className="py-3 px-4">擁有清單</th>
                        <th className="py-3 px-4">加入 Items</th>
                        <th className="py-3 px-4">操作</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {allUsers.map((u) => (
                        <tr
                          key={u.id}
                          className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold">
                              {u.name || "Unknown"}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {u.email}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-blue-600">
                            {u._count.ownedLists}
                          </td>
                          <td className="py-3 px-4 font-mono">
                            {u._count.wishes}
                          </td>
                          <td className="py-3 px-4 space-x-2 whitespace-nowrap">
                            <form
                              action={toggleUserAccess.bind(null, u.id)}
                              className="inline"
                            >
                              <button className="text-[10px] font-bold bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 px-2 py-1 rounded transition">
                                {u.isAllowed ? "🚫 封鎖" : "✅ 解封"}
                              </button>
                            </form>
                            <form
                              action={toggleAdminStatus.bind(null, u.id)}
                              className="inline"
                            >
                              <button className="text-[10px] font-bold bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 px-2 py-1 rounded transition">
                                {u.isAdmin ? "⬇️ 降職" : "⬆️ 升 Admin"}
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 全系統清單監察 */}
              <section className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <h3 className="text-lg font-bold">全系統清單監察</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 text-xs uppercase text-gray-500">
                        <th className="py-3 px-4">清單名稱</th>
                        <th className="py-3 px-4">成員數</th>
                        <th className="py-3 px-4">項目數</th>
                        <th className="py-3 px-4">建立日期</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {allSystemLists.map((list) => (
                        <tr
                          key={list.id}
                          className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 transition"
                        >
                          <td className="py-3 px-4 font-bold text-blue-600">
                            <Link
                              href={`/list/${list.id}`}
                              className="hover:underline"
                            >
                              {list.title}
                            </Link>
                          </td>
                          <td className="py-3 px-4 font-mono">
                            {list._count.members}
                          </td>
                          <td className="py-3 px-4 font-mono">
                            {list._count.wishes}
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-500">
                            {list.createdAt.toLocaleDateString("zh-HK", {
                              timeZone: "Asia/Hong_Kong",
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <form action={deleteList.bind(null, list.id)}>
                              <DeleteConfirmButton
                                label="刪除清單"
                                className="text-[10px] font-bold text-red-500 hover:underline"
                              />
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
