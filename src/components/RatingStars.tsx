import { useState } from 'react'

// Props 类型定义
interface RatingStarsProps {
  rating: number                          // 当前评分（0-5）
  onChange?: (rating: number) => void     // 评分变化时的回调函数
  readonly?: boolean                      // 是否只读模式（默认 false）
}

export default function RatingStars({ rating, onChange, readonly = false }: RatingStarsProps) {
  // 悬停预览的评分（0 表示未悬停）
  const [hoverRating, setHoverRating] = useState(0)

  // 实际显示的评分：悬停时用 hoverRating，否则用实际 rating
  const displayRating = hoverRating || rating

  return (
    <div className="inline-flex items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          // 只读模式下不可点击
          onClick={readonly ? undefined : () => onChange?.(star)}
          // 只读模式下不响应悬停
          onMouseEnter={readonly ? undefined : () => setHoverRating(star)}
          onMouseLeave={readonly ? undefined : () => setHoverRating(0)}
          className={`text-2xl transition-colors duration-150 ${
            readonly ? 'cursor-default' : 'cursor-pointer'
          } ${
            star <= displayRating
              ? 'text-yellow-400'
              : 'text-gray-300'
          }`}
        >
          {star <= displayRating ? '★' : '☆'}
        </span>
      ))}
      {/* 评分数字 */}
      <span className="ml-2 text-sm text-gray-500">
        {rating.toFixed(1)}
      </span>
    </div>
  )
}
