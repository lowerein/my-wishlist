// app/components/StarRating.tsx
'use client'
import { useState, useEffect } from 'react'
import { updateRating } from '../actions'

export default function StarRating({ 
  wishId, 
  ratings, 
  currentUserId 
}: { 
  wishId: string, 
  ratings: any[], 
  currentUserId: string 
}) {
  // 搵返自己嘅評分物件
  const userRatingObj = ratings.find((r) => r.userId === currentUserId)
  const userScore = userRatingObj ? userRatingObj.score : 0
  const userComment = userRatingObj ? userRatingObj.comment : ''
  
  // 計算平均分
  const avgScore = ratings.length 
    ? (ratings.reduce((acc, r) => acc + r.score, 0) / ratings.length).toFixed(1)
    : 0

  // 狀態管理
  const [score, setScore] = useState(userScore)
  const [hover, setHover] = useState<number | null>(null)
  const [comment, setComment] = useState(userComment || '')
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false) // 控制是否顯示留言框

  // 當 ratings 更新時（例如重新整理頁面），同步返個 state
  useEffect(() => {
    setScore(userScore)
    setComment(userComment || '')
  }, [userScore, userComment])

  // 決定目前顯示嘅星數
  const currentDisplay = hover !== null ? hover : score

  // 提交評分同留言
  const handleSubmit = async () => {
    if (score === 0) return alert('請先選擇星級呀！⭐')
    setIsLoading(true)
    await updateRating(wishId, score, comment) // <--- 傳入埋 comment
    setIsLoading(false)
    setIsEditing(false)
  }

  return (
    <div className="flex flex-col gap-3 mt-1">
      {/* 星星選擇區 */}
      <div className="flex flex-col gap-1">
        <div 
          className="flex items-center gap-1" 
          onMouseLeave={() => setHover(null)} 
        >
          {[1, 2, 3, 4, 5].map((star) => {
            const isFull = currentDisplay >= star;
            const isHalf = currentDisplay >= star - 0.5 && !isFull;
            const widthPercentage = isFull ? '100%' : isHalf ? '50%' : '0%';

            return (
              <div 
                key={star} 
                className={`relative w-6 h-6 transition-opacity ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <div 
                  className="absolute top-0 left-0 w-1/2 h-full z-10 cursor-pointer" 
                  onMouseEnter={() => setHover(star - 0.5)}
                  onClick={() => { setScore(star - 0.5); setIsEditing(true); }}
                />
                <div 
                  className="absolute top-0 right-0 w-1/2 h-full z-10 cursor-pointer" 
                  onMouseEnter={() => setHover(star)}
                  onClick={() => { setScore(star); setIsEditing(true); }}
                />
                
                <svg className="absolute top-0 left-0 w-6 h-6 text-gray-200 dark:text-gray-700 pointer-events-none" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>

                <div className="absolute top-0 left-0 h-full overflow-hidden pointer-events-none transition-all duration-100" style={{ width: widthPercentage }}>
                  <svg className="w-6 h-6 text-yellow-400 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
              </div>
            )
          })}

          <span className="text-[10px] font-bold text-gray-400 ml-2">
            {score > 0 ? `${score} 星` : '點擊評分'} 
            {ratings.length > 0 && ` • 平均 ${avgScore} (${ratings.length})`}
          </span>
        </div>
      </div>

      {/* 評語輸入區 (點擊星星後展開，或者本身有評語就顯示) */}
      {(isEditing || userComment) ? (
        <div className="space-y-2 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 shadow-inner">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="覺得點樣？留低你嘅評價啦..."
            rows={2}
            className="w-full p-2 text-xs border border-gray-100 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900 outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-md transition disabled:opacity-50"
            >
              {isLoading ? '儲存中...' : '💾 儲存評分'}
            </button>
            <button
              onClick={() => { setIsEditing(false); setScore(userScore); setComment(userComment || ''); }}
              className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold px-3 py-1.5 rounded-md transition"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsEditing(true)}
          className="text-left text-[10px] text-blue-500 hover:underline font-bold"
        >
          ＋ 加入評價留言
        </button>
      )}
    </div>
  )
}