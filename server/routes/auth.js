import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../middleware/auth.js'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

// ============================================================
// 辅助函数：执行查询并返回对象数组（带参数绑定）
// ============================================================
function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const results = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

function queryOne(db, sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  let result = null
  if (stmt.step()) {
    result = stmt.getAsObject()
  }
  stmt.free()
  return result
}

// ============================================================
// POST /api/auth/register —— 用户注册
// ============================================================
router.post('/register', async (req, res) => {
  try {
    const db = req.app.get('db')
    const { username, password } = req.body

    // ---- 验证 ----
    if (!username || !username.trim()) {
      return res.status(400).json({ code: 400, data: null, message: '请输入用户名' })
    }
    if (!/^[a-zA-Z0-9]{3,16}$/.test(username.trim())) {
      return res.status(400).json({ code: 400, data: null, message: '用户名只能包含字母和数字，3-16位' })
    }

    if (!password) {
      return res.status(400).json({ code: 400, data: null, message: '请输入密码' })
    }
    if (password.length < 6 || password.length > 20) {
      return res.status(400).json({ code: 400, data: null, message: '密码长度为6-20位' })
    }

    // ---- 检查用户名是否已存在 ----
    const existingUser = queryOne(db, 'SELECT id FROM users WHERE username = ?', [username.trim()])
    if (existingUser) {
      return res.status(409).json({ code: 409, data: null, message: '用户名已存在' })
    }

    // ---- 密码加密 ----
    const hashedPassword = await bcrypt.hash(password, 10)

    // ---- 存入数据库 ----
    const stmt = db.prepare(
      `INSERT INTO users (username, password, created_at, updated_at)
       VALUES (?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))`
    )
    stmt.run([username.trim(), hashedPassword])
    stmt.free()

    // 获取最后插入的 ID
    const idResult = db.exec('SELECT last_insert_rowid() AS id')
    const newId = idResult.length > 0 ? idResult[0].values[0][0] : 0

    res.status(201).json({
      code: 201,
      data: { id: newId, username: username.trim() },
      message: '注册成功',
    })
  } catch (err) {
    console.error('[Auth] 注册失败:', err)
    res.status(500).json({ code: 500, data: null, message: '注册失败，服务器错误' })
  }
})

// ============================================================
// POST /api/auth/login —— 用户登录
// ============================================================
router.post('/login', async (req, res) => {
  try {
    const db = req.app.get('db')
    const { username, password } = req.body

    // ---- 验证 ----
    if (!username || !username.trim()) {
      return res.status(400).json({ code: 400, data: null, message: '请输入用户名' })
    }
    if (!password) {
      return res.status(400).json({ code: 400, data: null, message: '请输入密码' })
    }

    // ---- 查询用户 ----
    const user = queryOne(db, 'SELECT id, username, password FROM users WHERE username = ?', [username.trim()])
    if (!user) {
      return res.status(401).json({ code: 401, data: null, message: '用户名或密码错误' })
    }

    // ---- 验证密码 ----
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ code: 401, data: null, message: '用户名或密码错误' })
    }

    // ---- 生成 JWT Token ----
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      code: 200,
      data: {
        token,
        user: { id: user.id, username: user.username },
      },
      message: '登录成功',
    })
  } catch (err) {
    console.error('[Auth] 登录失败:', err)
    res.status(500).json({ code: 500, data: null, message: '登录失败，服务器错误' })
  }
})

// ============================================================
// GET /api/auth/me —— 获取当前用户信息（需要认证）
// ============================================================
router.get('/me', authMiddleware, (req, res) => {
  try {
    const db = req.app.get('db')
    const { userId } = req.user

    const user = queryOne(
      db,
      'SELECT id, username, avatar, created_at FROM users WHERE id = ?',
      [userId]
    )

    if (!user) {
      return res.status(404).json({ code: 404, data: null, message: '用户不存在' })
    }

    res.json({
      code: 200,
      data: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        created_at: user.created_at,
      },
      message: 'success',
    })
  } catch (err) {
    console.error('[Auth] 获取用户信息失败:', err)
    res.status(500).json({ code: 500, data: null, message: '获取用户信息失败' })
  }
})

export default router
