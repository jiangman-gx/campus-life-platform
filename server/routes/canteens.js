import express from 'express'

const router = express.Router()

// GET / —— 从 SQLite 数据库返回所有食堂数据
router.get('/', (req, res) => {
  try {
    // 从 app 上获取数据库实例（index.js 中通过 app.set('db', db) 挂载）
    const db = req.app.get('db')

    // 使用 sql.js 的 prepare / getAsObject 方式查询
    const stmt = db.prepare('SELECT * FROM canteens ORDER BY id ASC')
    const canteens = []
    while (stmt.step()) {
      canteens.push(stmt.getAsObject())
    }
    stmt.free()

    // 将 description 字段解析为 tags 数组，优先尝试 JSON.parse
    const formatted = canteens.map((c) => {
      let tags = []
      if (c.description) {
        try {
          tags = JSON.parse(c.description)
        } catch {
          tags = c.description.split(',')
        }
      }
      return {
        ...c,
        tags,
        rating: c.avg_rating,
      }
    })

    res.json({
      code: 200,
      data: formatted,
      message: 'success',
    })
  } catch (err) {
    console.error('[Canteens] 查询失败:', err)
    res.status(500).json({
      code: 500,
      data: null,
      message: '数据库查询失败',
    })
  }
})

export default router
