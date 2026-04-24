// app/admin/page.tsx
import { prisma } from "../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import { redirect } from "next/navigation";
import {
  updateSystemConfig,
  toggleUserAccess,
  toggleAdminStatus,
} from "../actions";
import Link from "next/link";

export async function generateMetadata() {
  const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
  const baseTitle = config?.browserTitle || "CM98 List";
  return {
    title: `${baseTitle} - Admin Panel`, // 顯示例如：CM98 List - Admin Panel
  };
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const currentUser = await prisma.user.findUnique({
    where: { id: session?.user?.id },
  });

  // 判斷係咪 Admin (結合 DB 同 ENV)
  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];

  const isAdmin =
    currentUser?.isAdmin ||
    (session?.user?.email ? adminEmails.includes(session.user.email) : false);

  // 保安檢查：非 Admin 直接踢返去 Home
  if (!isAdmin) redirect("/");

  const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
  const users = await prisma.user.findMany({
    include: { _count: { select: { wishes: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <main className="max-w-4xl mx-auto p-6 text-black dark:text-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold">⚙️ Admin Panel</h1>
        <Link href="/" className="text-blue-500 hover:underline">
          ← 返回首頁
        </Link>
      </div>

      {/* 1. 系統設定 */}
      <section className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md mb-8 border dark:border-gray-800">
        <h2 className="text-xl font-bold mb-4">系統設定</h2>
        <form
          action={async (formData) => {
            "use server";
            await updateSystemConfig(
              formData.get("siteTitle") as string,
              formData.get("browserTitle") as string, // <--- 傳入新數值
              formData.get("categories") as string,
            );
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">
              網頁大標題 (H1)
            </label>
            <input
              name="siteTitle"
              defaultValue={config?.siteTitle}
              className="w-full p-2 border rounded dark:bg-gray-800"
            />
          </div>

          {/* 👇 新增：Title Bar 設定 👇 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              瀏覽器標題 (Browser Title Bar)
            </label>
            <input
              name="browserTitle"
              defaultValue={config?.browserTitle}
              className="w-full p-2 border rounded dark:bg-gray-800"
              placeholder="顯示喺 Browser Tab 嘅名"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              類別清單 (用逗號隔開)
            </label>
            <input
              name="categories"
              defaultValue={config?.categories}
              className="w-full p-2 border rounded dark:bg-gray-800"
            />
          </div>
          <button type="submit" className="...">
            儲存設定
          </button>
        </form>
      </section>

      {/* 2. 用戶管理 & 統計 */}
      <section className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md border dark:border-gray-800">
        <h2 className="text-xl font-bold mb-4">用戶管理及統計</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="py-2 px-4">用戶</th>
                <th className="py-2 px-4">Items</th>
                <th className="py-2 px-4">權限</th>
                <th className="py-2 px-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b dark:border-gray-800 text-sm"
                >
                  <td className="py-3 px-4">
                    <div className="font-bold">{u.name}</div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </td>
                  <td className="py-3 px-4 font-mono">{u._count.wishes}</td>
                  <td className="py-3 px-4">
                    {u.isAdmin && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded mr-1">
                        Admin
                      </span>
                    )}
                    {!u.isAllowed && (
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded">
                        Blocked
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 space-x-2">
                    <form
                      action={toggleUserAccess.bind(null, u.id)}
                      className="inline"
                    >
                      <button className="text-xs bg-gray-100 dark:bg-gray-700 p-1 rounded">
                        {u.isAllowed ? "封鎖" : "解封"}
                      </button>
                    </form>
                    <form
                      action={toggleAdminStatus.bind(null, u.id)}
                      className="inline"
                    >
                      <button className="text-xs bg-gray-100 dark:bg-gray-700 p-1 rounded">
                        {u.isAdmin ? "降職" : "升Admin"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
