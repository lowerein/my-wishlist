// app/page.tsx
import { prisma } from "./lib/prisma";
import {
  addWish,
  deleteWish,
  markAsVisited,
  unmarkAsVisited,
  togglePrivacy,
} from "./actions";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "./lib/auth";
import { LoginButton, LogoutButton } from "./components/AuthButtons";
import StarRating from "./components/StarRating";
import ThemeToggle from "./components/ThemeToggle";

export async function generateMetadata() {
  const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
  return {
    title: config?.browserTitle || "CM98 List",
    // 你之前整嘅玉桂狗 favicon 已經喺 app/icon.png 度，Next.js 會自動 handle
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const session = await getServerSession(authOptions);

  // 1. 讀取系統設定 (標題及類別)
  const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
  const siteTitle = config?.siteTitle || "CM98 List";
  const categoryOptions = config?.categories.split(",") || [
    "Food",
    "Entertainment",
    "Other",
  ];

  // 未登入畫面
  if (!session?.user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-950 text-black dark:text-white transition-colors duration-300">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-center">
          ⭐{siteTitle}⭐
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-center max-w-md">
          歡迎來到共享清單！請先登入以查看及新增項目。
        </p>
        <LoginButton />
      </main>
    );
  }

  // 2. 權限檢查 (封鎖狀態及 Admin 身份)
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  // 檢查是否被封鎖
  if (dbUser && !dbUser.isAllowed) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 text-center bg-gray-50 dark:bg-gray-950 text-black dark:text-white">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-lg border border-red-200 dark:border-red-900">
          <h1 className="text-3xl font-bold text-red-500 mb-4">🚫 存取被拒</h1>
          <p className="mb-6">你已被管理員禁止進入此列表。</p>
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

  // 3. 處理 URL 參數
  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  const pageSize = Number(params.limit) || 20;
  const category = params.category || "all";
  const status = params.status || "all";
  const search = params.search || "";
  const userFilter = params.user || "all";

  // 4. 讀取「有加過項目」的 User 用於 Filter
  const allUsers = await prisma.user.findMany({
    where: { wishes: { some: {} } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // 5. 設定資料庫查詢條件 (只看公開或自己的)
  const where: any = {
    OR: [{ isPrivate: false }, { userId: session.user.id }],
  };

  if (category !== "all") where.category = category;
  if (status === "visited") where.isVisited = true;
  else if (status === "not-visited") where.isVisited = false;
  if (userFilter !== "all") where.userId = userFilter;
  if (search) {
    where.AND = [{ description: { contains: search, mode: "insensitive" } }];
  }

  // 6. 抓取資料
  const totalItems = await prisma.wish.count({ where });
  const totalPages = Math.ceil(totalItems / pageSize);
  const wishes = await prisma.wish.findMany({
    where,
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: "desc" },
    include: {
      user: true,
      ratings: { include: { user: true } },
    },
  });

  // 7. 分頁與 URL 輔助函數
  const buildQueryString = (newPage: number, newLimit?: number) => {
    return `/?page=${newPage}&limit=${newLimit || pageSize}&category=${category}&status=${status}&user=${userFilter}&search=${search}`;
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = startPage + maxVisiblePages - 1;
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  };

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8 text-black dark:text-gray-100 transition-colors duration-300">
      {/* 頂部工具列 */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm mb-6 border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          {session.user.image && (
            <img
              src={session.user.image}
              alt="Avatar"
              className="w-10 h-10 rounded-full"
            />
          )}
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Hi, {session.user.name}
            </p>
            <p className="text-xs font-mono opacity-50">
              {isAdmin ? "🛡️ Administrator" : "Member"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              href="/admin"
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-md font-bold transition"
            >
              Admin Panel
            </Link>
          )}
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center">
        ⭐ {siteTitle} ⭐
      </h1>

      {/* 新增項目 Form */}
      <div className="bg-white dark:bg-gray-900 p-5 rounded-xl shadow-md mb-8 border border-gray-100 dark:border-gray-800">
        <form action={addWish} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              name="category"
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-md w-full bg-white dark:bg-gray-800 dark:text-white"
              required
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat.trim()}>
                  {cat.trim()}
                </option>
              ))}
            </select>
            <input
              type="text"
              name="description"
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-md w-full bg-white dark:bg-gray-800 dark:text-white"
              required
              placeholder="想去邊度？"
            />
          </div>
          <input
            type="url"
            name="link"
            className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 dark:text-white"
            placeholder="網址 (Optional) https://..."
          />
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              id="isPrivate"
              name="isPrivate"
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <label
              htmlFor="isPrivate"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              🔒 設為私人項目 (只限自己可見)
            </label>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 dark:bg-blue-500 text-white p-3 rounded-md hover:bg-blue-700 font-bold transition"
          >
            Add to Wishlist
          </button>
        </form>
      </div>

      {/* 篩選器 */}
      <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl mb-6 border border-gray-200 dark:border-gray-800">
        <form method="GET" className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
              Search
            </label>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="搜尋描述..."
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
              Category
            </label>
            <select
              name="category"
              defaultValue={category}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800"
            >
              <option value="all">All</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat.trim()}>
                  {cat.trim()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
              提供者
            </label>
            <select
              name="user"
              defaultValue={userFilter}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800 max-w-[120px]"
            >
              <option value="all">所有人</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.id === session.user.id ? "我自己" : u.name?.split(" ")[0]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-gray-800 dark:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-bold transition hover:bg-black"
            >
              Filter
            </button>
            <Link
              href="/"
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-md text-sm transition hover:bg-gray-50"
            >
              Reset
            </Link>
          </div>
        </form>
      </div>

      {/* 列表渲染 */}
      <div className="space-y-4">
        {wishes.map((wish) => (
          <div
            key={wish.id}
            className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between gap-4 border border-gray-100 dark:border-gray-800"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-full">
                  {wish.category}
                </span>
                {wish.isPrivate && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-gray-600 text-white rounded-full">
                    🔒 私人
                  </span>
                )}
                <div className="flex items-center gap-1 opacity-60">
                  {wish.user?.image && (
                    <img
                      src={wish.user.image}
                      className="w-3 h-3 rounded-full"
                    />
                  )}
                  <span className="text-[10px]">{wish.user?.name} 提供</span>
                </div>
              </div>
              <h3
                className={`text-lg font-bold ${wish.isVisited ? "text-gray-400 line-through" : ""}`}
              >
                {wish.description}{" "}
                {wish.isVisited && (
                  <span className="ml-1 text-green-500 no-underline">✅</span>
                )}
              </h3>
              {wish.link && (
                <a
                  href={wish.link}
                  target="_blank"
                  className="text-blue-500 text-xs hover:underline mt-1 inline-block"
                >
                  查看連結
                </a>
              )}
              {wish.isVisited && (
                <div className="mt-3">
                  <StarRating
                    wishId={wish.id}
                    ratings={wish.ratings}
                    currentUserId={session.user.id}
                  />
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-2">
                加入日期:{" "}
                {wish.createdAt.toLocaleString("zh-HK", {
                  timeZone: "Asia/Hong_Kong",
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </p>
            </div>

            <div className="flex sm:flex-col gap-2 justify-end">
              {wish.isVisited ? (
                <form action={unmarkAsVisited.bind(null, wish.id)}>
                  <button className="w-full text-[12px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-md border border-orange-100 dark:border-orange-900/50 transition hover:bg-orange-100">
                    重設未去
                  </button>
                </form>
              ) : (
                <form action={markAsVisited.bind(null, wish.id)}>
                  <button className="w-full text-[12px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-md border border-green-100 dark:border-green-900/50 transition hover:bg-green-100">
                    去咗啦！
                  </button>
                </form>
              )}
              {wish.userId === session.user.id && (
                <div className="flex gap-2">
                  <form action={togglePrivacy.bind(null, wish.id)}>
                    <button className="text-[12px] bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 transition hover:bg-gray-200">
                      {wish.isPrivate ? "🔓 公開" : "🔒 私人"}
                    </button>
                  </form>
                  <form action={deleteWish.bind(null, wish.id)}>
                    <button className="text-[12px] bg-red-50 text-red-600 px-3 py-2 rounded-md border border-red-100 transition hover:bg-red-100">
                      Delete
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 數字分頁控制 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-12 pb-12">
          <Link
            href={buildQueryString(Math.max(1, currentPage - 1))}
            className={`px-3 py-1.5 rounded-md border ${currentPage <= 1 ? "opacity-30 pointer-events-none" : "hover:bg-gray-100"}`}
          >
            &laquo;
          </Link>
          {getPageNumbers()[0] > 1 && (
            <>
              <Link
                href={buildQueryString(1)}
                className="px-3 py-1.5 rounded-md border"
              >
                1
              </Link>
              <span className="px-1 text-gray-400">...</span>
            </>
          )}
          {getPageNumbers().map((n) => (
            <Link
              key={n}
              href={buildQueryString(n)}
              className={`px-3 py-1.5 rounded-md border font-bold ${currentPage === n ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-100"}`}
            >
              {n}
            </Link>
          ))}
          {getPageNumbers().slice(-1)[0] < totalPages && (
            <>
              <span className="px-1 text-gray-400">...</span>
              <Link
                href={buildQueryString(totalPages)}
                className="px-3 py-1.5 rounded-md border"
              >
                {totalPages}
              </Link>
            </>
          )}
          <Link
            href={buildQueryString(Math.min(totalPages, currentPage + 1))}
            className={`px-3 py-1.5 rounded-md border ${currentPage >= totalPages ? "opacity-30 pointer-events-none" : "hover:bg-gray-100"}`}
          >
            &raquo;
          </Link>
        </div>
      )}
    </main>
  );
}
