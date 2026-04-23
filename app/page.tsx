// app/page.tsx
import { prisma } from "./lib/prisma";
import { addWish, deleteWish, markAsVisited, unmarkAsVisited } from "./actions";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "./lib/auth";
import { LoginButton, LogoutButton } from "./components/AuthButtons";
import StarRating from "./components/StarRating";
import ThemeToggle from "./components/ThemeToggle";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-950 text-black dark:text-white transition-colors duration-300">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-center">
          ⭐98 List⭐
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-center max-w-md">
          呢度係我地專屬嘅
          Wishlist！記低我地想去食買玩嘅地方，完成之後仲可以打卡記錄。
        </p>
        <LoginButton />
      </main>
    );
  }

  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  const pageSize = Number(params.limit) || 20;
  const category = params.category || "all";
  const status = params.status || "all";
  const search = params.search || "";

  const where: any = {};
  if (category !== "all") where.category = category;
  if (status === "visited") where.isVisited = true;
  else if (status === "not-visited") where.isVisited = false;
  if (search) where.description = { contains: search, mode: "insensitive" };

  const totalItems = await prisma.wish.count({ where });
  const totalPages = Math.ceil(totalItems / pageSize);
  const wishes = await prisma.wish.findMany({
    where,
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: "desc" },
    include: {
      user: true,
      ratings: {
        include: { user: true }, // <--- 抽埋俾分嗰個人嘅頭像同名
      },
    },
  });
  const buildQueryString = (newPage: number, newLimit?: number) => {
    return `/?page=${newPage}&limit=${
      newLimit || pageSize
    }&category=${category}&status=${status}&search=${search}`;
  };

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8 text-black dark:text-gray-100 transition-colors duration-300">
      {/* 頂部 User Info Bar & Theme Toggle */}
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
              歡迎返嚟,
            </p>
            <p className="font-bold">{session.user.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center">
        ⭐98 List⭐
      </h1>

      {/* 新增項目表單 */}
      <div className="bg-white dark:bg-gray-900 p-5 md:p-6 rounded-lg shadow-md mb-6 border border-gray-100 dark:border-gray-800">
        <form action={addWish} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              name="category"
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-md w-full bg-white dark:bg-gray-800 dark:text-white"
              required
            >
              <option value="Food">🍔 Food</option>
              <option value="Entertainment">🎬 Entertainment</option>
              <option value="Other">💡 Other</option>
            </select>
            <input
              type="text"
              name="description"
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-md w-full bg-white dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
              required
              placeholder="想去邊度/食咩？"
            />
          </div>
          <input
            type="url"
            name="link"
            className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
            placeholder="網址 (Optional) https://..."
          />
          <button
            type="submit"
            className="w-full bg-blue-600 dark:bg-blue-500 text-white p-3 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition font-bold"
          >
            Add to Wishlist
          </button>
        </form>
      </div>

      {/* 篩選與搜尋列 */}
      <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg mb-6 border border-gray-200 dark:border-gray-800">
        <form
          method="GET"
          className="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-end w-full"
        >
          <div className="w-full sm:flex-1 sm:min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Search
            </label>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="搜尋描述..."
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Category
            </label>
            <select
              name="category"
              defaultValue={category}
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Categories</option>
              <option value="Food">Food</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Status
            </label>
            <select
              name="status"
              defaultValue={status}
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="not-visited">未去 (Not Visited)</option>
              <option value="visited">已去 (Visited)</option>
            </select>
          </div>

          <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
            <button
              type="submit"
              className="flex-1 sm:flex-none bg-gray-800 dark:bg-gray-700 text-white px-4 py-2 rounded-md text-sm hover:bg-black dark:hover:bg-gray-600 text-center transition"
            >
              Filter
            </button>
            <Link
              href="/"
              className="flex-1 sm:flex-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-center flex items-center justify-center transition"
            >
              Reset
            </Link>
          </div>
          <input type="hidden" name="limit" value={pageSize} />
        </form>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-4 px-2">
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
          總共找到 {totalItems} 個項目
        </p>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            每頁顯示:
          </label>
          {[10, 20, 50].map((num) => (
            <Link
              key={num}
              href={buildQueryString(1, num)}
              className={`px-3 py-1 text-sm rounded border transition ${
                pageSize === num
                  ? "bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {num}
            </Link>
          ))}
        </div>
      </div>

      {/* 項目清單 */}
      <div className="space-y-4">
        {wishes.map((wish) => (
          <div
            key={wish.id}
            className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow flex flex-col sm:flex-row justify-between sm:items-center gap-4 border border-transparent dark:border-gray-800"
          >
            <div className="w-full">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                  {wish.category}
                </span>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                  {wish.user?.image ? (
                    <img
                      src={wish.user?.image}
                      alt="avatar"
                      className="w-4 h-4 rounded-full"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                  )}
                  <span className="text-[10px] text-gray-600 dark:text-gray-400">
                    {wish.user?.name?.split(" ")[0]} 提供
                  </span>
                </div>
              </div>

              <h3
                className={`text-lg font-bold leading-tight ${
                  wish.isVisited
                    ? "text-gray-400 dark:text-gray-600 line-through"
                    : ""
                }`}
              >
                {wish.description}
                {wish.isVisited && (
                  <span className="ml-2 text-green-600 dark:text-green-500 text-sm no-underline inline-block">
                    ✅ 大家去咗啦
                  </span>
                )}
              </h3>

              {wish.link && (
                <a
                  href={wish.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 dark:text-blue-400 text-sm hover:underline block mt-2 truncate"
                >
                  查看連結
                </a>
              )}

              {wish.isVisited && (
                <div className="mt-1">
                  {wish.isVisited && (
                    <div className="mt-2">
                      <StarRating
                        wishId={wish.id}
                        ratings={wish.ratings}
                        currentUserId={session.user.id}
                      />
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                加入日期: {wish.createdAt.toLocaleString("zh-HK")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {wish.isVisited ? (
                <form
                  action={unmarkAsVisited.bind(null, wish.id)}
                  className="flex-1 sm:flex-none"
                >
                  <button
                    type="submit"
                    className="w-full text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded border border-orange-100 dark:border-orange-800/50 hover:bg-orange-100 dark:hover:bg-orange-900/40 text-sm transition"
                  >
                    重設為未去
                  </button>
                </form>
              ) : (
                <form
                  action={markAsVisited.bind(null, wish.id)}
                  className="flex-1 sm:flex-none"
                >
                  <button
                    type="submit"
                    className="w-full text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded border border-green-100 dark:border-green-800/50 hover:bg-green-100 dark:hover:bg-green-900/40 text-sm transition"
                  >
                    去咗啦！
                  </button>
                </form>
              )}

              {wish.userId === session.user.id && (
                <form
                  action={deleteWish.bind(null, wish.id)}
                  className="flex-1 sm:flex-none"
                >
                  <button
                    type="submit"
                    className="w-full text-red-500 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded border border-red-100 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/40 text-sm transition"
                  >
                    Delete
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
        {wishes.length === 0 && (
          <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">
              呢度仲係空空如也，快啲加啲嘢落去啦！ 📝
            </p>
          </div>
        )}
      </div>

      {/* 分頁控制 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <Link
            href={buildQueryString(Math.max(1, currentPage - 1))}
            className={`px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm text-sm transition ${
              currentPage <= 1
                ? "pointer-events-none opacity-50"
                : "hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            上一頁
          </Link>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {currentPage} / {totalPages}
          </span>
          <Link
            href={buildQueryString(Math.min(totalPages, currentPage + 1))}
            className={`px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm text-sm transition ${
              currentPage >= totalPages
                ? "pointer-events-none opacity-50"
                : "hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            下一頁
          </Link>
        </div>
      )}
    </main>
  );
}
