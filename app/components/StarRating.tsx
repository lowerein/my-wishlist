// app/components/StarRating.tsx
'use client'
import { useState } from 'react'
import { updateRating } from '../actions' // <--- 改為 import 你自己嘅 updateRating

export default function StarRating({ 
  wishId, 
  ratings, 
  currentUserId 
}: { 
  wishId: string, 
  ratings: any[], 
  currentUserId: string 
}) {
  // 搵返自己嘅評分
  const userRatingObj = ratings.find((r) => r.userId === currentUserId)
  const userScore = userRatingObj ? userRatingObj.score : 0
  
  // 計算平均分 (保留 1 個小數位)
  const avgScore = ratings.length 
    ? (ratings.reduce((acc, r) => acc + r.score, 0) / ratings.length).toFixed(1)
    : 0

  const [hover, setHover] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 點擊評分
  const handleRate = async (newScore: number) => {
    setIsLoading(true)
    // 👇 呼叫你原本寫落嘅 updateRating (唔傳 comment 就會自動變 undefined/null) 👇
    await updateRating(wishId, newScore) 
    setIsLoading(false)
  }

  // 決定目前顯示嘅分數（Hover 優先，否則顯示自己嘅評分）
  const currentDisplay = hover !== null ? hover : userScore

  return (
    <div className="flex flex-col gap-1 mt-1">
      <div 
        className="flex items-center gap-1" 
        onMouseLeave={() => setHover(null)} 
      >
        {[1, 2, 3, 4, 5].map((star) => {
          // 判斷呢粒星應該係「全滿」、「半滿」定「吉」
          const isFull = currentDisplay >= star;
          const isHalf = currentDisplay >= star - 0.5 && !isFull;
          const widthPercentage = isFull ? '100%' : isHalf ? '50%' : '0%';

          return (
            <div 
              key={star} 
              className={`relative w-6 h-6 transition-opacity ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {/* 左半邊觸發區 (-0.5分) */}
              <div 
                className="absolute top-0 left-0 w-1/2 h-full z-10 cursor-pointer" 
                onMouseEnter={() => setHover(star - 0.5)}
                onClick={() => handleRate(star - 0.5)}
              />
              
              {/* 右半邊觸發區 (足金全分) */}
              <div 
                className="absolute top-0 right-0 w-1/2 h-full z-10 cursor-pointer" 
                onMouseEnter={() => setHover(star)}
                onClick={() => handleRate(star)}
              />
              
              {/* 底層：灰色空心星 */}
              <svg className="absolute top-0 left-0 w-6 h-6 text-gray-200 dark:text-gray-700 pointer-events-none" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>

              {/* 頂層：黃色實心星 (利用 width 切割一半) */}
              <div className="absolute top-0 left-0 h-full overflow-hidden pointer-events-none transition-all duration-100" style={{ width: widthPercentage }}>
                <svg className="w-6 h-6 text-yellow-400 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
            </div>
          )
        })}

        {/* 分數資訊 */}
        <span className="text-[10px] font-bold text-gray-400 ml-2">
          {userScore > 0 ? `你評了 ${userScore} 星` : '點擊評分'} 
          {ratings.length > 0 && ` • 平均 ${avgScore} (${ratings.length})`}
        </span>
      </div>
    </div>
  )
}