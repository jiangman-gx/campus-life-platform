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

// 类型映射：数据库整数 → 前端字符串
const TYPE_MAP_DB_TO_FRONT = { 0: '丢失', 1: '捡到' }
const TYPE_MAP_FRONT_TO_DB = { '丢失': 0, '捡到': 1 }

// ============================================================
// 1. GET / —— 获取失物招领列表（公开）
// ============================================================
router.get('/', (req, res) => {
  try {
    const db = req.app.get('db')
    const { type } = req.query

    let whereClause = ''
    const params = []

    if (type !== undefined) {
      const typeNum = parseInt(type, 10)
      if (!isNaN(typeNum) && (typeNum === 0 || typeNum === 1)) {
        whereClause = 'WHERE type = ?'
        params.push(typeNum)
      }
    }

    const rows = queryAll(
      db,
      `SELECT * FROM lost_found ${whereClause} ORDER BY created_at DESC`,
      params
    )

    // 适配前端字段
    const formatted = rows.map((row) => ({
      id: row.id,
      type: TYPE_MAP_DB_TO_FRONT[row.type] || (row.type === 0 ? '丢失' : '捡到'),
      title: row.title,
      location: row.location,
      time: row.lost_time || row.created_at,
      description: row.description || '',
    }))

    res.json({
      code: 200,
      data: formatted,
      message: 'success',
    })
  } catch (err) {
    console.error('[LostFound] 查询列表失败:', err)
    res.status(500).json({ code: 500, data: null, message: '数据库查询失败' })
  }
})

// ============================================================
// 2. GET /:id —— 获取单条详情（公开）
// ============================================================
router.get('/:id', (req, res) => {
  try {
    const db = req.app.get('db')
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ code: 400, data: null, message: '无效的ID' })
    }

    const row = queryOne(db, 'SELECT * FROM lost_found WHERE id = ?', [id])
    if (!row) {
      return res.status(404).json({ code: 404, data: null, message: '记录不存在' })
    }

    const formatted = {
      id: row.id,
      type: TYPE_MAP_DB_TO_FRONT[row.type] || (row.type === 0 ? '丢失' : '捡到'),
      title: row.title,
      location: row.location,
      time: row.lost_time || row.created_at,
      description: row.description || '',
    }

    res.json({ code: 200, data: formatted, message: 'success' })
  } catch (err) {
    console.error('[LostFound] 查询详情失败:', err)
    res.status(500).json({ code: 500, data: null, message: '数据库查询失败' })
  }
})

// ============================================================
// 3. POST / —— 发布失物招领信息（需要登录）
// ============================================================
router.post('/', authMiddleware, (req, res) => {
  try {
    const db = req.app.get('db')
    const userId = req.user.userId
    const { type, title, location, date, description } = req.body

    // 验证
    if (!type) {
      return res.status(400).json({ code: 400, data: null, message: '类型必填' })
    }
    const typeNum = TYPE_MAP_FRONT_TO_DB[type]
    if (typeNum === undefined) {
      return res.status(400).json({ code: 400, data: null, message: '类型必须是：丢失、捡到' })
    }

    if (!title || title.trim().length < 1) {
      return res.status(400).json({ code: 400, data: null, message: '物品名称必填' })
    }
    if (title.trim().length > 100) {
      return res.status(400).json({ code: 400, data: null, message: '物品名称不能超过100字' })
    }

    if (!location || location.trim().length < 1) {
      return res.status(400).json({ code: 400, data: null, message: '地点必填' })
    }

    if (!date) {
      return res.status(400).json({ code: 400, data: null, message: '日期必填' })
    }

    const desc = description ? description.trim() : ''
    if (desc.length > 500) {
      return res.status(400).json({ code: 400, data: null, message: '描述不能超过500字' })
    }

    // 插入数据
    const stmt = db.prepare(
      `INSERT INTO lost_found (user_id, type, title, location, lost_time, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))`
    )
    stmt.run([userId, typeNum, title.trim(), location.trim(), date, desc])
    stmt.free()

    // 获取刚插入的记录
    const newId = lastInsertId(db)
    const newRow = queryOne(db, 'SELECT * FROM lost_found WHERE id = ?', [newId])

    const formatted = {
      id: newRow.id,
      type: TYPE_MAP_DB_TO_FRONT[newRow.type],
      title: newRow.title,
      location: newRow.location,
      time: newRow.lost_time || newRow.created_at,
      description: newRow.description || '',
    }

    res.status(201).json({ code: 201, data: formatted, message: '发布成功' })
  } catch (err) {
    console.error('[LostFound] 发布失败:', err)
    res.status(500).json({ code: 500, data: null, message: '数据库写入失败' })
  }
})

// ============================================================
// 4. PUT /:id —— 修改失物招领信息（需要登录 + 验证是否本人）
// ============================================================
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const db = req.app.get('db')
    const userId = req.user.userId
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ code: 400, data: null, message: '无效的ID' })
    }

    // 验证记录是否存在
    const existing = queryOne(db, 'SELECT * FROM lost_found WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ code: 404, data: null, message: '记录不存在' })
    }

    // 验证权限
    if (existing.user_id !== userId) {
      return res.status(403).json({ code: 403, data: null, message: '无权修改此记录' })
    }

    const { type, title, location, date, description } = req.body
    const updates = []
    const params = []

    if (type !== undefined) {
      const typeNum = TYPE_MAP_FRONT_TO_DB[type]
      if (typeNum === undefined) {
        return res.status(400).json({ code: 400, data: null, message: '类型必须是：丢失、捡到' })
      }
      updates.push('type = ?')
      params.push(typeNum)
    }

    if (title !== undefined) {
      if (title.trim().length < 1) {
        return res.status(400).json({ code: 400, data: null, message: '物品名称不能为空' })
      }
      if (title.trim().length > 100) {
        return res.status(400).json({ code: 400, data: null, message: '物品名称不能超过100字' })
      }
      updates.push('title = ?')
      params.push(title.trim())
    }

    if (location !== undefined) {
      if (location.trim().length < 1) {
        return res.status(400).json({ code: 400, data: null, message: '地点不能为空' })
      }
      updates.push('location = ?')
      params.push(location.trim())
    }

    if (date !== undefined) {
      updates.push('lost_time = ?')
      params.push(date)
    }

    if (description !== undefined) {
      if (description.trim().length > 500) {
        return res.status(400).json({ code: 400, data: null, message: '描述不能超过500字' })
      }
      updates.push('description = ?')
      params.push(description.trim())
    }

    if (updates.length === 0) {
      return res.status(400).json({ code: 400, data: null, message: '请提供要更新的字段' })
    }

    // 更新 updated_at
    updates.push("updated_at = datetime('now', 'localtime')")
    params.push(id)

    const stmt = db.prepare(`UPDATE lost_found SET ${updates.join(', ')} WHERE id = ?`)
    stmt.run(params)
    stmt.free()

    // 返回更新后的完整记录
    const updated = queryOne(db, 'SELECT * FROM lost_found WHERE id = ?', [id])
    const formatted = {
      id: updated.id,
      type: TYPE_MAP_DB_TO_FRONT[updated.type] || (updated.type === 0 ? '丢失' : '捡到'),
      title: updated.title,
      location: updated.location,
      time: updated.lost_time || updated.created_at,
      description: updated.description || '',
    }

    res.json({ code: 200, data: formatted, message: '修改成功' })
  } catch (err) {
    console.error('[LostFound] 修改失败:', err)
    res.status(500).json({ code: 500, data: null, message: '数据库更新失败' })
  }
})

// ============================================================
// 5. DELETE /:id —— 删除失物招领信息（需要登录 + 验证是否本人）
// ============================================================
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const db = req.app.get('db')
    const userId = req.user.userId
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).json({ code: 400, data: null, message: '无效的ID' })
    }

    // 验证记录是否存在
    const existing = queryOne(db, 'SELECT * FROM lost_found WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ code: 404, data: null, message: '记录不存在' })
    }

    // 验证权限
    if (existing.user_id !== userId) {
      return res.status(403).json({ code: 403, data: null, message: '无权删除此记录' })
    }

    const stmt = db.prepare('DELETE FROM lost_found WHERE id = ?')
    stmt.run([id])
    stmt.free()

    res.json({ code: 200, data: null, message: '删除成功' })
  } catch (err) {
    console.error('[LostFound] 删除失败:', err)
    res.status(500).json({ code: 500, data: null, message: '数据库删除失败' })
  }
})

export default router
