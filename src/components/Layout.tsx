import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-blue-50">
      {/* 固定导航栏 */}
      <Navbar />
      {/* 主内容区 - 顶部留出导航栏高度（h-16 = 64px），底部用 margin-bottom 推开固定 Footer */}
      <main className="flex-grow w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 pb-8">
        <Outlet />
      </main>
      {/* 底部栏 */}
      <Footer />
    </div>
  )
}
