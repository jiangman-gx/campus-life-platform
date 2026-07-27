import { useState, useCallback, useRef } from 'react'
import RatingStars from './RatingStars'
import { apiPost } from '../config/api'

// ==================== 提交成功的评价数据 ====================
export interface SubmittedReview {
  id?: number
  canteenId: number
  username?: string
  rating: number
  content: string
  time?: string
}

// ==================== Props 类型定义 ====================
interface ReviewFormProps {
  canteenId: number
  onSubmitSuccess?: (review: SubmittedReview) => void
}

// ==================== 表单数据类型 ====================
interface FormData {
  rating: number
  content: string
}

// ==================== 错误类型 ====================
interface FormErrors {
  rating?: string
  content?: string
}

// ==================== Toast 类型 ====================
interface ToastState {
  message: string
  type: 'success' | 'error'
}

// ==================== 组件实现 ====================
export default function ReviewForm({ canteenId, onSubmitSuccess }: ReviewFormProps) {
  // 表单数据
  const [formData, setFormData] = useState<FormData>({
    rating: 0,
    content: '',
  })

  // 错误信息
  const [errors, setErrors] = useState<FormErrors>({})

  // 提交状态
  const [submitting, setSubmitting] = useState(false)

  // Toast 状态
  const [toast, setToast] = useState<ToastState | null>(null)

  // Toast 定时器 ref
  const toastTimerRef = useRef<number | null>(null)

  // 显示 Toast
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    // 清除之前的定时器
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
    }
    setToast({ message, type })
    // 3 秒后自动消失
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, 3000)
  }, [])

  // ==================== 评分变化 ====================
  const handleRatingChange = (rating: number) => {
    setFormData((prev) => ({ ...prev, rating }))
    // 清除评分错误
    if (errors.rating) {
      setErrors((prev) => ({ ...prev, rating: undefined }))
    }
  }

  // ==================== 评价内容变化 ====================
  const handleContentChange = (value: string) => {
    setFormData((prev) => ({ ...prev, content: value }))
    // 清除内容错误
    if (errors.content) {
      setErrors((prev) => ({ ...prev, content: undefined }))
    }
  }

  // ==================== 表单验证 ====================
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    const content = formData.content.trim()

    // 评分验证
    if (formData.rating === 0) {
      newErrors.rating = '请给食堂打分'
    }

    // 评价内容验证
    if (content === '') {
      newErrors.content = '请输入评价内容'
    } else if (content.length < 5) {
      newErrors.content = '评价至少5个字'
    } else if (content.length > 200) {
      newErrors.content = '评价不超过200个字'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ==================== 提交处理 ====================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 正在提交则阻止重复提交
    if (submitting) return

    // 验证表单
    if (!validateForm()) {
      showToast('请完善评价信息', 'error')
      return
    }

    // 开始提交
    setSubmitting(true)

    try {
      // 调用后端 API 提交评价
      const result = await apiPost('/api/reviews', {
        canteen_id: canteenId,
        rating: formData.rating,
        content: formData.content.trim(),
      })

      if (result.code === 201) {
        showToast('评价提交成功！', 'success')
        // 清空表单
        setFormData({ rating: 0, content: '' })
        setErrors({})
        // 将后端返回的完整评价数据传给父组件
        onSubmitSuccess?.(result.data as SubmittedReview)
      } else {
        showToast(result.message || '提交失败', 'error')
      }
    } catch (err) {
      showToast('提交失败，请稍后重试', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // 输入框基础样式
  const textareaClass = `w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition text-sm resize-none ${
    errors.content
      ? 'border-red-400 focus:ring-red-500'
      : 'border-gray-300 focus:ring-blue-500'
  }`

  return (
    <>
      {/* ============ Toast 提示 ============ */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div
            className={`px-6 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${
              toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      {/* ============ 表单卡片 ============ */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-md border border-gray-100 p-6 max-w-[640px] mx-auto"
      >
        {/* ---------- 评分区域（突出显示） ---------- */}
        <div className="bg-blue-50 rounded-lg p-4 mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            评分 <span className="text-red-500">*</span>
          </label>
          {/* 评分星星 */}
          <div className="flex items-center">
            <RatingStars
              rating={formData.rating}
              onChange={handleRatingChange}
            />
            {/* 当前选中评分数字 */}
            {formData.rating > 0 && (
              <span className="ml-3 px-2.5 py-1 bg-blue-900 text-white text-sm font-bold rounded-full">
                {formData.rating}.0 分
              </span>
            )}
          </div>
          {errors.rating && (
            <p className="text-red-500 text-xs mt-2">{errors.rating}</p>
          )}
        </div>

        {/* ---------- 评价内容 ---------- */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            评价内容 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => handleContentChange(e.target.value)}
            maxLength={200}
            rows={4}
            placeholder="说说你的用餐体验..."
            className={textareaClass}
          />
          <div className="flex justify-end mt-1">
            <span className="text-xs text-gray-400">
              {formData.content.length}/200
            </span>
          </div>
          {errors.content && (
            <p className="text-red-500 text-xs mt-1">{errors.content}</p>
          )}
        </div>

        {/* ---------- 提交按钮 ---------- */}
        <button
          type="submit"
          disabled={submitting}
          className={`w-full mt-5 py-3 rounded-lg font-semibold text-white transition-colors duration-200 flex items-center justify-center ${
            submitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-900 hover:bg-blue-800'
          }`}
        >
          {submitting ? (
            <>
              <svg
                className="animate-spin h-5 w-5 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              提交中...
            </>
          ) : (
            '提交评价'
          )}
        </button>
      </form>
    </>
  )
}
