// app/page.tsx
import { prisma } from './lib/prisma'
import { addWish, deleteWish, markAsVisited } from './actions'
import Link from 'next/link'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await searchParams;
  
  // 1. 獲取篩選參數
  const currentPage = Number(params.page) || 1;
  const pageSize = Number(params.limit) || 20;
  const category = params.category || 'all';
  const status = params.status || 'all';
  const search = params.search || '';

  // 2. 構建 Prisma 篩選條件 (Where Clause)
  const where: any = {};
  
  if (category !== 'all') {
    where.category = category;
  }
  
  if (status === 'visited') {
    where.isVisited = true;
  } else if (status === 'not-visited') {
    where.isVisited = false;
  }
  
  if (search) {
    where.description = {
      contains: search,
      mode: 'insensitive', // 忽略大小寫搜尋
    };
  }

  // 3. 獲取符合篩選條件的總數同資料
  const totalItems = await prisma.wish.count({ where });
  const totalPages = Math.ceil(totalItems / pageSize);
  const wishes = await prisma.wish.findMany({
    where,
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="max-w-4xl mx-auto p-8 text-black">
      <h1 className="text-3xl font-bold mb-8 text-center">🌟 My Wishlist</h1>

      {/* 輸入表單 (原本的內容) */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-gray-100">
        <h2 className="text-lg font-bold mb-4">新增項目</h2>
        <form action={addWish} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select name="category" className="p-2 border rounded-md" required>
              <option value="Food">🍔 Food</option>
              <option value="Entertainment">🎬 Entertainment</option>
              <option value="Other">💡 Other</option>
            </select>
            <input type="text" name="description" className="p-2 border rounded-md" required placeholder="想去邊度/食咩？" />
          </div>
          <input type="url" name="link" className="w-full p-2 border rounded-md" placeholder="網址 (Optional) https://..." />
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700">Add to Wishlist</button>
        </form>
      </div>

      {/* --- 新增：篩選同搜尋欄 --- */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
        <form method="GET" className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search</label>
            <input 
              type="text" 
              name="search" 
              defaultValue={search}
              placeholder="搜尋描述..." 
              className="w-full p-2 border rounded-md text-sm"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
            <select name="category" defaultValue={category} className="p-2 border rounded-md text-sm">
              <option value="all">All Categories</option>
              <option value="Food">Food</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
            <select name="status" defaultValue={status} className="p-2 border rounded-md text-sm">
              <option value="all">All Status</option>
              <option value="not-visited">未去 (Not Visited)</option>
              <option value="visited">已去 (Visited)</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="bg-gray-800 text-white px-4 py-2 rounded-md text-sm hover:bg-black">
              Filter
            </button>
            <Link href="/" className="bg-white border border-gray-300 px-4 py-2 rounded-md text-sm hover:bg-gray-100">
              Reset
            </Link>
          </div>
          
          {/* 隱藏的 limit 參數，確保篩選時唔會 reset 咗每頁顯示數量 */}
          <input type="hidden" name="limit" value={pageSize} />
        </form>
      </div>

      {/* 顯示清單與分頁控制 (與之前相似，但要帶埋 filter params) */}
      <div className="space-y-4">
        {wishes.map((wish) => (
          <div key={wish.id} className="bg-white p-4 rounded-lg shadow flex justify-between items-start">
            <div>
              <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full mb-2">{wish.category}</span>
              <h3 className={`text-lg font-bold ${wish.isVisited ? 'text-gray-400 line-through' : ''}`}>
                {wish.description}
                {wish.isVisited && <span className="ml-2 text-green-600 text-sm no-underline inline-block">✅</span>}
              </h3>
              {wish.link && <a href={wish.link} target="_blank" className="text-blue-500 text-sm hover:underline block mt-1">Link</a>}
              <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-wider">Added: {wish.createdAt.toLocaleString('zh-HK')}</p>
            </div>
            
            <div className="flex gap-2">
              {!wish.isVisited && (
                <form action={markAsVisited.bind(null, wish.id)}>
                  <button type="submit" className="text-green-600 font-bold bg-green-50 px-3 py-1 rounded border border-green-100 hover:bg-green-100">Done</button>
                </form>
              )}
              <form action={deleteWish.bind(null, wish.id)}>
                <button type="submit" className="text-red-500 font-bold bg-red-50 px-3 py-1 rounded border border-red-100 hover:bg-red-100">Delete</button>
              </form>
            </div>
          </div>
        ))}
        
        {wishes.length === 0 && (
          <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <p className="text-gray-500">搵唔到符合條件嘅項目 🔍</p>
          </div>
        )}
      </div>

      {/* 分頁按鈕 - 記得要把 filter 參數帶入 Link 裡面 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          {/* 呢度可以用一個 helper function 嚟產生 URL，或者簡單啲直接串埋一齊 */}
          {currentPage > 1 && (
            <Link 
              href={`/?page=${currentPage - 1}&limit=${pageSize}&category=${category}&status=${status}&search=${search}`}
              className="px-4 py-2 bg-white border rounded hover:bg-gray-50"
            >
              Previous
            </Link>
          )}
          <span className="text-sm">Page {currentPage} of {totalPages}</span>
          {currentPage < totalPages && (
            <Link 
              href={`/?page=${currentPage + 1}&limit=${pageSize}&category=${category}&status=${status}&search=${search}`}
              className="px-4 py-2 bg-white border rounded hover:bg-gray-50"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </main>
  )
}