// app/components/StarRating.tsx
'use client'

import { useState, useTransition } from 'react'
import { updateRating } from '../actions'

export default function StarRating({ wishId, initialRating }: { wishId: string, initialRating: number | null }) {
  const [rating, setRating] = useState(initialRating || 0)
  const [hover, setHover] = useState(0)
  const [isPending, startTransition] = useTransition()

  const handleRating = (rate: number) => {
    setRating(rate)
    startTransition(() => {
      updateRating(wishId, rate)
    })
  }

  return (
    <div className="flex items-center gap-1 mt-3 mb-1 bg-gray-50 w-fit px-3 py-1.5 rounded-lg border border-gray-100">
      <span className="text-xs font-bold text-gray-500 mr-1 tracking-wide">評分:</span>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={isPending}
          className={`text-xl transition-all duration-200 focus:outline-none ${
            star <= (hover || rating) ? 'text-yellow-400 scale-110' : 'text-gray-300 hover:text-gray-400'
          }`}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => handleRating(star)}
          title={`${star} 星`}
        >
          ★
        </button>
      ))}
      {rating > 0 && <span className="ml-2 text-xs font-bold text-yellow-500">{rating}/5</span>}
    </div>
  )
}