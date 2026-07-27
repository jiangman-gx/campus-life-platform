import { Link } from 'react-router-dom'

// Props 类型定义
interface FeatureCardProps {
  title: string       // 卡片标题
  description: string // 卡片描述
  icon: string        // 卡片图标（emoji）
  link: string        // 点击跳转的路径
  color?: string      // 图标区域背景色（Tailwind 类名，如 bg-blue-100）
}

export default function FeatureCard({ title, description, icon, link, color = 'bg-gray-100' }: FeatureCardProps) {
  return (
    <Link
      to={link}
      className="group block w-full bg-white rounded-xl shadow-md hover:shadow-xl border border-gray-100 p-6 transition-all duration-300 hover:-translate-y-1 animate-fade-in"
    >
      {/* 上方：图标（大号 emoji，约 48px），带主题背景色 */}
      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${color} text-3xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>

      {/* 中间：标题（加粗，深色） */}
      <h3 className="text-lg font-bold text-gray-800 mb-2">
        {title}
      </h3>

      {/* 下方：描述文字（灰色，字号较小） */}
      <p className="text-sm text-gray-500 leading-relaxed">
        {description}
      </p>
    </Link>
  )
}
