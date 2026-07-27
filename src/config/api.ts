// ============================================================
// API 配置文件
// 说明：
// - 如果前端通过 Vite 代理访问后端（同一域名），API_BASE 设为空字符串 ''
// - 如果前端直接访问独立端口的后端，API_BASE 设为 'http://localhost:3001'
// ============================================================

/** 后端 API 基础地址 */
export const API_BASE = ''

/**
 * 拼接完整 API 地址
 * @param path API 路径，如 '/api/canteens'
 * @returns 完整 URL，如 '' + '/api/canteens' → '/api/canteens'
 *          或 'http://localhost:3001' + '/api/canteens' → 'http://localhost:3001/api/canteens'
 */
export function getApiUrl(path: string): string {
  // 确保 path 以 / 开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${normalizedPath}`
}

// ============================================================
// 统一的认证请求工具
// ============================================================

/** API 统一响应格式 */
export interface ApiResponse<T = unknown> {
  code: number
  data: T
  message: string
}

/** 请求方法 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

/**
 * 带认证的统一请求函数
 * @param url     API 路径（会自动拼接 API_BASE）
 * @param method  HTTP 方法
 * @param body    请求体（可选，仅 POST/PUT/PATCH 需要）
 * @returns       解析后的 { code, data, message }
 */
export async function apiRequest<T = unknown>(
  url: string,
  method: HttpMethod = 'GET',
  body?: Record<string, unknown> | unknown[] | FormData
): Promise<ApiResponse<T>> {
  const fullUrl = getApiUrl(url)

  // 构建请求头
  const headers: Record<string, string> = {}

  // 自动从 localStorage 获取 token 并添加到请求头
  const token = localStorage.getItem('token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // 如果 body 是普通对象（非 FormData），自动设置 Content-Type 并转 JSON
  let fetchBody: string | FormData | undefined
  if (body !== undefined) {
    if (body instanceof FormData) {
      fetchBody = body
      // FormData 不需要手动设置 Content-Type，浏览器会自动设置并带上 boundary
    } else {
      headers['Content-Type'] = 'application/json'
      fetchBody = JSON.stringify(body)
    }
  }

  const response = await fetch(fullUrl, {
    method,
    headers,
    body: fetchBody,
  })

  // 解析 JSON 响应
  let result: ApiResponse<T>
  try {
    result = await response.json()
  } catch {
    // 如果返回的不是 JSON，构造一个错误响应
    result = {
      code: response.status,
      data: null as T,
      message: `请求失败，HTTP ${response.status}`,
    }
  }

  return result
}

// ============================================================
// 便捷封装：GET / POST / PUT / DELETE
// ============================================================

/**
 * GET 请求
 * @param url API 路径
 */
export function apiGet<T = unknown>(url: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, 'GET')
}

/**
 * POST 请求
 * @param url  API 路径
 * @param body 请求体
 */
export function apiPost<T = unknown>(
  url: string,
  body?: Record<string, unknown> | unknown[] | FormData
): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, 'POST', body)
}

/**
 * PUT 请求
 * @param url  API 路径
 * @param body 请求体
 */
export function apiPut<T = unknown>(
  url: string,
  body?: Record<string, unknown> | unknown[] | FormData
): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, 'PUT', body)
}

/**
 * DELETE 请求
 * @param url API 路径
 */
export function apiDelete<T = unknown>(url: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, 'DELETE')
}
