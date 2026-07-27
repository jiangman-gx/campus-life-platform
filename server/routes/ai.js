import express from 'express'

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

// ============================================================
// POST /api/ai/summarize-reviews —— 生成食堂评价的AI总结
// ============================================================
router.post('/summarize-reviews', async (req, res) => {
  try {
    const db = req.app.get('db')
    const { canteen_id } = req.body

    if (!canteen_id) {
      return res.status(400).json({ code: 400, data: null, message: 'canteen_id 必填' })
    }

    // 1. 从数据库查询该食堂最近20条评价
    const rows = queryAll(
      db,
      'SELECT content, rating FROM reviews WHERE canteen_id = ? AND content IS NOT NULL AND content != \'\' ORDER BY created_at DESC LIMIT 20',
      [canteen_id]
    )

    // 2. 评价数量为0
    if (rows.length === 0) {
      return res.json({ code: 200, data: { summary: '该食堂暂无评价' }, message: 'success' })
    }

    // 3. 拼接评价文本
    const reviewTexts = rows
      .map((row) => `评分${row.rating}星：${row.content}`)
      .join('\n')

    // 4. 构造 DeepSeek API 请求
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      return res.status(500).json({ code: 500, data: null, message: 'AI服务未配置' })
    }

    const apiBase = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com'

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch(`${apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content:
                '你是一个校园生活助手。请根据以下食堂评价，用3句话总结：\n' +
                '第1句：整体口碑如何（学生们普遍满意还是有怨言）\n' +
                '第2句：最受欢迎或最常被提到的菜品是什么\n' +
                '第3句：价格水平如何\n\n' +
                '请直接输出3句话总结，不要加标题和编号。每句话不超过40字。',
            },
            {
              role: 'user',
              content: `以下是食堂评价：\n${reviewTexts}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 300,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[AI] DeepSeek API 返回错误:', response.status, errorText)
        return res.status(500).json({ code: 500, data: null, message: 'AI服务暂时不可用，请稍后重试' })
      }

      const result = await response.json()

      // 5. 提取AI生成的内容
      const summary = result.choices?.[0]?.message?.content || ''

      // 6. 返回
      res.json({ code: 200, data: { summary }, message: 'success' })
    } catch (fetchErr) {
      clearTimeout(timeoutId)
      if (fetchErr.name === 'AbortError') {
        return res.status(504).json({ code: 504, data: null, message: 'AI服务响应超时，请稍后重试' })
      }
      console.error('[AI] 调用 DeepSeek API 失败:', fetchErr.message)
      return res.status(500).json({ code: 500, data: null, message: 'AI服务暂时不可用，请稍后重试' })
    }
  } catch (err) {
    console.error('[AI] 生成评价总结失败:', err)
    res.status(500).json({ code: 500, data: null, message: 'AI服务暂时不可用，请稍后重试' })
  }
})

// ============================================================
// POST /api/ai/generate-description —— AI生成二手商品描述
// ============================================================
router.post('/generate-description', async (req, res) => {
  try {
    const { title, condition, price, usage } = req.body

    // 验证必填字段
    if (!title || !title.trim()) {
      return res.status(400).json({ code: 400, data: null, message: '商品名称必填' })
    }
    if (price === undefined || price === null || isNaN(Number(price))) {
      return res.status(400).json({ code: 400, data: null, message: '价格必填且为有效数字' })
    }

    // 构造用户输入文本
    const userContent = [
      `商品名称：${title.trim()}`,
      condition ? `成色：${condition.trim()}` : '',
      `售价：${Number(price)}元`,
      usage ? `使用情况：${usage.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      return res.status(500).json({ code: 500, data: null, message: 'AI服务未配置' })
    }

    const apiBase = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com'

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch(`${apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content:
                '你是一个校园二手交易平台的助手。请根据用户提供的商品信息，生成一段吸引人的商品描述。\n\n' +
                '要求：\n' +
                '- 语气活泼、亲切，符合大学生风格\n' +
                '- 突出商品的核心卖点\n' +
                '- 提到原价和现价的对比（如果价格合理的话）\n' +
                '- 适当使用emoji\n' +
                '- 长度控制在50-100字\n' +
                '- 直接输出描述文案，不要加标题',
            },
            {
              role: 'user',
              content: userContent,
            },
          ],
          temperature: 0.8,
          max_tokens: 300,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[AI] DeepSeek API 返回错误:', response.status, errorText)
        return res.status(500).json({ code: 500, data: null, message: 'AI服务暂时不可用，请稍后重试' })
      }

      const result = await response.json()
      const description = result.choices?.[0]?.message?.content || ''

      res.json({ code: 200, data: { description }, message: 'success' })
    } catch (fetchErr) {
      clearTimeout(timeoutId)
      if (fetchErr.name === 'AbortError') {
        return res.status(504).json({ code: 504, data: null, message: 'AI服务响应超时，请稍后重试' })
      }
      console.error('[AI] 调用 DeepSeek API 失败:', fetchErr.message)
      return res.status(500).json({ code: 500, data: null, message: 'AI服务暂时不可用，请稍后重试' })
    }
  } catch (err) {
    console.error('[AI] 生成商品描述失败:', err)
    res.status(500).json({ code: 500, data: null, message: 'AI服务暂时不可用，请稍后重试' })
  }
})

export default router
