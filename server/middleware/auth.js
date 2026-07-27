import jwt from 'jsonwebtoken'

// JWT 密钥（后续可改为环境变量）
const JWT_SECRET = 'campus-life-secret-key'

/**
 * 认证中间件
 * - 从请求头 Authorization 中提取 Token
 * - 格式：Bearer <token>
 * - 验证 Token 是否有效
 * - 如果有效，解析出 userId 和 username，挂载到 req.user 上
 * - 如果无效或不存在，返回 401
 */
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({
      code: 401,
      data: null,
      message: '请先登录',
    })
  }

  // 格式验证：Bearer <token>
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      code: 401,
      data: null,
      message: '认证格式错误',
    })
  }

  const token = parts[1]

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    // 将用户信息挂载到 req.user 上
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
    }
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: 401,
        data: null,
        message: '登录已过期，请重新登录',
      })
    }
    return res.status(401).json({
      code: 401,
      data: null,
      message: '认证失败，请重新登录',
    })
  }
}

export { JWT_SECRET }
