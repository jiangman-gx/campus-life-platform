import { useState, useCallback, useRef } from 'react'

// ==================== 提交成功的注册数据 ====================
export interface SubmittedRegister {
  username: string
  email: string
  phone: string
}

// ==================== Props 类型定义 ====================
interface RegisterFormProps {
  onSuccess?: (user: SubmittedRegister) => void
  onSwitchLogin?: () => void
}

// ==================== 表单数据类型 ====================
interface FormData {
  username: string
  password: string
  confirmPassword: string
  email: string
  phone: string
}

// ==================== 错误类型 ====================
interface FormErrors {
  username?: string
  password?: string
  confirmPassword?: string
  email?: string
  phone?: string
}

// ==================== Toast 类型 ====================
interface ToastState {
  message: string
  type: 'success' | 'error'
}

// ==================== 组件实现 ====================
export default function RegisterForm({ onSuccess, onSwitchLogin }: RegisterFormProps) {
  // 表单数据
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    phone: '',
  })

  // 错误信息
  const [errors, setErrors] = useState<FormErrors>({})

  // 提交状态
  const [submitting, setSubmitting] = useState(false)

  // 是否显示密码
  const [showPassword, setShowPassword] = useState(false)

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

  // ==================== 字段更新 ====================
  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // 清除对应字段的错误
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
    // 修改密码时，如果确认密码已填写，重新校验确认密码
    if (field === 'password' && formData.confirmPassword) {
      if (value !== formData.confirmPassword) {
        setErrors((prev) => ({ ...prev, confirmPassword: '两次输入的密码不一致' }))
      } else {
        setErrors((prev) => ({ ...prev, confirmPassword: undefined }))
      }
    }
  }

  // ==================== 失焦验证 ====================
  const handleBlur = (field: keyof FormData) => {
    const value = formData[field].trim()
    const newErrors = { ...errors }

    if (field === 'username') {
      if (value === '') newErrors.username = '请输入用户名'
      else if (value.length < 3) newErrors.username = '用户名至少3个字符'
      else if (value.length > 20) newErrors.username = '用户名不超过20个字符'
      else delete newErrors.username
    }
    if (field === 'password') {
      if (value === '') newErrors.password = '请输入密码'
      else if (value.length < 6) newErrors.password = '密码至少6位'
      else if (value.length > 20) newErrors.password = '密码不超过20位'
      else delete newErrors.password
    }
    if (field === 'confirmPassword') {
      if (value === '') newErrors.confirmPassword = '请再次输入密码'
      else if (value !== formData.password) newErrors.confirmPassword = '两次输入的密码不一致'
      else delete newErrors.confirmPassword
    }
    if (field === 'email') {
      if (value === '') newErrors.email = '请输入邮箱'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) newErrors.email = '邮箱格式不正确'
      else delete newErrors.email
    }
    if (field === 'phone') {
      if (value === '') newErrors.phone = '请输入手机号'
      else if (!/^1[3-9]\d{9}$/.test(value)) newErrors.phone = '手机号格式不正确'
      else delete newErrors.phone
    }

    setErrors(newErrors)
  }

  // ==================== 表单验证 ====================
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    const username = formData.username.trim()
    const password = formData.password.trim()
    const confirmPassword = formData.confirmPassword.trim()
    const email = formData.email.trim()
    const phone = formData.phone.trim()

    // 用户名验证
    if (username === '') {
      newErrors.username = '请输入用户名'
    } else if (username.length < 3) {
      newErrors.username = '用户名至少3个字符'
    } else if (username.length > 20) {
      newErrors.username = '用户名不超过20个字符'
    }

    // 密码验证
    if (password === '') {
      newErrors.password = '请输入密码'
    } else if (password.length < 6) {
      newErrors.password = '密码至少6位'
    } else if (password.length > 20) {
      newErrors.password = '密码不超过20位'
    }

    // 确认密码验证
    if (confirmPassword === '') {
      newErrors.confirmPassword = '请再次输入密码'
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = '两次输入的密码不一致'
    }

    // 邮箱验证
    if (email === '') {
      newErrors.email = '请输入邮箱'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = '邮箱格式不正确'
    }

    // 手机号验证
    if (phone === '') {
      newErrors.phone = '请输入手机号'
    } else if (!/^1[3-9]\d{9}$/.test(phone)) {
      newErrors.phone = '手机号格式不正确'
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
      // 模拟 POST 请求（暂时没有真实后端）
      // 真实环境：
      // const response = await fetch('/api/auth/register', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     username: formData.username.trim(),
      //     password: formData.password,
      //     email: formData.email.trim(),
      //     phone: formData.phone.trim(),
      //   })
      // })
      // if (!response.ok) throw new Error('注册失败')
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // 模拟成功（90% 成功率）
      if (Math.random() > 0.1) {
        // 构造提交成功的注册数据
        const submittedUser: SubmittedRegister = {
          username: formData.username.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
        }

        showToast('注册成功！', 'success')
        // 清空表单
        setFormData({ username: '', password: '', confirmPassword: '', email: '', phone: '' })
        setErrors({})
        onSuccess?.(submittedUser)
      } else {
        // 模拟失败
        throw new Error('模拟注册失败')
      }
    } catch (err) {
      showToast('注册失败，请稍后重试', 'error')
      // 失败时保留用户已填内容
    } finally {
      setSubmitting(false)
    }
  }

  // 输入框基础样式
  const inputBaseClass =
    'w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition text-sm'
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
        className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 w-full max-w-md space-y-5"
      >
        {/* ---------- 标题 ---------- */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🎓</div>
          <h1 className="text-2xl font-bold text-gray-800">注册</h1>
          <p className="text-gray-500 text-sm mt-1">创建你的校园生活服务平台账号</p>
        </div>

        {/* ---------- 用户名 ---------- */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            用户名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => updateField('username', e.target.value)}
            onBlur={() => handleBlur('username')}
            maxLength={20}
            placeholder="3-20个字符"
            className={getInputClass('username')}
          />
          {errors.username && (
            <p className="text-red-500 text-xs mt-1.5">{errors.username}</p>
          )}
        </div>

        {/* ---------- 密码 ---------- */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            密码 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              onBlur={() => handleBlur('password')}
              maxLength={20}
              placeholder="至少6位"
              className={`${getInputClass('password')} pr-12`}
            />
            {/* 显示/隐藏密码按钮 */}
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={showPassword ? '隐藏密码' : '显示密码'}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-xs mt-1.5">{errors.password}</p>
          )}
        </div>

        {/* ---------- 确认密码 ---------- */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            确认密码 <span className="text-red-500">*</span>
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) => updateField('confirmPassword', e.target.value)}
            onBlur={() => handleBlur('confirmPassword')}
            maxLength={20}
            placeholder="请再次输入密码"
            className={getInputClass('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-red-500 text-xs mt-1.5">{errors.confirmPassword}</p>
          )}
        </div>

        {/* ---------- 邮箱 ---------- */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            邮箱 <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            placeholder="如：example@school.edu.cn"
            className={getInputClass('email')}
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1.5">{errors.email}</p>
          )}
        </div>

        {/* ---------- 手机号 ---------- */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            手机号 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            onBlur={() => handleBlur('phone')}
            maxLength={11}
            inputMode="numeric"
            placeholder="请输入11位手机号"
            className={getInputClass('phone')}
          />
          {errors.phone && (
            <p className="text-red-500 text-xs mt-1.5">{errors.phone}</p>
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
              注册中...
            </>
          ) : (
            '注册'
          )}
        </button>

        {/* ---------- 切换登录 ---------- */}
        <p className="text-center text-sm text-gray-500">
          已有账号？
          <button
            type="button"
            onClick={onSwitchLogin}
            className="text-blue-600 font-medium hover:underline ml-1"
          >
            立即登录
          </button>
        </p>
      </form>
    </>
  )
}
