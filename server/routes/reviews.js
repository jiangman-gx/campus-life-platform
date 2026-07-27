import express from 'express'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

// ============================================================
// 辅助函数
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

function lastInsertId(db) {
  const result = db.exec('SELECT last_insert_rowid() AS id')
  if (result.length > 0 && result[0].values.length > 0) {
    return result[0].values[0][0]
  }
  return 0
}

// ============================================================
// 1. GET / —— 获取评价列表（公开，不需要认证）
// ============================================================
router.get('/', (req, res) => {
  try {
    const db = req.app.get('db')
    const { canteen_id, page = '1', limit = '10' } = req.query
    const pageNum = Math.max(parseInt(page, 10) || 1, 1)
    const limitNum = Math.max(parseInt(limit, 10) || 10, 1)
    const offset = (pageNum - 1) * limitNum

    let whereClause = ''
    const countParams = []
    const queryParams = []

    if (canteen_id) {
      const canteenId = parseInt(canteen_id, 10)
      if (!isNaN(canteenId)) {
        whereClause = 'WHERE canteen_id = ?'
        countParams.push(canteenId)
        queryParams.push(canteenId)
      }
    }

    // 查询总数
    const countResult = db.exec(`SELECT COUNT(*) AS count FROM reviews ${whereClause}`, countParams)
    const total = countResult.length > 0 ? countResult[0].values[0][0] : 0

    // 查询分页数据（JOIN users 表获取用户名）
    queryParams.push(limitNum, offset)
    const rows = queryAll(
      db,
      `SELECT r.*, u.username FROM reviews r LEFT JOIN users u ON r.user_id = u.id ${whereClause} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      queryParams
    )

    // 适配前端字段
    const reviews = rows.map((row) => ({
      id: row.id,
      canteenId: row.canteen_id,
      username: row.username || `用户${row.user_id}`,
      content: row.content,
      rating: row.rating,
      time: row.created_at,
    }))

    res.json({
      code: 200,
      data: {
        reviews,
        total,
        page: pageNum,
        limit: limitNum,
      },
      message: 'success',
    })
  } catch (err) {
    console.error('[Reviews] 查询评价列表失败:', err)
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    })
  }
})

// ============================================================
// 2. GET /:id —— 获取单条评价详情（公开）
// ============================================================
router.get('/:id', (req, res) => {
  try {
    const db = req.app.get('db')
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ code: 400, data: null, message: '无效的评价ID' })
    }

    const review = queryOne(db, 'SELECT * FROM reviews WHERE id = ?', [id])
    if (!review) {
      return res.status(404).json({ code: 404, data: null, message: '评价不存在' })
    }

    res.json({ code: 200, data: review, message: 'success' })
  } catch (err) {
    console.error('[Reviews] 查询评价详情失败:', err)
    res.status(500).json({ code: 500, data: null, message: '数据库查询失败' })
  }
})

// ============================================================
// 3. POST / —— 提交新评价（需要登录）
// ============================================================
router.post('/', authMiddleware, (req, res) => {
  try {
    const db = req.app.get('db')
    const userId = req.user.userId
    const { canteen_id, content, rating } = req.body

    // 验证
    if (!canteen_id) {
      return res.status(400).json({ code: 400, data: null, message: 'canteen_id 必填' })
    }
    if (!content || content.trim().length < 1) {
      return res.status(400).json({ code: 400, data: null, message: '评价内容不能为空' })
    }
    if (content.trim().length > 500) {
      return res.status(400).json({ code: 400, data: null, message: '评价内容不能超过500字' })
    }
    const ratingNum = parseInt(rating, 10)
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ code: 400, data: null, message: '评分必须为1-5的整数' })
    }

    // 验证 canteen_id 是否存在
    const canteen = queryOne(db, 'SELECT id FROM canteens WHERE id = ?', [canteen_id])
    if (!canteen) {
      return res.status(400).json({ code: 400, data: null, message: '食堂不存在' })
    }

    // 插入评价
    const stmt = db.prepare(
      `INSERT INTO reviews (user_id, canteen_id, content, rating, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))`
    )
    stmt.run([userId, canteen_id, content.trim(), ratingNum])
    stmt.free()

    // 获取刚插入的评价完整数据（JOIN users 获取用户名）
    const newId = lastInsertId(db)
    const newRow = queryOne(
      db,
      'SELECT r.*, u.username FROM reviews r LEFT JOIN users u ON r.user_id = u.id WHERE r.id = ?',
      [newId]
    )

    // 适配前端字段
    const newReview = {
      id: newRow.id,
      canteenId: newRow.canteen_id,
      username: newRow.username || `用户${newRow.user_id}`,
      content: newRow.content,
      rating: newRow.rating,
      time: newRow.created_at,
    }

    res.status(201).json({ code: 201, data: newReview, message: '评价成功' })
  } catch (err) {
    console.error('[Reviews] 提交评价失败:', err)
    res.status(500).json({ code: 500, data: null, message: '数据库写入失败' })
  }
})

// ============================================================
// 4. PUT /:id —— 修改评价（需要登录 + 验证是否本人）
// ============================================================
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const db = req.app.get('db')
    const userId = req.user.userId
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ code: 400, data: null, message: '无效的评价ID' })
    }

    // 验证评价是否存在
    const existing = queryOne(db, 'SELECT * FROM reviews WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ code: 404, data: null, message: '评价不存在' })
    }

    // 验证权限：评价的 user_id 是否为当前用户
    if (existing.user_id !== userId) {
      return res.status(403).json({ code: 403, data: null, message: '无权修改此评价' })
    }

    // 构建动态更新语句（只更新传了的字段）
    const { content, rating } = req.body
    const updates = []
    const params = []

    if (content !== undefined) {
      if (content.trim().length < 1) {
        return res.status(400).json({ code: 400, data: null, message: '评价内容不能为空' })
      }
      if (content.trim().length > 500) {
        return res.status(400).json({ code: 400, data: null, message: '评价内容不能超过500字' })
      }
      updates.push('content = ?')
      params.push(content.trim())
    }

    if (rating !== undefined) {
      const ratingNum = parseInt(rating, 10)
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ code: 400, data: null, message: '评分必须为1-5的整数' })
      }
      updates.push('rating = ?')
      params.push(ratingNum)
    }

    if (updates.length === 0) {
      return res.status(400).json({ code: 400, data: null, message: '请提供要更新的字段' })
    }

    // 更新 updated_at
    updates.push("updated_at = datetime('now', 'localtime')")
    params.push(id)

    const stmt = db.prepare(`UPDATE reviews SET ${updates.join(', ')} WHERE id = ?`)
    stmt.run(params)
    stmt.free()

    // 返回更新后的完整评价
    const updated = queryOne(db, 'SELECT * FROM reviews WHERE id = ?', [id])
    res.json({ code: 200, data: updated, message: '修改成功' })
  } catch (err) {
    console.error('[Reviews] 修改评价失败:', err)
    res.status(500).json({ code: 500, data: null, message: '数据库更新失败' })
  }
})

// ============================================================
// 5. DELETE /:id —— 删除评价（需要登录 + 验证是否本人）
// ============================================================
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const db = req.app.get('db')
    const userId = req.user.userId
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ code: 400, data: null, message: '无效的评价ID' })
    }

    // 验证评价是否存在
    const existing = queryOne(db, 'SELECT * FROM reviews WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ code: 404, data: null, message: '评价不存在' })
    }

    // 验证权限：评价的 user_id 是否为当前用户
    if (existing.user_id !== userId) {
      return res.status(403).json({ code: 403, data: null, message: '无权删除此评价' })
    }

    const stmt = db.prepare('DELETE FROM reviews WHERE id = ?')
    stmt.run([id])
    stmt.free()

    res.json({ code: 200, data: null, message: '删除成功' })
  } catch (err) {
    console.error('[Reviews] 删除评价失败:', err)
    res.status(500).json({ code: 500, data: null, message: '数据库删除失败' })
  }
})

export default router
