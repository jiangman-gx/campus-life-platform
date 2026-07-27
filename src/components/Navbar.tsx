import { Link, useNavigate } from 'react-router-dom'

const navItems = [
  { name: '首页', path: '/' },
  { name: '课表', path: '/schedule' },
  { name: '食堂', path: '/canteen' },
  { name: '二手', path: '/trade' },
  { name: '失物招领', path: '/lost-found' },
]

export default function Navbar() {
  const navigate = useNavigate()

  // 从 localStorage 读取登录状态
  const token = localStorage.getItem('token')
  let username = ''
  if (token) {
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        const user = JSON.parse(stored)
        username = user.username || ''
      }
    } catch {
      // JSON 解析失败，清除无效数据
      localStorage.removeItem('user')
      localStorage.removeItem('token')
    }
  }

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1e3a5f] shadow-md h-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex justify-between items-center h-full">
          {/* 左侧平台名称 */}
          <Link to="/" className="text-xl font-bold text-white whitespace-nowrap">
            校园生活服务平台
          </Link>

          {/* 右侧导航链接 */}
          <div className="flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="text-white hover:text-blue-300 transition-colors duration-200 font-medium text-sm"
              >
                {item.name}
              </Link>
            ))}

            {/* 登录状态切换 */}
            {token ? (
              <div className="flex items-center space-x-3 ml-2">
                <span className="text-white text-sm font-medium">
                  👤 {username}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 border border-white/60 rounded-md text-white/80 hover:bg-white hover:text-[#1e3a5f] hover:border-white transition-colors duration-200 text-sm font-medium"
                >
                  退出登录
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="ml-2 px-4 py-1.5 border border-white rounded-md text-white hover:bg-white hover:text-[#1e3a5f] transition-colors duration-200 font-medium text-sm"
              >
                登录
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
