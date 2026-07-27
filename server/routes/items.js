import express from 'express'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

// 有效分类列表
const VALID_CATEGORIES = ['教材', '电子', '生活', '其他']

// 状态映射：前端字符串 → 数据库整数
const STATUS_MAP = { '在售': 1, '已售出': 2 }

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
// 1. GET / —— 获取商品列表（公开，不需要认证）
// ============================================================
router.get('/', (req, res) => {
  try {
    const db = req.app.get('db')
    const { keyword, category, status = '在售', page = '1', limit = '10' } = req.query
    const pageNum = Math.max(parseInt(page, 10) || 1, 1)
    const limitNum = Math.max(parseInt(limit, 10) || 10, 1)
    const offset = (pageNum - 1) * limitNum

    const conditions = []
    const countParams = []
    const queryParams = []

    // 状态筛选（默认"在售"）
    const statusValue = STATUS_MAP[status]
    if (statusValue !== undefined) {
      conditions.push('status = ?')
      countParams.push(statusValue)
      queryParams.push(statusValue)
    }

    // 分类筛选
    if (category && VALID_CATEGORIES.includes(category)) {
      conditions.push('category = ?')
      countParams.push(category)
      queryParams.push(category)
    }

    // 关键词搜索（模糊匹配标题和描述）
    if (keyword && keyword.trim()) {
      conditions.push('(title LIKE ? OR description LIKE ?)')
      const like = `%${keyword.trim()}%`
      countParams.push(like, like)
      queryParams.push(like, like)
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    // 查询总数
    const countResult = db.exec(
      `SELECT COUNT(*) AS count FROM items ${whereClause}`,
      countParams
    )
    const total = countResult.length > 0 ? countResult[0].values[0][0] : 0

    // 查询分页数据（JOIN users 表获取卖家名）
    queryParams.push(limitNum, offset)
    const rows = queryAll(
      db,
      `SELECT i.*, u.username AS seller_name FROM items i LEFT JOIN users u ON i.user_id = u.id ${whereClause} ORDER BY i.created_at DESC LIMIT ? OFFSET ?`,
      queryParams
    )

    // 适配前端字段
    const items = rows.map((row) => {
      let image = ''
      if (row.images) {
        try {
          const imgs = JSON.parse(row.images)
          image = Array.isArray(imgs) ? imgs[0] || '' : row.images
        } catch {
          image = row.images
        }
      }
      return {
        id: row.id,
        title: row.title,
        price: row.price,
        category: row.category,
        seller: row.seller_name || row.contact || `用户${row.user_id}`,
        image,
      }
    })

    res.json({
      code: 200,
      data: {
        items,
        total,
        page: pageNum,
        limit: limitNum,
      },
      message: 'success',
    })
  } catch (err) {
    console.error('[Items] 查询商品列表失败:', err)
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    })
  }
})

// ============================================================
// 2. GET /:id —— 获取商品详情（公开）
// ============================================================
router.get('/:id', (req, res) => {
  try {
    const db = req.app.get('db')
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ code: 400, data: null, message: '无效的商品ID' })
    }

    const item = queryOne(
      db,
      `SELECT i.*, u.username AS seller_name
       FROM items i
       LEFT JOIN users u ON i.user_id = u.id
       WHERE i.id = ?`,
      [id]
    )
    if (!item) {
      return res.status(404).json({ code: 404, data: null, message: '商品不存在' })
    }

    res.json({ code: 200, data: item, message: 'success' })
  } catch (err) {
    console.error('[Items] 查询商品详情失败:', err)
    res.status(500).json({ code: 500, data: null, message: '数据库查询失败' })
  }
})

// ============================================================
// 3. POST / —— 发布新商品（需要登录）
// ============================================================
router.post('/', authMiddleware, (req, res) => {
  try {
    const db = req.app.get('db')
    const userId = req.user.userId
    const { title, description, price, category, images, contact } = req.body

    // 验证 title
    if (!title || title.trim().length < 2) {
      return res.status(400).json({ code: 400, data: null, message: '商品标题至少2个字' })
    }
    if (title.trim().length > 30) {
      return res.status(400).json({ code: 400, data: null, message: '商品标题不能超过30字' })
    }

    // 验证 price
    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({ code: 400, data: null, message: '请输入有效的价格' })
    }

    // 验证 category
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '分类必须是：教材、电子、生活、其他 之一',
      })
    }

    // 插入商品
    const stmt = db.prepare(
      `INSERT INTO items (user_id, title, description, price, category, images, contact, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now', 'localtime'), datetime('now', 'localtime'))`
    )
    stmt.run([
      userId,
      title.trim(),
      description ? description.trim() : null,
      priceNum,
      category,
      images || null,
      contact || null,
    ])
    stmt.free()

    // 获取刚插入的商品完整数据
    const newId = lastInsertId(db)
    const newRow = queryOne(
      db,
      `SELECT i.*, u.username AS seller_name
       FROM items i
       LEFT JOIN users u ON i.user_id = u.id
       WHERE i.id = ?`,
      [newId]
    )

    // 适配前端字段
    let image = ''
    if (newRow.images) {
      try {
        const imgs = JSON.parse(newRow.images)
        image = Array.isArray(imgs) ? imgs[0] || '' : newRow.images
      } catch {
        image = newRow.images
      }
    }
    const newItem = {
      id: newRow.id,
      title: newRow.title,
      price: newRow.price,
      category: newRow.category,
      seller: newRow.seller_name || newRow.contact || `用户${newRow.user_id}`,
      image,
    }

    res.status(201).json({ code: 201, data: newItem, message: '发布成功' })
  } catch (err) {
    console.error('[Items] 发布商品失败:', err)
    res.status(500).json({ code: 500, data: null, message: '数据库写入失败' })
  }
})

// ============================================================
// 4. PUT /:id —— 修改商品（需要登录 + 验证是否本人）
// ============================================================
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const db = req.app.get('db')
    const userId = req.user.userId
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ code: 400, data: null, message: '无效的商品ID' })
    }

    // 验证商品是否存在
    const existing = queryOne(db, 'SELECT * FROM items WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ code: 404, data: null, message: '商品不存在' })
    }

    // 验证权限
    if (existing.user_id !== userId) {
      return res.status(403).json({ code: 403, data: null, message: '无权修改此商品' })
    }

    const { title, description, price, category, status } = req.body
    const updates = []
    const params = []

    if (title !== undefined) {
      if (title.trim().length < 2) {
        return res.status(400).json({ code: 400, data: null, message: '商品标题至少2个字' })
      }
      if (title.trim().length > 30) {
        return res.status(400).json({ code: 400, data: null, message: '商品标题不能超过30字' })
      }
      updates.push('title = ?')
      params.push(title.trim())
    }

    if (description !== undefined) {
      updates.push('description = ?')
      params.push(description ? description.trim() : null)
    }

    if (price !== undefined) {
      const priceNum = parseFloat(price)
      if (isNaN(priceNum) || priceNum <= 0) {
        return res.status(400).json({ code: 400, data: null, message: '请输入有效的价格' })
      }
      updates.push('price = ?')
      params.push(priceNum)
    }

    if (category !== undefined) {
      if (!VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({
          code: 400,
          data: null,
          message: '分类必须是：教材、电子、生活、其他 之一',
        })
      }
      updates.push('category = ?')
      params.push(category)
    }

    if (status !== undefined) {
      const statusValue = STATUS_MAP[status]
      if (statusValue === undefined) {
        return res.status(400).json({ code: 400, data: null, message: '状态必须是：在售、已售出 之一' })
      }
      updates.push('status = ?')
      params.push(statusValue)
    }

    if (updates.length === 0) {
      return res.status(400).json({ code: 400, data: null, message: '请提供要更新的字段' })
    }

    // 更新 updated_at
    updates.push("updated_at = datetime('now', 'localtime')")
    params.push(id)

    const stmt = db.prepare(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`)
    stmt.run(params)
    stmt.free()

    // 返回更新后的完整商品
    const updated = queryOne(
      db,
      `SELECT i.*, u.username AS seller_name
       FROM items i
       LEFT JOIN users u ON i.user_id = u.id
       WHERE i.id = ?`,
      [id]
    )
    res.json({ code: 200, data: updated, message: '修改成功' })
  } catch (err) {
    console.error('[Items] 修改商品失败:', err)
    res.status(500).json({ code: 500, data: null, message: '数据库更新失败' })
  }
})

// ============================================================
// 5. DELETE /:id —— 下架商品（需要登录 + 验证是否本人）
// ============================================================
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const db = req.app.get('db')
    const userId = req.user.userId
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ code: 400, data: null, message: '无效的商品ID' })
    }

    // 验证商品是否存在
    const existing = queryOne(db, 'SELECT * FROM items WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ code: 404, data: null, message: '商品不存在' })
    }

    // 验证权限
    if (existing.user_id !== userId) {
      return res.status(403).json({ code: 403, data: null, message: '无权下架此商品' })
    }

    // 软删除：将 status 改为 2（已售出）
    const stmt = db.prepare(`UPDATE items SET status = 2, updated_at = datetime('now', 'localtime') WHERE id = ?`)
    stmt.run([id])
    stmt.free()

    res.json({ code: 200, data: null, message: '下架成功' })
  } catch (err) {
    console.error('[Items] 下架商品失败:', err)
    res.status(500).json({ code: 500, data: null, message: '数据库操作失败' })
  }
})

export default router
