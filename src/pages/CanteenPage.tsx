import { useState, useEffect, useCallback, useRef } from 'react'
import { apiGet, apiPost } from '../config/api'
import CanteenCard from '../components/CanteenCard'
import RatingStars from '../components/RatingStars'
import ReviewForm, { type SubmittedReview } from '../components/ReviewForm'

// 评价数据类型
interface Review {
  id: number
  canteenId: number
  username: string
  content: string
  rating: number
  time: string
}

// 食堂数据类型定义
interface Canteen {
  id: number
  name: string
  location: string
  rating: number
  tags: string[]
  image: string
}

// Toast 类型
interface ToastState {
  message: string
  type: 'success' | 'error'
}

// 分类标签列表
const categories = ['全部', '第一食堂', '第二食堂', '第三食堂', '教工食堂']

// 状态类型
type Status = 'loading' | 'success' | 'error'

export default function CanteenPage() {
  // 数据状态
  const [canteens, setCanteens] = useState<Canteen[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  // 搜索与筛选状态
  const [keyword, setKeyword] = useState('')
  const [activeCategory, setActiveCategory] = useState('全部')
  // 当前展开的食堂 id（null 表示都收起）
  const [expandedId, setExpandedId] = useState<number | null>(null)
  // 用户提交的新评价列表（用于在历史评价顶部展示）
  const [userReviews, setUserReviews] = useState<Review[]>([])
  // 从后端获取的各食堂历史评价：{ [canteenId]: Review[] }
  const [canteenReviewsMap, setCanteenReviewsMap] = useState<Record<number, Review[]>>({})

  // AI 总结状态
  const [aiSummaries, setAiSummaries] = useState<Record<number, string>>({})
  const [aiLoading, setAiLoading] = useState<Record<number, boolean>>({})

  // Toast 状态
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
    }
    setToast({ message, type })
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, 3000)
  }, [])

  // 获取食堂数据
  const fetchCanteens = async () => {
    setStatus('loading')
    setErrorMsg('')
    try {
      const result = await apiGet<Canteen[]>('/api/canteens')
      if (result.code === 200) {
        setCanteens(result.data || [])
        setStatus('success')
      } else {
        throw new Error(result.message || '获取食堂列表失败')
      }
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : '未知错误')
    }
  }

  // 获取指定食堂的评价列表
  const fetchReviews = async (canteenId: number) => {
    try {
      const result = await apiGet<{ reviews: Review[]; total: number; page: number; limit: number }>(
        `/api/reviews?canteen_id=${canteenId}`
      )
      if (result.code === 200 && result.data) {
        setCanteenReviewsMap((prev) => ({
          ...prev,
          [canteenId]: result.data!.reviews,
        }))
      }
    } catch (err) {
      console.error('获取评价列表失败:', err)
    }
  }

  // 调用 AI 生成评价总结
  const handleAISummary = async (canteenId: number) => {
    // 检查是否已登录
    const token = localStorage.getItem('token')
    if (!token) {
      showToast('请先登录', 'error')
      return
    }

    // 检查是否已有缓存结果
    if (aiSummaries[canteenId]) {
      return
    }

    // 防止重复点击
    if (aiLoading[canteenId]) {
      return
    }

    setAiLoading((prev) => ({ ...prev, [canteenId]: true }))

    try {
      const result = await apiPost<{ summary: string }>('/api/ai/summarize-reviews', {
        canteen_id: canteenId,
      })

      if (result.code === 200 && result.data) {
        setAiSummaries((prev) => ({
          ...prev,
          [canteenId]: result.data!.summary,
        }))
      } else {
        showToast(result.message || 'AI总结失败，请稍后重试', 'error')
      }
    } catch {
      showToast('AI总结失败，请稍后重试', 'error')
    } finally {
      setAiLoading((prev) => ({ ...prev, [canteenId]: false }))
    }
  }

  // 解析 AI 总结为三行
  const parseSummary = (summary: string): string[] => {
    if (!summary) return []
    // 按句号、换行、分号分割
    const lines = summary
      .split(/[。\n；;]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    // 如果分割结果不足3段，直接返回原始文本的前三句话
    if (lines.length < 3) {
      const sentences = summary
        .split(/[。！？\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      return sentences.slice(0, 3)
    }
    return lines.slice(0, 3)
  }

  // 页面加载时自动获取数据
  useEffect(() => {
    fetchCanteens()
  }, [])

  // 双条件叠加筛选
  const filteredCanteens = canteens.filter((canteen) => {
    const matchKeyword =
      keyword === '' ||
      canteen.name.toLowerCase().includes(keyword.toLowerCase()) ||
      canteen.location.toLowerCase().includes(keyword.toLowerCase())

    const matchCategory =
      activeCategory === '全部' || canteen.name === activeCategory

    return matchKeyword && matchCategory
  })

  // 切换展开/收起
  const toggleExpand = (id: number) => {
    const nextId = expandedId === id ? null : id
    setExpandedId(nextId)
    // 展开时，若尚未获取该食堂的评价，则自动获取
    if (nextId !== null && !canteenReviewsMap[nextId]) {
      fetchReviews(nextId)
    }
  }

  // 评价提交成功处理
  const handleReviewSubmitSuccess = (submitted: SubmittedReview) => {
    const allReviews = [...userReviews, ...Object.values(canteenReviewsMap).flat()]
    const maxId = allReviews.reduce((max, r) => Math.max(max, r.id), 0)
    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`

    const newReview: Review = {
      id: submitted.id ?? maxId + 1,
      canteenId: submitted.canteenId,
      username: submitted.username ?? '我',
      content: submitted.content,
      rating: submitted.rating,
      time: submitted.time ?? timeStr,
    }

    setUserReviews((prev) => [newReview, ...prev])
  }

  return (
    <div className="py-8">
      {/* ============ Toast 提示 ============ */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div
            className={`px-6 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${
              toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">🍽️ 食堂点评</h1>
      <p className="text-gray-500 text-center mb-8">查看各食堂评分与位置</p>

      {/* 搜索框 */}
      <div className="max-w-3xl mx-auto mb-4">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索食堂名称或位置"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
      </div>

      {/* 分类标签 */}
      <div className="max-w-3xl mx-auto mb-6 flex flex-wrap justify-center gap-2">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-md border border-gray-100 p-5 animate-pulse"
            >
              <div className="flex items-center mb-3">
                <div className="w-12 h-12 rounded-xl bg-gray-200 mr-3"></div>
                <div className="h-5 bg-gray-200 rounded flex-grow w-2/3"></div>
              </div>
              <div className="mb-2">
                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
              </div>
              <div className="mb-3">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="flex gap-2">
                <div className="h-5 w-14 bg-gray-200 rounded-full"></div>
                <div className="h-5 w-14 bg-gray-200 rounded-full"></div>
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
            onClick={fetchCanteens}
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

      {/* ============ Success 状态：食堂列表 ============ */}
      {status === 'success' && (
        <>
          {/* 筛选结果数量 */}
          <p className="text-center text-sm text-gray-400 mb-4">
            共找到 {filteredCanteens.length} 个食堂
          </p>

          {/* 食堂卡片列表 */}
          {filteredCanteens.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {filteredCanteens.map((canteen) => {
                const isExpanded = expandedId === canteen.id
                const canteenUserReviews = userReviews.filter((r) => r.canteenId === canteen.id)
                const canteenHistoryReviews = canteenReviewsMap[canteen.id] || []
                const canteenReviews = [...canteenUserReviews, ...canteenHistoryReviews]
                const aiSummary = aiSummaries[canteen.id]
                const isAiLoading = aiLoading[canteen.id]

                return (
                  <div key={canteen.id}>
                    {/* 食堂卡片 */}
                    <CanteenCard
                      name={canteen.name}
                      rating={canteen.rating}
                      location={canteen.location}
                      tags={canteen.tags}
                      expanded={isExpanded}
                      onToggle={() => toggleExpand(canteen.id)}
                    />

                    {/* 展开的评价区域 */}
                    {isExpanded && (
                      <div className="mt-3 bg-gray-50 rounded-xl border border-gray-100 p-5 animate-fade-in">
                        {/* ========== AI 总结区域 ========== */}
                        <div className="mb-5">
                          <div className="flex items-center gap-3 mb-3">
                            <button
                              onClick={() => handleAISummary(canteen.id)}
                              disabled={isAiLoading}
                              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                                isAiLoading
                                  ? 'bg-purple-400 text-white cursor-not-allowed'
                                  : 'bg-purple-600 text-white hover:bg-purple-700'
                              }`}
                            >
                              {isAiLoading ? (
                                <>
                                  <svg
                                    className="animate-spin h-4 w-4"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                  </svg>
                                  分析中...
                                </>
                              ) : (
                                <>🤖 AI总结</>
                              )}
                            </button>
                            <span className="text-xs text-gray-400">让AI帮你分析评价</span>
                          </div>

                          {/* AI 总结结果卡片 */}
                          {aiSummary && (
                            <div className="bg-white rounded-xl border border-purple-200 p-4 animate-fade-in">
                              <h5 className="text-sm font-bold text-purple-700 mb-3">📊 AI评价总结</h5>
                              <div className="space-y-2">
                                {parseSummary(aiSummary).map((line, idx) => {
                                  const icons = ['📝', '🍽️', '💰']
                                  return (
                                    <div key={idx} className="flex items-start gap-2">
                                      <span className="text-base flex-shrink-0">{icons[idx] || '•'}</span>
                                      <p className="text-sm text-gray-700 leading-relaxed">{line}</p>
                                    </div>
                                  )
                                })}
                              </div>
                              <p className="text-xs text-gray-400 mt-3 text-right">由AI生成，仅供参考</p>
                            </div>
                          )}
                        </div>

                        {/* 写评价区域 */}
                        <div className="mb-5">
                          <h4 className="text-sm font-bold text-gray-700 mb-3">写评价</h4>
                          <ReviewForm
                            canteenId={canteen.id}
                            onSubmitSuccess={handleReviewSubmitSuccess}
                          />
                        </div>

                        {/* 评价列表 */}
                        <div className="border-t border-gray-200 pt-4">
                          <h4 className="text-sm font-bold text-gray-700 mb-3">
                            全部评价（{canteenReviews.length} 条）
                          </h4>
                          <div className="space-y-3">
                            {canteenReviews.length > 0 ? (
                              canteenReviews.map((review, index) => {
                                const isUserReview = index < canteenUserReviews.length
                                return (
                                  <div
                                    key={review.id}
                                    className={`bg-white rounded-lg p-3 border ${
                                      isUserReview
                                        ? 'border-green-300 ring-1 ring-green-200'
                                        : 'border-gray-100'
                                    }`}
                                  >
                                    {isUserReview && (
                                      <div className="mb-1">
                                        <span className="inline-block px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded-full">
                                          ✨ 刚刚发布
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-medium text-gray-700">{review.username}</span>
                                      <span className="text-xs text-gray-400">{review.time}</span>
                                    </div>
                                    <div className="mb-1">
                                      <RatingStars rating={review.rating} readonly />
                                    </div>
                                    <p className="text-sm text-gray-600">{review.content}</p>
                                  </div>
                                )
                              })
                            ) : (
                              <p className="text-sm text-gray-400 text-center py-2">暂无评价</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">🔍</p>
              <p>没有找到匹配的食堂</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
