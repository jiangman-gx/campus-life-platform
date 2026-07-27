import { useState, useEffect } from 'react'
import { apiGet } from '../config/api'
import LostFoundForm, { type SubmittedLostFound } from '../components/LostFoundForm'

// 失物招领数据类型定义
interface LostFoundItem {
  id: number
  type: string       // "丢失" | "捡到"
  title: string
  location: string
  time: string
  description: string
}

// 状态类型
type Status = 'loading' | 'success' | 'error'

// 类型标签样式配置
const typeStyles: Record<string, { bg: string; text: string; icon: string }> = {
  丢失: { bg: 'bg-red-50', text: 'text-red-600', icon: '❌' },
  捡到: { bg: 'bg-green-50', text: 'text-green-600', icon: '✅' },
}

export default function LostFoundPage() {
  // 数据状态
  const [items, setItems] = useState<LostFoundItem[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  // 发布信息弹窗状态
  const [showPostModal, setShowPostModal] = useState(false)
  // 新发布信息的提示标记（用于高亮"刚刚发布"的记录）
  const [newItemId, setNewItemId] = useState<number | null>(null)

  // 获取失物招领数据
  const fetchItems = async () => {
    setStatus('loading')
    setErrorMsg('')
    try {
      const result = await apiGet<LostFoundItem[]>('/api/lost-found')
      if (result.code === 200) {
        // 后端已按 created_at DESC 排序，直接取用
        setItems(result.data || [])
        setStatus('success')
      } else {
        throw new Error(result.message || '获取失物招领列表失败')
      }
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : '未知错误')
    }
  }

  // 页面加载时自动获取数据
  useEffect(() => {
    fetchItems()
  }, [])

  // 打开发布弹窗
  const openPostModal = () => {
    setShowPostModal(true)
  }

  // 关闭发布弹窗
  const closePostModal = () => {
    setShowPostModal(false)
  }

  // 发布成功处理：把新信息插入到列表顶部
  const handlePostSuccess = (submitted: SubmittedLostFound) => {
    // 若后端返回了完整数据（含 id/time），直接使用；否则本地构造
    const newItem: LostFoundItem = submitted.id
      ? {
          id: submitted.id,
          type: submitted.type,
          title: submitted.title,
          location: submitted.location,
          time: submitted.time || submitted.date,
          description: submitted.description,
        }
      : {
          id: items.reduce((max, item) => Math.max(max, item.id), 0) + 1,
          type: submitted.type,
          title: submitted.title,
          location: submitted.location,
          time: submitted.date,
          description: submitted.description,
        }

    // 插入到列表顶部
    setItems((prev) => [newItem, ...prev])
    // 标记为新发布的记录（用于高亮）
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

  // ESC 键关闭弹窗 + 弹窗打开时禁止 body 滚动
  useEffect(() => {
    if (!showPostModal) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePostModal()
      }
    }
    window.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [showPostModal])

  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">🔍 失物招领</h1>
      <p className="text-gray-500 text-center mb-8">丢失或捡到物品，来这里发布信息</p>

      {/* ============ 顶部操作栏：发布信息按钮 ============ */}
      <div className="max-w-3xl mx-auto mb-6 flex justify-center">
        <button
          onClick={openPostModal}
          className="px-6 py-3 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors duration-200 flex items-center"
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
          发布信息
        </button>
      </div>

      {/* ============ Loading 状态：骨架屏 ============ */}
      {status === 'loading' && (
        <div className="max-w-3xl mx-auto space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-md border border-gray-100 p-5 animate-pulse"
            >
              {/* 顶部：类型标签 + 标题占位 */}
              <div className="flex items-center mb-3">
                <div className="h-5 w-14 bg-gray-200 rounded-full mr-3"></div>
                <div className="h-5 bg-gray-200 rounded flex-grow w-2/3"></div>
              </div>
              {/* 位置 + 时间占位 */}
              <div className="flex gap-4 mb-2">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
              {/* 描述占位 */}
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
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
            onClick={fetchItems}
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

      {/* ============ Success 状态：失物招领列表 ============ */}
      {status === 'success' && (
        <>
          {/* 结果数量 */}
          <p className="text-center text-sm text-gray-400 mb-4">
            共 {items.length} 条记录
          </p>

          {/* 列表 */}
          {items.length > 0 ? (
            <div className="max-w-3xl mx-auto space-y-4">
              {items.map((item) => {
                const style = typeStyles[item.type] || { bg: 'bg-gray-50', text: 'text-gray-600', icon: '📋' }
                const isNew = newItemId === item.id

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-xl shadow-md hover:shadow-lg border p-5 transition-all duration-300 hover:-translate-y-0.5 animate-fade-in ${
                      isNew
                        ? 'border-green-400 ring-2 ring-green-200'
                        : 'border-gray-100'
                    }`}
                  >
                    {/* 新发布标记 */}
                    {isNew && (
                      <div className="bg-green-500 text-white text-xs font-medium px-3 py-1 -mt-5 -mx-5 mb-3 rounded-t-xl text-center">
                        ✨ 刚刚发布
                      </div>
                    )}

                    {/* 顶部：类型标签 + 标题 */}
                    <div className="flex items-center mb-3">
                      {/* 类型标签 */}
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mr-3 ${style.bg} ${style.text}`}
                      >
                        {style.icon} {item.type}
                      </span>
                      {/* 标题 */}
                      <h3 className="text-base font-bold text-gray-800 flex-grow">
                        {item.title}
                      </h3>
                    </div>

                    {/* 位置 + 时间 */}
                    <div className="flex flex-wrap gap-4 mb-2 text-sm text-gray-500">
                      <span className="flex items-center">
                        <span className="mr-1">📍</span>
                        {item.location}
                      </span>
                      <span className="flex items-center">
                        <span className="mr-1">🕐</span>
                        {item.time}
                      </span>
                    </div>

                    {/* 描述 */}
                    {item.description && (
                      <p className="text-sm text-gray-600 mt-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">📭</p>
              <p>暂无失物招领记录</p>
            </div>
          )}
        </>
      )}

      {/* ============ 发布信息 Modal 弹窗 ============ */}
      {showPostModal && (
        <div
          onClick={handleOverlayClick}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in"
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 animate-fade-in">
            {/* Modal 头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">发布失物招领</h2>
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
              <LostFoundForm onSuccess={handlePostSuccess} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
