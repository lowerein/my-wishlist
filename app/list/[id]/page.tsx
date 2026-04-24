// app/list/[id]/page.tsx
import { prisma } from "../../lib/prisma";
import {
  addWish,
  deleteWish,
  markAsVisited,
  unmarkAsVisited,
  togglePrivacy,
  updateListSettings,
  addMemberByEmail,
  removeMember,
  toggleListAdmin,
  deleteList,
} from "../../actions";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { LogoutButton } from "../../components/AuthButtons";
import StarRating from "../../components/StarRating";
import ThemeToggle from "../../components/ThemeToggle";
import { redirect } from "next/navigation";
import DeleteConfirmButton from "../../components/DeleteConfirmButton";
import EditWishForm from "../../components/EditWishForm";

// 👇 加入呢段：動態生成清單頁面嘅瀏覽器標題 👇
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const listId = resolvedParams.id;

  // 同時讀取全域設定同埋呢個 List 嘅名
  const [config, currentList] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { id: 1 } }),
    prisma.list.findUnique({ where: { id: listId }, select: { title: true } }),
  ]);

  const baseTitle = config?.browserTitle || "CM98 Wishlists";
  const listName = currentList?.title || "Loading...";

  return {
    title: `${listName} | ${baseTitle}`,
    // 效果會係例如：「同事食飯 | CM98 Wishlists」
  };
}

export default async function ListPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  // 1. 權限與 Admin 檢查
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
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
  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
  const isAdmin =
    dbUser?.isAdmin ||
    (session.user.email ? adminEmails.includes(session.user.email) : false);

  // 2. 解析 Params & 讀取清單資料
  const resolvedParams = await params;
  const listId = resolvedParams.id;
  const urlParams = await searchParams;

  const currentList = await prisma.list.findUnique({
    where: { id: listId },
    include: { owner: true, members: true, admins: true },
  });

  if (!currentList) {
    return <main className="p-8 text-center text-red-500">找不到此清單！</main>;
  }

  // 👇 新增呢三行計算目前 User 權限 👇
  const isOwner = currentList.ownerId === session.user.id;
  const isListAdmin = currentList.admins.some((a) => a.id === session.user.id);
  const hasAdminAccess = isOwner || isListAdmin;

  // 3. 處理篩選條件
  const currentPage = Number(urlParams.page) || 1;
  const pageSize = Number(urlParams.limit) || 20;
  const category = urlParams.category || "all";
  const status = urlParams.status || "all";
  const search = urlParams.search || "";
  const userFilter = urlParams.user || "all";

  const categoryOptions = currentList.categories.split(",");

  // 4. 讀取「喺呢個 List 入面有加過項目」嘅 User 用於 Filter
  const allUsers = await prisma.user.findMany({
    where: { wishes: { some: { listId: listId } } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // 5. 設定資料庫查詢條件 (鎖定 listId，並且只看公開或自己的)
  const where: any = {
    listId: listId,
    OR: [{ isPrivate: false }, { userId: session.user.id }],
  };

  if (category !== "all") where.category = category;
  if (status === "visited") where.isVisited = true;
  else if (status === "not-visited") where.isVisited = false;
  if (userFilter !== "all") where.userId = userFilter;
  if (search)
    where.AND = [{ description: { contains: search, mode: "insensitive" } }];

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
    return `/list/${listId}?page=${newPage}&limit=${newLimit || pageSize}&category=${category}&status=${status}&user=${userFilter}&search=${search}`;
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
      {/* 頂部工具列 (Header) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm mb-6 border border-gray-100 dark:border-gray-800 gap-4">
        {/* 左側：返回掣及清單名稱 */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1.5 rounded-md text-sm font-bold transition"
          >
            ← 大廳
          </Link>
          <div className="border-l pl-3 border-gray-200 dark:border-gray-700">
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              正在查看
            </p>
            <p className="font-extrabold text-lg leading-tight">
              {currentList.title}
            </p>
          </div>
        </div>

        {/* 右側：當前用家資訊及工具 */}
        <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-gray-50 dark:border-gray-800">
          <div className="flex items-center gap-2">
            {session.user.image && (
              <img
                src={session.user.image}
                className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700"
                alt="user avatar"
              />
            )}
            <div className="hidden sm:block text-right">
              <p className="text-[10px] text-gray-500 leading-none mb-1">
                登入身分
              </p>
              <p className="text-xs font-bold leading-none">
                {session.user.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </div>

      {/* ⚙️ 清單管理設定 (只限擁有者) */}
      {hasAdminAccess && (
        <details className="bg-white dark:bg-gray-900 p-5 rounded-xl shadow-md mb-8 border border-purple-200 dark:border-purple-900/50 group">
          <summary className="font-bold text-purple-700 dark:text-purple-400 cursor-pointer list-none flex justify-between items-center">
            <span className="flex items-center gap-2">
              ⚙️ 清單管理設定{" "}
              <span className="text-xs bg-purple-100 dark:bg-purple-900/50 px-2 py-1 rounded-full font-normal">
                只限擁有者
              </span>
            </span>
            <span className="group-open:rotate-180 transition-transform duration-300">
              ▼
            </span>
          </summary>

          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-8">
            {/* 部分 A：基本資料修改 (加回清單描述) */}
            <form action={updateListSettings} className="space-y-4">
              <input type="hidden" name="listId" value={listId} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    清單名稱
                  </label>
                  <input
                    name="title"
                    defaultValue={currentList.title}
                    required
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    專屬分類 (逗號隔開)
                  </label>
                  <input
                    name="categories"
                    defaultValue={currentList.categories}
                    required
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-sm"
                  />
                </div>
              </div>

              {/* 👇 加返呢個描述欄位 👇 */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  清單描述
                </label>
                <input
                  name="description"
                  defaultValue={currentList.description || ""}
                  placeholder="簡單描述此清單用途..."
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-sm"
                />
              </div>

              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-bold text-sm transition shadow-md"
              >
                💾 儲存基本設定
              </button>
            </form>

            {/* 部分 B：成員權限管理 */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                👥 成員權限管理
              </h3>

              {/* 邀請新成員 Form */}
              <form action={addMemberByEmail} className="flex gap-2 mb-6">
                {/* 👇 加入隱藏嘅 listId 傳畀 Server 👇 */}
                <input type="hidden" name="listId" value={listId} />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="輸入朋友的 Email 邀請佢..."
                  className="flex-1 p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-sm"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-bold text-sm transition"
                >
                  邀請
                </button>
              </form>

              {/* 成員列表 */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase">
                  現有成員：
                </p>

                {/* 顯示 Owner */}
                <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    {currentList.owner.image && (
                      <img
                        src={currentList.owner.image}
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <span className="text-sm font-bold">
                      {currentList.owner.name}{" "}
                      <span className="text-[10px] text-purple-500 ml-1">
                        (擁有者)
                      </span>
                    </span>
                  </div>
                </div>

                {/* 顯示 Members */}
                {currentList.members.map((member) => {
                  const isThisMemberAdmin = currentList.admins.some(
                    (a) => a.id === member.id,
                  );
                  return (
                    <div
                      key={member.id}
                      className="flex justify-between items-center p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800"
                    >
                      <div className="flex items-center gap-2">
                        {member.image && (
                          <img
                            src={member.image}
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <span className="text-sm font-medium">
                          {member.name}
                        </span>
                        {/* 顯示 Admin Badge */}
                        {isThisMemberAdmin && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                            管理員
                          </span>
                        )}
                      </div>

                      {/* 操作區 */}
                      <div className="flex items-center gap-3">
                        <form
                          action={toggleListAdmin.bind(null, listId, member.id)}
                        >
                          <button className="text-[10px] text-blue-500 hover:underline font-bold transition">
                            {isThisMemberAdmin ? "降為成員" : "升為管理員"}
                          </button>
                        </form>
                        <form
                          action={removeMember.bind(null, listId, member.id)}
                        >
                          <button className="text-[10px] text-red-500 hover:underline font-bold transition">
                            移除成員
                          </button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 👇 修正後嘅危險區域 👇 */}
            <div className="pt-6 border-t border-red-100 dark:border-red-900/30">
              <h3 className="text-sm font-bold text-red-600 mb-2">
                ⚠️ 危險區域
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                刪除清單後，所有項目及評分將會永久消失，無法還原。
              </p>

              <form action={deleteList.bind(null, listId)}>
                <DeleteConfirmButton
                  label="永久刪除此清單"
                  className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white px-4 py-2 rounded-md font-bold text-sm transition"
                />
              </form>
            </div>
          </div>
        </details>
      )}

      {/* 新增項目 Form */}
      <div className="bg-white dark:bg-gray-900 p-5 rounded-xl shadow-md mb-8 border border-gray-100 dark:border-gray-800">
        <form action={addWish} className="space-y-4">
          <input type="hidden" name="listId" value={listId} />
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

          <textarea
            name="notes"
            placeholder="詳細描述/備註 (Optional)..."
            rows={2}
            className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 dark:text-white text-sm"
          />

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
              Status
            </label>
            <select
              name="status"
              defaultValue={status}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800"
            >
              <option value="all">All</option>
              <option value="not-visited">未去</option>
              <option value="visited">已去</option>
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

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
              每頁顯示
            </label>
            <select
              name="limit"
              defaultValue={pageSize}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800 w-[70px]"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
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
              href={`/list/${listId}`}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-md text-sm transition hover:bg-gray-50"
            >
              Reset
            </Link>
          </div>
        </form>
      </div>

      <div className="flex justify-between items-center mb-4 px-2">
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
          總共找到 {totalItems} 個項目
        </p>
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
                      alt="avatar"
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
                  <span className="ml-1 text-green-500 no-underline inline-block">
                    ✅
                  </span>
                )}
              </h3>

              {wish.notes && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap">
                  {wish.notes}
                </p>
              )}

              {wish.link && (
                <a
                  href={wish.link}
                  target="_blank"
                  rel="noopener noreferrer"
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
                <div className="flex sm:flex-col gap-2">
                  <EditWishForm
                    wish={wish}
                    listId={listId}
                    categoryOptions={categoryOptions}
                  />

                  <form action={togglePrivacy.bind(null, wish.id)}>
                    <button className="w-full text-[12px] bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 transition hover:bg-gray-200">
                      {wish.isPrivate ? "🔓 公開" : "🔒 私人"}
                    </button>
                  </form>
                  <form action={deleteWish.bind(null, wish.id)}>
                    <button className="w-full text-[12px] bg-red-50 text-red-600 px-3 py-2 rounded-md border border-red-100 transition hover:bg-red-100">
                      Delete
                    </button>
                  </form>
                </div>
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

      {/* 數字分頁控制 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-12 pb-12">
          <Link
            href={buildQueryString(Math.max(1, currentPage - 1))}
            className={`px-3 py-1.5 rounded-md border ${currentPage <= 1 ? "opacity-30 pointer-events-none" : "hover:bg-gray-100 dark:hover:bg-gray-800 dark:border-gray-700"}`}
          >
            &laquo;
          </Link>
          {getPageNumbers()[0] > 1 && (
            <>
              <Link
                href={buildQueryString(1)}
                className="px-3 py-1.5 rounded-md border dark:border-gray-700"
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
              className={`px-3 py-1.5 rounded-md border font-bold ${currentPage === n ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-100 dark:hover:bg-gray-800 dark:border-gray-700"}`}
            >
              {n}
            </Link>
          ))}
          {getPageNumbers().slice(-1)[0] < totalPages && (
            <>
              <span className="px-1 text-gray-400">...</span>
              <Link
                href={buildQueryString(totalPages)}
                className="px-3 py-1.5 rounded-md border dark:border-gray-700"
              >
                {totalPages}
              </Link>
            </>
          )}
          <Link
            href={buildQueryString(Math.min(totalPages, currentPage + 1))}
            className={`px-3 py-1.5 rounded-md border ${currentPage >= totalPages ? "opacity-30 pointer-events-none" : "hover:bg-gray-100 dark:hover:bg-gray-800 dark:border-gray-700"}`}
          >
            &raquo;
          </Link>
        </div>
      )}
    </main>
  );
}
