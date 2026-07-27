import { useState, useCallback, useRef } from 'react'
import { apiPost } from '../config/api'

// ==================== 提交成功的失物招领数据 ====================
export interface SubmittedLostFound {
  id?: number
  type: '丢失' | '捡到'
  title: string
  location: string
  date: string
  description: string
  time?: string
}

// ==================== Props 类型定义 ====================
interface LostFoundFormProps {
  onSuccess?: (item: SubmittedLostFound) => void
}

// ==================== 表单数据类型 ====================
interface FormData {
  type: '' | '丢失' | '捡到'
  title: string
  location: string
  date: string
  description: string
}

// ==================== 错误类型 ====================
interface FormErrors {
  type?: string
  title?: string
  location?: string
  date?: string
  description?: string
}

// ==================== Toast 类型 ====================
interface ToastState {
  message: string
  type: 'success' | 'error'
}

// ==================== 类型选项配置 ====================
const typeOptions: { value: '丢失' | '捡到'; label: string; icon: string }[] = [
  { value: '丢失', label: '丢失', icon: '❌' },
  { value: '捡到', label: '捡到', icon: '✅' },
]

// ==================== 组件实现 ====================
export default function LostFoundForm({ onSuccess }: LostFoundFormProps) {
  // 表单数据
  const [formData, setFormData] = useState<FormData>({
    type: '',
    title: '',
    location: '',
    date: '',
    description: '',
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

  // ==================== 类型切换 ====================
  const handleTypeSelect = (type: '丢失' | '捡到') => {
    setFormData((prev) => ({ ...prev, type }))
    // 清除类型错误
    if (errors.type) {
      setErrors((prev) => ({ ...prev, type: undefined }))
    }
  }

  // ==================== 字段更新 ====================
  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // 清除对应字段的错误
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  // ==================== 失焦验证 ====================
  const handleBlur = (field: keyof FormData) => {
    const value = formData[field].trim()
    const newErrors = { ...errors }

    if (field === 'title') {
      if (value === '') newErrors.title = '请输入物品名称'
      else if (value.length < 2) newErrors.title = '物品名称至少2个字'
      else if (value.length > 20) newErrors.title = '物品名称不超过20个字'
      else delete newErrors.title
    }
    if (field === 'location') {
      if (value === '') newErrors.location = '请输入地点'
      else delete newErrors.location
    }
    if (field === 'date') {
      if (value === '') newErrors.date = '请选择日期'
      else delete newErrors.date
    }
    if (field === 'description') {
      if (value === '') newErrors.description = '请输入描述'
      else if (value.length < 5) newErrors.description = '描述至少5个字'
      else if (value.length > 200) newErrors.description = '描述不超过200个字'
      else delete newErrors.description
    }

    setErrors(newErrors)
  }

  // ==================== 表单验证 ====================
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    const title = formData.title.trim()
    const location = formData.location.trim()
    const date = formData.date.trim()
    const description = formData.description.trim()

    // 类型验证
    if (formData.type === '') {
      newErrors.type = '请选择类型'
    }

    // 物品名称验证
    if (title === '') {
      newErrors.title = '请输入物品名称'
    } else if (title.length < 2) {
      newErrors.title = '物品名称至少2个字'
    } else if (title.length > 20) {
      newErrors.title = '物品名称不超过20个字'
    }

    // 地点验证
    if (location === '') {
      newErrors.location = '请输入地点'
    }

    // 日期验证
    if (date === '') {
      newErrors.date = '请选择日期'
    }

    // 描述验证
    if (description === '') {
      newErrors.description = '请输入描述'
    } else if (description.length < 5) {
      newErrors.description = '描述至少5个字'
    } else if (description.length > 200) {
      newErrors.description = '描述不超过200个字'
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
      showToast('请完善表单信息', 'error')
      return
    }

    // 开始提交
    setSubmitting(true)

    try {
      // 调用后端 API 发布失物招领信息
      const result = await apiPost('/api/lost-found', {
        type: formData.type,
        title: formData.title.trim(),
        location: formData.location.trim(),
        date: formData.date,
        description: formData.description.trim(),
      })

      if (result.code === 201) {
        showToast('发布成功！', 'success')
        // 清空表单
        setFormData({ type: '', title: '', location: '', date: '', description: '' })
        setErrors({})
        // 将后端返回的完整数据传给父组件（已适配前端字段）
        onSuccess?.(result.data as SubmittedLostFound)
      } else {
        showToast(result.message || '发布失败', 'error')
      }
    } catch (err) {
      showToast('发布失败', 'error')
      // 失败时保留用户已填内容（不清空表单）
    } finally {
      setSubmitting(false)
    }
  }

  // 输入框基础样式
  const inputBaseClass =
    'w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition text-sm'
  const getInputClass = (field: keyof FormErrors) =>
    `${inputBaseClass} ${
      errors[field]
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
        className="bg-white rounded-xl shadow-md border border-gray-100 p-6 max-w-[640px] mx-auto space-y-5"
      >
        {/* ---------- 类型切换（突出显示） ---------- */}
        <div className="bg-blue-50 rounded-lg p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            类型 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {typeOptions.map((opt) => {
              const isSelected = formData.type === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleTypeSelect(opt.value)}
                  className={`py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center ${
                    isSelected
                      ? 'bg-blue-900 text-white shadow-md scale-[1.02]'
                      : 'bg-white text-gray-500 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  <span className="mr-2 text-base">{opt.icon}</span>
                  {opt.label}
                </button>
              )
            })}
          </div>
          {errors.type && (
            <p className="text-red-500 text-xs mt-2">{errors.type}</p>
          )}
        </div>

        {/* ---------- 物品名称 ---------- */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            物品名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            onBlur={() => handleBlur('title')}
            maxLength={20}
            placeholder="请输入物品名称（2-20字）"
            className={getInputClass('title')}
          />
          {errors.title && (
            <p className="text-red-500 text-xs mt-1">{errors.title}</p>
          )}
        </div>

        {/* ---------- 地点 + 时间（同一行） ---------- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* 地点 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              地点 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => updateField('location', e.target.value)}
              onBlur={() => handleBlur('location')}
              placeholder="如：图书馆二楼"
              className={getInputClass('location')}
            />
            {errors.location && (
              <p className="text-red-500 text-xs mt-1">{errors.location}</p>
            )}
          </div>

          {/* 时间 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              时间 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => updateField('date', e.target.value)}
              onBlur={() => handleBlur('date')}
              className={getInputClass('date')}
            />
            {errors.date && (
              <p className="text-red-500 text-xs mt-1">{errors.date}</p>
            )}
          </div>
        </div>

        {/* ---------- 描述 ---------- */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            描述 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            onBlur={() => handleBlur('description')}
            maxLength={200}
            rows={4}
            placeholder="请详细描述物品的特征（5-200字）"
            className={`${getInputClass('description')} resize-none`}
          />
          <div className="flex justify-end mt-1">
            <span className="text-xs text-gray-400">
              {formData.description.length}/200
            </span>
          </div>
          {errors.description && (
            <p className="text-red-500 text-xs mt-1">{errors.description}</p>
          )}
        </div>

        {/* ---------- 提交按钮 ---------- */}
        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-3 rounded-lg font-semibold text-white transition-colors duration-200 flex items-center justify-center ${
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
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                ></path>
              </svg>
              提交中...
            </>
          ) : (
            '发布信息'
          )}
        </button>
      </form>
    </>
  )
}
