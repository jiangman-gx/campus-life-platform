import FeatureCard from '../components/FeatureCard'

export default function HomePage() {
  return (
    <div className="text-center">
      {/* 标题区域 */}
      <div className="py-12 md:py-20">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-4">
          校园生活服务平台
        </h1>
        <p className="text-lg md:text-2xl text-blue-500 font-medium">
          让校园生活更便捷
        </p>
      </div>

      {/* 功能卡片 2x2 网格（移动端 1 列） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto pb-12">
        <FeatureCard
          title="课表管理"
          description="查看和管理你的课程表"
          icon="📅"
          link="/schedule"
          color="bg-blue-100"
        />
        <FeatureCard
          title="食堂点评"
          description="查看食堂菜单和评价"
          icon="🍽️"
          link="/canteen"
          color="bg-orange-100"
        />
        <FeatureCard
          title="二手交易"
          description="买卖闲置物品"
          icon="🔄"
          link="/trade"
          color="bg-green-100"
        />
        <FeatureCard
          title="失物招领"
          description="发布和查找失物"
          icon="🔍"
          link="/lost-found"
          color="bg-purple-100"
        />
      </div>
    </div>
  )
}
