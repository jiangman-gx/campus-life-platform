import { useState, useRef, useCallback } from 'react'
import { apiPost } from '../config/api'

// ==================== 提交成功的商品数据 ====================
export interface SubmittedItem {
  id?: number
  title: string
  description: string
  price: number
  category: string
  contact: string
  images: string[]
  seller?: string
  image?: string
}

// ==================== Props 类型定义 ====================
interface PostItemFormProps {
  onSuccess?: (item: SubmittedItem) => void
  onCancel?: () => void
}

// ==================== 表单数据类型 ====================
interface FormData {
  title: string
  description: string
  price: string
  category: string
  contact: string
  condition: string
}

// ==================== 错误类型 ====================
interface FormErrors {
  title?: string
  description?: string
  price?: string
  category?: string
  contact?: string
}

// ==================== Toast 类型 ====================
interface ToastState {
  message: string
  type: 'success' | 'error'
}

// ==================== 分类选项 ====================
const categoryOptions = [
  { value: '', label: '请选择分类' },
  { value: '教材', label: '教材' },
  { value: '电子', label: '电子' },
  { value: '生活', label: '生活' },
  { value: '其他', label: '其他' },
]

// ==================== 组件实现 ====================
export default function PostItemForm({ onSuccess, onCancel }: PostItemFormProps) {
  // 表单数据
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    price: '',
    category: '',
    contact: '',
    condition: '',
  })

  // 错误信息
  const [errors, setErrors] = useState<FormErrors>({})

  // 提交状态
  const [submitting, setSubmitting] = useState(false)

  // AI 生成状态
  const [aiLoading, setAiLoading] = useState(false)

  // Toast 状态
  const [toast, setToast] = useState<ToastState | null>(null)

  // 图片预览列表（存 DataURL 用于预览）
  const [images, setImages] = useState<string[]>([])

  // 拖拽高亮状态
  const [dragOver, setDragOver] = useState(false)

  // 文件输入 ref
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // ==================== 字段更新 ====================
  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  // ==================== 失焦验证 ====================
  const handleBlur = (field: keyof FormData) => {
    const value = formData[field].trim()
    const newErrors = { ...errors }

    if (field === 'title') {
      if (value === '') newErrors.title = '请输入商品名称'
      else if (value.length < 2) newErrors.title = '商品名称至少2个字'
      else delete newErrors.title
    }
    if (field === 'description') {
      if (value === '') newErrors.description = '请输入商品描述'
      else if (value.length < 10) newErrors.description = '描述至少10个字'
      else delete newErrors.description
    }
    if (field === 'price') {
      if (value === '') newErrors.price = '请输入价格'
      else if (parseFloat(value) <= 0 || isNaN(parseFloat(value))) newErrors.price = '请输入有效的价格'
      else delete newErrors.price
    }
    if (field === 'category') {
      if (value === '') newErrors.category = '请选择分类'
      else delete newErrors.category
    }
    if (field === 'contact') {
      if (value === '') newErrors.contact = '请填写联系方式'
      else delete newErrors.contact
    }

    setErrors(newErrors)
  }

  // ==================== 图片处理 ====================
  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const remaining = 3 - images.length
    const fileArray = Array.from(files).slice(0, remaining)

    fileArray.forEach((file) => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result
        if (typeof result === 'string') {
          setImages((prev) => [...prev, result])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  // 点击上传区域触发文件选择
  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  // 删除指定图片
  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  // 拖拽事件
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  // ==================== 表单验证 ====================
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    const title = formData.title.trim()
    const description = formData.description.trim()
    const price = formData.price.trim()
    const category = formData.category.trim()
    const contact = formData.contact.trim()

    // 商品名称
    if (title === '') newErrors.title = '请输入商品名称'
    else if (title.length < 2) newErrors.title = '商品名称至少2个字'
    else if (title.length > 30) newErrors.title = '商品名称不超过30个字'

    // 商品描述
    if (description === '') newErrors.description = '请输入商品描述'
    else if (description.length < 10) newErrors.description = '描述至少10个字'
    else if (description.length > 500) newErrors.description = '描述不超过500个字'

    // 价格
    if (price === '') newErrors.price = '请输入价格'
    else if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) newErrors.price = '请输入有效的价格'

    // 分类
    if (category === '') newErrors.category = '请选择分类'

    // 联系方式
    if (contact === '') newErrors.contact = '请填写联系方式'

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
      // 调用后端 API 发布商品
      const result = await apiPost('/api/items', {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category: formData.category,
        images: images.length > 0 ? JSON.stringify(images) : null,
        contact: formData.contact.trim(),
      })

      if (result.code === 201) {
        showToast('发布成功！', 'success')
        // 清空表单
        setFormData({ title: '', description: '', price: '', category: '', contact: '', condition: '' })
        setImages([])
        setErrors({})
        // 将后端返回的完整商品数据传给父组件（已适配前端字段）
        onSuccess?.(result.data as SubmittedItem)
      } else {
        showToast(result.message || '发布失败', 'error')
      }
    } catch (err) {
      showToast('发布失败，请稍后重试', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ==================== AI 生成商品描述 ====================
  const handleAIDescription = async () => {
    // 验证商品名称
    if (!formData.title.trim()) {
      showToast('请先填写商品名称', 'error')
      return
    }
    // 验证价格
    if (!formData.price.trim() || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
      showToast('请先填写价格', 'error')
      return
    }

    setAiLoading(true)
    try {
      const result = await apiPost<{ description: string }>('/api/ai/generate-description', {
        title: formData.title.trim(),
        price: parseFloat(formData.price),
        condition: formData.condition || '',
        usage: formData.description || '',
      })
      if (result.code === 200 && result.data) {
        setFormData((prev) => ({ ...prev, description: result.data!.description }))
        showToast('AI描述已生成，你可以修改后发布', 'success')
      } else {
        showToast('AI生成失败，请手动填写描述', 'error')
      }
    } catch {
      showToast('AI生成失败，请手动填写描述', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  // ==================== 取消处理 ====================
  const handleCancel = () => {
    onCancel?.()
  }

  // 输入框基础样式
  const inputBaseClass = 'w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition text-sm'
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

      {/* ============ 表单区域 ============ */}
      <form onSubmit={handleSubmit} className="max-w-[640px] mx-auto space-y-5">
        {/* ---------- 商品名称 ---------- */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            商品名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            onBlur={() => handleBlur('title')}
            maxLength={30}
            placeholder="请输入商品名称（2-30字）"
            className={getInputClass('title')}
          />
          {errors.title && (
            <p className="text-red-500 text-xs mt-1">{errors.title}</p>
          )}
        </div>

        {/* ---------- 商品描述 ---------- */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-gray-700">
              商品描述 <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={handleAIDescription}
              disabled={aiLoading}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium border transition-colors duration-200 ${
                aiLoading
                  ? 'border-purple-300 text-purple-400 bg-purple-50 cursor-not-allowed'
                  : 'border-purple-400 text-purple-600 hover:bg-purple-50 hover:border-purple-500'
              }`}
            >
              {aiLoading ? (
                <>
                  <svg
                    className="animate-spin h-3.5 w-3.5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  生成中...
                </>
              ) : (
                <>🤖 AI帮我写描述</>
              )}
            </button>
          </div>
          <textarea
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            onBlur={() => handleBlur('description')}
            maxLength={500}
            rows={4}
            placeholder="请详细描述商品的情况（10-500字）"
            className={`${getInputClass('description')} resize-none`}
          />
          <div className="flex justify-end mt-1">
            <span className="text-xs text-gray-400">
              {formData.description.length}/500
            </span>
          </div>
          {errors.description && (
            <p className="text-red-500 text-xs mt-1">{errors.description}</p>
          )}
        </div>

        {/* ---------- 价格 + 分类（同一行） ---------- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* 价格 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              价格 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">¥</span>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => updateField('price', e.target.value)}
                onBlur={() => handleBlur('price')}
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                className={`${getInputClass('price')} pl-8`}
              />
            </div>
            {errors.price && (
              <p className="text-red-500 text-xs mt-1">{errors.price}</p>
            )}
          </div>

          {/* 分类 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              分类 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => updateField('category', e.target.value)}
              onBlur={() => handleBlur('category')}
              className={getInputClass('category')}
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.value === ''}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-red-500 text-xs mt-1">{errors.category}</p>
            )}
          </div>
        </div>

        {/* ---------- 图片上传 ---------- */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            图片上传 <span className="text-gray-400 text-xs">（可选，最多3张）</span>
          </label>

          {/* 隐藏的文件输入 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />

          {/* 缩略图预览 + 上传区域 */}
          <div className="flex flex-wrap gap-3">
            {/* 已选图片缩略图 */}
            {images.map((img, index) => (
              <div
                key={index}
                className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 group"
              >
                <img src={img} alt={`预览${index + 1}`} className="w-full h-full object-cover" />
                {/* 删除按钮 */}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-500 transition-colors"
                  aria-label="删除图片"
                >
                  ×
                </button>
              </div>
            ))}

            {/* 上传区域（未满3张时显示） */}
            {images.length < 3 && (
              <div
                onClick={handleUploadClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-24 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }`}
              >
                <span className="text-2xl text-gray-400">+</span>
                <span className="text-xs text-gray-400 mt-1">上传</span>
              </div>
            )}
          </div>
        </div>

        {/* ---------- 联系方式 ---------- */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            联系方式 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.contact}
            onChange={(e) => updateField('contact', e.target.value)}
            onBlur={() => handleBlur('contact')}
            placeholder="手机号或微信号"
            className={getInputClass('contact')}
          />
          {errors.contact && (
            <p className="text-red-500 text-xs mt-1">{errors.contact}</p>
          )}
        </div>

        {/* ---------- 提交 + 取消按钮 ---------- */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className={`flex-1 py-3 rounded-lg font-semibold text-white transition-colors duration-200 flex items-center justify-center ${
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
                发布中...
              </>
            ) : (
              '发布商品'
            )}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={submitting}
              className="px-6 py-3 rounded-lg font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
            >
              取消
            </button>
          )}
        </div>
      </form>
    </>
  )
}
