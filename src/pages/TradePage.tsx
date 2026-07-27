import { useState, useEffect } from 'react'
import { apiGet } from '../config/api'
import PostItemForm, { type SubmittedItem } from '../components/PostItemForm'

// 商品数据类型定义
interface Item {
  id: number
  title: string
  price: number
  category: string
  seller: string
  image: string
}

// 状态类型
type Status = 'loading' | 'success' | 'error'

// 分类标签列表
const categories = ['全部', '教材', '电子', '生活', '其他']

export default function TradePage() {
  // 数据状态
  const [items, setItems] = useState<Item[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  // 搜索与筛选状态
  const [keyword, setKeyword] = useState('')
  const [activeCategory, setActiveCategory] = useState('全部')

  // 每个商品的收藏状态：{ [itemId]: boolean }
  const [favorites, setFavorites] = useState<Record<number, boolean>>({})
  // 当前正在播放缩放动画的商品 id
  const [animatingId, setAnimatingId] = useState<number | null>(null)

  // 发布商品弹窗状态
  const [showPostModal, setShowPostModal] = useState(false)
  // 新发布商品的提示标记（用于高亮"刚刚发布"的商品）
  const [newItemId, setNewItemId] = useState<number | null>(null)

  // 获取商品数据（支持查询参数传给后端）
  const fetchItems = async (params?: { keyword?: string; category?: string }) => {
    setStatus('loading')
    setErrorMsg('')
    try {
      let url = '/api/items'
      const query = new URLSearchParams()
      if (params?.keyword && params.keyword.trim()) {
        query.append('keyword', params.keyword.trim())
      }
      if (params?.category && params.category !== '全部') {
        query.append('category', params.category)
      }
      const qs = query.toString()
      if (qs) url += `?${qs}`

      const result = await apiGet<{ items: Item[]; total: number; page: number; limit: number }>(url)
      if (result.code === 200) {
        setItems(result.data?.items || [])
        setStatus('success')
      } else {
        throw new Error(result.message || '获取商品列表失败')
      }
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : '未知错误')
    }
  }

  // 页面加载 + 搜索/筛选条件变化时自动获取数据
  useEffect(() => {
    fetchItems({ keyword, category: activeCategory })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, activeCategory])

  // 切换收藏状态，并触发缩放动画
  const toggleFavorite = (id: number) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }))
    // 触发动画
    setAnimatingId(id)
    // 200ms 后恢复
    window.setTimeout(() => setAnimatingId(null), 200)
  }

  // 打开发布弹窗
  const openPostModal = () => {
    setShowPostModal(true)
  }

  // 关闭发布弹窗
  const closePostModal = () => {
    setShowPostModal(false)
  }

  // 发布成功处理：把新商品插入到列表顶部
  const handlePostSuccess = (submitted: SubmittedItem) => {
    // 若后端返回了完整数据（含 id/seller/image），直接使用；否则本地构造
    const newItem: Item = submitted.id
      ? {
          id: submitted.id,
          title: submitted.title,
          price: submitted.price,
          category: submitted.category,
          seller: submitted.seller || submitted.contact,
          image: submitted.image || submitted.images[0] || '',
        }
      : {
          id: items.reduce((max, item) => Math.max(max, item.id), 0) + 1,
          title: submitted.title,
          price: submitted.price,
          category: submitted.category,
          seller: submitted.contact,
          image: submitted.images[0] || '',
        }

    // 插入到列表顶部
    setItems((prev) => [newItem, ...prev])
    // 标记为新发布的商品（用于高亮）
    setNewItemId(newItem.id)
    // 3 秒后取消高亮
    window.setTimeout(() => setNewItemId(null), 3000)
    // 关闭弹窗
    setShowPostModal(false)
  }

  // 点击遮罩层关闭弹窗
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 仅当点击的是遮罩层本身（而非内部内容）时关闭
    if (e.target === e.currentTarget) {
      closePostModal()
    }
  }

  // ESC 键关闭弹窗
  useEffect(() => {
    if (!showPostModal) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePostModal()
      }
    }
    window.addEventListener('keydown', handleEsc)
    // 弹窗打开时禁止 body 滚动
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [showPostModal])

  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">🔄 二手交易</h1>
      <p className="text-gray-500 text-center mb-8">浏览校园闲置好物</p>

      {/* 顶部操作栏：搜索框 + 发布按钮 */}
      <div className="max-w-5xl mx-auto mb-4 flex gap-3">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索商品名称或卖家"
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
        <button
          onClick={openPostModal}
          className="px-6 py-3 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors duration-200 whitespace-nowrap flex items-center"
        >
          <svg
            className="w-5 h-5 mr-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          发布商品
        </button>
      </div>

      {/* 分类标签 */}
      <div className="max-w-5xl mx-auto mb-6 flex flex-wrap justify-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${
              activeCategory === cat
                ? 'bg-blue-900 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ============ Loading 状态：骨架屏 ============ */}
      {status === 'loading' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden animate-pulse"
            >
              {/* 图片占位 */}
              <div className="w-full h-48 bg-gray-200"></div>
              {/* 信息占位 */}
              <div className="p-4">
                {/* 标题 + 分类占位 */}
                <div className="flex items-start justify-between mb-2">
                  <div className="h-4 bg-gray-200 rounded flex-grow mr-2"></div>
                  <div className="h-5 w-12 bg-gray-200 rounded-full"></div>
                </div>
                {/* 卖家占位 */}
                <div className="h-3 bg-gray-200 rounded w-1/3 mb-3"></div>
                {/* 价格占位 */}
                <div className="h-5 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============ Error 状态：错误提示卡片 ============ */}
      {status === 'error' && (
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-md border border-red-100 p-8 text-center">
          <div className="text-5xl mb-4">😵</div>
          <p className="text-gray-700 font-medium mb-1">加载失败，请检查网络连接</p>
          {errorMsg && (
            <p className="text-xs text-gray-400 mb-4">错误详情：{errorMsg}</p>
          )}
          <button
            onClick={() => fetchItems({ keyword, category: activeCategory })}
            className="px-5 py-2.5 bg-blue-900 text-white text-sm rounded-lg hover:bg-blue-800 transition-colors duration-200 inline-flex items-center"
          >
            <svg
              className="w-4 h-4 mr-1.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            重新加载
          </button>
        </div>
      )}

      {/* ============ Success 状态：商品列表 ============ */}
      {status === 'success' && (
        <>
          {/* 筛选结果数量 */}
          <p className="text-center text-sm text-gray-400 mb-4">
            共找到 {items.length} 件商品
          </p>

          {/* 商品列表 */}
          {items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {items.map((item) => {
                const isFavorited = !!favorites[item.id]
                const isAnimating = animatingId === item.id
                const isNew = newItemId === item.id

                return (
                  <div
                    key={item.id}
                    className={`group bg-white rounded-xl shadow-md hover:shadow-xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 animate-fade-in ${
                      isNew
                        ? 'border-green-400 ring-2 ring-green-200'
                        : 'border-gray-100'
                    }`}
                  >
                    {/* 新发布标记 */}
                    {isNew && (
                      <div className="bg-green-500 text-white text-xs font-medium px-3 py-1 text-center">
                        ✨ 刚刚发布
                      </div>
                    )}

                    {/* 商品图片区域 */}
                    <div className="relative">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
                          <span className="text-5xl opacity-40">📦</span>
                        </div>
                      )}

                      {/* 收藏按钮：右上角心形 */}
                      <button
                        onClick={() => toggleFavorite(item.id)}
                        aria-label={isFavorited ? '取消收藏' : '收藏商品'}
                        className={`absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-md transition-all duration-200 hover:scale-110 ${
                          isAnimating ? 'scale-150' : 'scale-100'
                        }`}
                      >
                        <span
                          className={`text-xl leading-none transition-colors duration-200 ${
                            isFavorited ? 'text-red-500' : 'text-gray-400'
                          }`}
                        >
                          {isFavorited ? '❤' : '♡'}
                        </span>
                      </button>
                    </div>

                    {/* 商品信息 */}
                    <div className="p-4">
                      {/* 标题 + 分类标签 */}
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-base font-bold text-gray-800 flex-grow line-clamp-1">
                          {item.title}
                        </h3>
                        <span className="ml-2 px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded-full whitespace-nowrap">
                          {item.category}
                        </span>
                      </div>

                      {/* 卖家 */}
                      <p className="text-xs text-gray-400 mb-3">
                        卖家：{item.seller}
                      </p>

                      {/* 价格 */}
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-bold text-red-500">
                          ¥{item.price}
                        </span>
                        {isFavorited && (
                          <span className="text-xs text-red-400">已收藏</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">🔍</p>
              <p>没有找到匹配的商品</p>
            </div>
          )}
        </>
      )}

      {/* ============ 发布商品 Modal 弹窗 ============ */}
      {showPostModal && (
        <div
          onClick={handleOverlayClick}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in"
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 animate-fade-in">
            {/* Modal 头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">发布二手商品</h2>
              <button
                onClick={closePostModal}
                aria-label="关闭弹窗"
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal 内容（表单） */}
            <div className="p-6">
              <PostItemForm
                onSuccess={handlePostSuccess}
                onCancel={closePostModal}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
