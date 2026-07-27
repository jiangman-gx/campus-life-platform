import path from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import canteensRouter from './routes/canteens.js'
import reviewsRouter from './routes/reviews.js'
import itemsRouter from './routes/items.js'
import lostFoundRouter from './routes/lost-found.js'
import authRouter from './routes/auth.js'
import aiRouter from './routes/ai.js'
import { initDatabase } from './database/init.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors())
app.use(express.json())

// 日志中间件：打印每次请求的方法和 URL
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`)
  next()
})

// 挂载 API 路由（必须在静态文件之前）
app.use('/api/canteens', canteensRouter)
app.use('/api/reviews', reviewsRouter)
app.use('/api/items', itemsRouter)
app.use('/api/lost-found', lostFoundRouter)
app.use('/api/auth', authRouter)
app.use('/api/ai', aiRouter)

// 生产环境：serve 前端静态文件
app.use(express.static(path.join(__dirname, '..', 'dist')))

// SPA fallback：所有非 API 请求返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'))
})

// 启动服务器（在数据库初始化之后）
async function startServer() {
  try {
    // 初始化数据库（连接 + 建表 + 填充初始数据）
    const db = await initDatabase()
    console.log('数据库初始化成功')

    // 把数据库实例挂载到 app 上，方便路由文件通过 req.app.get('db') 使用
    app.set('db', db)

    app.listen(PORT, () => {
      console.log(`后端服务器运行在 http://localhost:${PORT}`)
    })

    // 保持进程运行（防止 sql.js 导致事件循环为空而退出）
    setInterval(() => {}, 1000 * 60 * 60)
  } catch (err) {
    console.error('数据库初始化失败:', err.message)
    process.exit(1)
  }
}

startServer()
