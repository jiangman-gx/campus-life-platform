import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, 'campus.db')

/** @type {import('sql.js').Database | null} */
let db = null

/**
 * 初始化数据库连接
 * - 若 campus.db 文件存在，则从文件加载
 * - 若不存在，则创建新的内存数据库（后续调用 saveDb() 可持久化）
 * @returns {Promise<import('sql.js').Database>}
 */
export async function initDatabase() {
  const SQL = await initSqlJs()

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(fileBuffer)
    console.log('[DB] 数据库已从文件加载:', DB_PATH)
  } else {
    db = new SQL.Database()
    console.log('[DB] 新内存数据库已创建（调用 saveDb() 可持久化到文件）')
  }

  return db
}

/**
 * 获取当前数据库实例
 * @returns {import('sql.js').Database}
 */
export function getDb() {
  if (!db) {
    throw new Error('[DB] 数据库尚未初始化，请先调用 initDatabase()')
  }
  return db
}

/**
 * 将当前内存中的数据库持久化保存到 campus.db 文件
 */
export function saveDb() {
  if (!db) {
    console.warn('[DB] 数据库实例不存在，跳过保存')
    return
  }
  const data = db.export()
  fs.writeFileSync(DB_PATH, Buffer.from(data))
  console.log('[DB] 数据库已保存到:', DB_PATH)
}
