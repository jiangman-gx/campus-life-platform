import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost } from '../config/api'

// ==================== Toast 类型 ====================
interface ToastState {
  message: string
  type: 'success' | 'error'
}

// ==================== 注册表单数据 ====================
interface RegisterFormData {
  username: string
  password: string
  confirmPassword: string
}

// ==================== 注册表单错误 ====================
interface RegisterFormErrors {
  username?: string
  password?: string
  confirmPassword?: string
}

export default function AuthPage() {
  // ==================== 当前选中的标签：'login' | 'register' ====================
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')

  // ==================== 登录表单状态 ====================
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginUsernameError, setLoginUsernameError] = useState('')
  const [loginPasswordError, setLoginPasswordError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // ==================== 注册表单状态 ====================
  const [registerData, setRegisterData] = useState<RegisterFormData>({
    username: '',
    password: '',
    confirmPassword: '',
  })
  const [registerErrors, setRegisterErrors] = useState<RegisterFormErrors>({})
  const [registerLoading, setRegisterLoading] = useState(false)
  // 是否显示注册密码
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)

  // ==================== Toast 提示 ====================
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

  const navigate = useNavigate()

  // ==================== 切换标签 ====================
  const switchTab = (tab: 'login' | 'register') => {
    if (tab === activeTab) return
    setActiveTab(tab)
  }

  // ==================== 登录表单处理 ====================
  const handleLoginUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginUsername(e.target.value)
    if (loginUsernameError) setLoginUsernameError('')
  }

  const handleLoginPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginPassword(e.target.value)
    if (loginPasswordError) setLoginPasswordError('')
  }

  const handleLoginUsernameFocus = () => {
    setLoginUsernameError('')
  }

  const handleLoginPasswordFocus = () => {
    setLoginPasswordError('')
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (loginLoading) return

    let hasError = false
    if (loginUsername.trim() === '') {
      setLoginUsernameError('请输入用户名')
      hasError = true
    }
    if (loginPassword.trim() === '') {
      setLoginPasswordError('请输入密码')
      hasError = true
    }

    if (hasError) return

    setLoginLoading(true)

    try {
      const result = await apiPost<{ token: string; user: { id: number; username: string } }>('/api/auth/login', {
        username: loginUsername.trim(),
        password: loginPassword,
      })
      if (result.code === 200 && result.data) {
        // 保存 token 和用户信息到 localStorage
        localStorage.setItem('token', result.data.token)
        localStorage.setItem('user', JSON.stringify(result.data.user))
        showToast('登录成功！', 'success')
        window.setTimeout(() => {
          navigate('/')
        }, 1000)
      } else {
        showToast(result.message || '用户名或密码错误', 'error')
      }
    } catch (err) {
      showToast('登录失败，请稍后重试', 'error')
    } finally {
      setLoginLoading(false)
    }
  }

  // ==================== 注册表单：字段更新 ====================
  const updateRegisterField = (field: keyof RegisterFormData, value: string) => {
    setRegisterData((prev) => ({ ...prev, [field]: value }))
    // 清除对应字段的错误
    if (registerErrors[field as keyof RegisterFormErrors]) {
      setRegisterErrors((prev) => ({ ...prev, [field]: undefined }))
    }
    // 修改密码时，如果确认密码已填写，重新校验确认密码
    if (field === 'password' && registerData.confirmPassword) {
      if (value !== registerData.confirmPassword) {
        setRegisterErrors((prev) => ({ ...prev, confirmPassword: '两次输入的密码不一致' }))
      } else {
        setRegisterErrors((prev) => ({ ...prev, confirmPassword: undefined }))
      }
    }
    // 修改确认密码时，实时校验是否与密码一致
    if (field === 'confirmPassword' && registerData.password) {
      if (value !== registerData.password) {
        setRegisterErrors((prev) => ({ ...prev, confirmPassword: '两次输入的密码不一致' }))
      } else {
        setRegisterErrors((prev) => ({ ...prev, confirmPassword: undefined }))
      }
    }
  }

  // ==================== 注册表单：失焦验证 ====================
  const handleRegisterBlur = (field: keyof RegisterFormData) => {
    const value = registerData[field].trim()
    const newErrors = { ...registerErrors }

    if (field === 'username') {
      if (value === '') {
        newErrors.username = '请输入用户名'
      } else if (!/^[a-zA-Z0-9]{3,16}$/.test(value)) {
        newErrors.username = '用户名只能包含字母和数字，3-16字'
      } else {
        delete newErrors.username
      }
    }
    if (field === 'password') {
      if (value === '') {
        newErrors.password = '请输入密码'
      } else if (value.length < 6) {
        newErrors.password = '密码至少6位'
      } else if (value.length > 20) {
        newErrors.password = '密码不超过20位'
      } else {
        delete newErrors.password
      }
    }
    if (field === 'confirmPassword') {
      if (value === '') {
        newErrors.confirmPassword = '请确认密码'
      } else if (value !== registerData.password) {
        newErrors.confirmPassword = '两次输入的密码不一致'
      } else {
        delete newErrors.confirmPassword
      }
    }

    setRegisterErrors(newErrors)
  }

  // ==================== 注册表单：统一验证 ====================
  const validateRegisterForm = (): boolean => {
    const newErrors: RegisterFormErrors = {}
    const username = registerData.username.trim()
    const password = registerData.password.trim()
    const confirmPassword = registerData.confirmPassword.trim()

    // 用户名验证
    if (username === '') {
      newErrors.username = '请输入用户名'
    } else if (!/^[a-zA-Z0-9]{3,16}$/.test(username)) {
      newErrors.username = '用户名只能包含字母和数字，3-16字'
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
      newErrors.confirmPassword = '请确认密码'
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = '两次输入的密码不一致'
    }

    setRegisterErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ==================== 注册表单：提交处理 ====================
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (registerLoading) return

    if (!validateRegisterForm()) {
      showToast('请完善表单信息', 'error')
      return
    }

    setRegisterLoading(true)

    try {
      const result = await apiPost<{ id: number; username: string }>('/api/auth/register', {
        username: registerData.username.trim(),
        password: registerData.password,
      })

      if (result.code === 201) {
        showToast('注册成功！', 'success')
        // 清空注册表单
        setRegisterData({ username: '', password: '', confirmPassword: '' })
        setRegisterErrors({})
        // 自动切换到登录表单
        window.setTimeout(() => {
          setActiveTab('login')
        }, 500)
      } else {
        showToast(result.message || '注册失败', 'error')
      }
    } catch (err) {
      showToast('注册失败，请稍后重试', 'error')
    } finally {
      setRegisterLoading(false)
    }
  }

  // ==================== 输入框样式工具函数 ====================
  const getInputClass = (hasError: boolean) =>
    `w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition ${
      hasError
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

      <div className="min-h-[70vh] flex items-center justify-center py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md overflow-hidden">
          {/* ============ 标题 ============ */}
          <div className="text-center pt-8 pb-2">
            <div className="text-4xl mb-3">🎓</div>
            <h1 className="text-2xl font-bold text-gray-800">校园生活服务平台</h1>
          </div>

          {/* ============ 切换标签 ============ */}
          <div className="flex border-b border-gray-200 mt-6">
            <button
              type="button"
              onClick={() => switchTab('login')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors duration-200 relative ${
                activeTab === 'login'
                  ? 'text-blue-900'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              登录
              {activeTab === 'login' && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-blue-900 rounded-full"></span>
              )}
            </button>
            <button
              type="button"
              onClick={() => switchTab('register')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors duration-200 relative ${
                activeTab === 'register'
                  ? 'text-blue-900'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              注册
              {activeTab === 'register' && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-blue-900 rounded-full"></span>
              )}
            </button>
          </div>

          {/* ============ 表单内容区 ============ */}
          <div className="p-8">
            {/* ---------- 登录表单 ---------- */}
            {activeTab === 'login' && (
              <>
                <p className="text-gray-500 text-sm mb-6 text-center">欢迎回来，请登录你的账号</p>

                <form onSubmit={handleLoginSubmit} className="space-y-5">
                  {/* 用户名输入框 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      用户名
                    </label>
                    <input
                      type="text"
                      value={loginUsername}
                      onChange={handleLoginUsernameChange}
                      onFocus={handleLoginUsernameFocus}
                      placeholder="请输入用户名"
                      className={getInputClass(!!loginUsernameError)}
                    />
                    {loginUsernameError && (
                      <p className="text-red-500 text-xs mt-1.5">{loginUsernameError}</p>
                    )}
                  </div>

                  {/* 密码输入框 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      密码
                    </label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={handleLoginPasswordChange}
                      onFocus={handleLoginPasswordFocus}
                      placeholder="请输入密码"
                      className={getInputClass(!!loginPasswordError)}
                    />
                    {loginPasswordError && (
                      <p className="text-red-500 text-xs mt-1.5">{loginPasswordError}</p>
                    )}
                  </div>

                  {/* 登录按钮 */}
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className={`w-full text-white py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center ${
                      loginLoading
                        ? 'bg-blue-700 cursor-not-allowed'
                        : 'bg-blue-900 hover:bg-blue-800'
                    }`}
                  >
                    {loginLoading ? (
                      <>
                        <svg
                          className="animate-spin h-5 w-5 mr-2 text-white"
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
                        登录中...
                      </>
                    ) : (
                      '登录'
                    )}
                  </button>
                </form>
              </>
            )}

            {/* ---------- 注册表单 ---------- */}
            {activeTab === 'register' && (
              <>
                <p className="text-gray-500 text-sm mb-6 text-center">创建你的校园生活服务平台账号</p>

                <form onSubmit={handleRegisterSubmit} className="space-y-5">
                  {/* 用户名 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      用户名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={registerData.username}
                      onChange={(e) => updateRegisterField('username', e.target.value)}
                      onBlur={() => handleRegisterBlur('username')}
                      maxLength={16}
                      placeholder="3-16位字母或数字"
                      className={getInputClass(!!registerErrors.username)}
                    />
                    {registerErrors.username && (
                      <p className="text-red-500 text-xs mt-1.5">{registerErrors.username}</p>
                    )}
                  </div>

                  {/* 密码 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      密码 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showRegisterPassword ? 'text' : 'password'}
                        value={registerData.password}
                        onChange={(e) => updateRegisterField('password', e.target.value)}
                        onBlur={() => handleRegisterBlur('password')}
                        maxLength={20}
                        placeholder="至少6位"
                        className={`${getInputClass(!!registerErrors.password)} pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label={showRegisterPassword ? '隐藏密码' : '显示密码'}
                      >
                        {showRegisterPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {registerErrors.password && (
                      <p className="text-red-500 text-xs mt-1.5">{registerErrors.password}</p>
                    )}
                  </div>

                  {/* 确认密码 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      确认密码 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showRegisterPassword ? 'text' : 'password'}
                      value={registerData.confirmPassword}
                      onChange={(e) => updateRegisterField('confirmPassword', e.target.value)}
                      onBlur={() => handleRegisterBlur('confirmPassword')}
                      maxLength={20}
                      placeholder="请再次输入密码"
                      className={getInputClass(!!registerErrors.confirmPassword)}
                    />
                    {registerErrors.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1.5">{registerErrors.confirmPassword}</p>
                    )}
                  </div>

                  {/* 注册按钮 */}
                  <button
                    type="submit"
                    disabled={registerLoading}
                    className={`w-full text-white py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center ${
                      registerLoading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-900 hover:bg-blue-800'
                    }`}
                  >
                    {registerLoading ? (
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
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
