// app/components/StarRating.tsx
'use client'

import { useState, useTransition, useEffect } from 'react'
import { updateRating } from '../actions'

type RatingData = {
  id: string;
  score: number;
  comment: string | null;
  userId: string;
  user: { name: string | null; image: string | null };
}

export default function StarRating({ 
  wishId, 
  ratings, 
  currentUserId 
}: { 
  wishId: string; 
  ratings: RatingData[]; 
  currentUserId: string;
}) {
  const myData = ratings.find((r) => r.userId === currentUserId);
  const [rating, setRating] = useState(myData?.score || 0)
  const [comment, setComment] = useState(myData?.comment || "")
  const [hover, setHover] = useState(0)
  const [isPending, startTransition] = useTransition()

  // 當 Database 有更新時，同步返個本地狀態
  useEffect(() => {
    if (myData) {
      setRating(myData.score);
      setComment(myData.comment || "");
    }
  }, [myData]);

  const avg = ratings.length > 0 
    ? (ratings.reduce((acc, r) => acc + r.score, 0) / ratings.length).toFixed(1) 
    : 0;

  const handleRating = (rate: number) => {
    setRating(rate)
    startTransition(() => {
      updateRating(wishId, rate, comment)
    })
  }

  const handleCommentSubmit = () => {
    if (rating === 0) return; // 必須先評分先可以留言
    startTransition(() => {
      updateRating(wishId, rating, comment)
    })
  }

  return (
    <div className="mt-3 mb-1 bg-gray-50 dark:bg-gray-800/40 w-full rounded-xl border border-gray-100 dark:border-gray-800 p-4 transition-colors">
      
      {/* 1. 評分區 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">我嘅評分:</span>
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                disabled={isPending}
                className={`text-2xl transition-all duration-200 focus:outline-none ${
                  star <= (hover || rating) 
                    ? 'text-yellow-400 dark:text-yellow-500 scale-110' 
                    : 'text-gray-300 dark:text-gray-700 hover:text-gray-400'
                }`}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                onClick={() => handleRating(star)}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* 2. 留言輸入框 */}
        <div className="flex-1">
          <input 
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onBlur={handleCommentSubmit}
            placeholder={rating > 0 ? "寫句短評畀大家睇..." : "請先點擊星星評分"}
            disabled={rating === 0 || isPending}
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
          />
        </div>
      </div>

      {/* 3. 大家嘅評價清單 */}
      {ratings.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-800">
          <div className="text-[10px] uppercase tracking-widest font-bold text-gray-400 dark:text-gray-500">
            大家嘅評價 (平均 {avg} 🌟)
          </div>
          <div className="grid gap-3">
            {ratings.map((r) => (
              <div key={r.id} className="flex gap-3 items-start">
                {r.user?.image ? (
                  <img src={r.user.image} alt="avatar" className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold dark:text-gray-200">{r.user?.name}</span>
                    <span className="text-yellow-500 text-[10px]">
                      {'★'.repeat(r.score)}{'☆'.repeat(5 - r.score)}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 italic">
                      "{r.comment}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}