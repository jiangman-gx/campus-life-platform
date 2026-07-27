import RatingStars from './RatingStars'

// Props 类型定义
interface CanteenCardProps {
  name: string            // 食堂名称
  rating: number          // 评分（0-5）
  location: string        // 食堂位置
  tags?: string[]         // 标签数组（可选）
  expanded?: boolean      // 是否展开评价区域
  onToggle?: () => void   // 点击卡片切换展开/收起
}

export default function CanteenCard({ name, rating, location, tags, expanded = false, onToggle }: CanteenCardProps) {
  return (
    <div
      onClick={onToggle}
      className="group block w-full bg-white rounded-xl shadow-md hover:shadow-xl border border-gray-100 p-5 transition-all duration-300 hover:-translate-y-1 animate-fade-in cursor-pointer"
    >
      {/* 顶部：图标 + 食堂名称 */}
      <div className="flex items-center mb-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-orange-100 text-2xl mr-3 group-hover:scale-110 transition-transform duration-300">
          🍽️
        </div>
        <h3 className="text-lg font-bold text-gray-800 flex-grow">{name}</h3>
        {/* 展开/收起指示器 */}
        <span className={`text-gray-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </div>

      {/* 评分（RatingStars 只读模式） */}
      <div className="mb-2">
        <RatingStars rating={rating} readonly />
      </div>

      {/* 位置信息 */}
      <p className="text-sm text-gray-500 flex items-center mb-3">
        <span className="mr-1">📍</span>
        {location}
      </p>

      {/* 标签 */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-orange-50 text-orange-600 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
