import { getDb, saveDb, initDatabase as initConnection } from './connection.js'

// ============================================================
// 建表 SQL（与项目 schema.sql 保持一致）
// ============================================================
const CREATE_TABLES_SQL = `
-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    VARCHAR(50)  NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    email       VARCHAR(100) UNIQUE,
    phone       VARCHAR(20),
    avatar      VARCHAR(255),
    student_id  VARCHAR(20)  UNIQUE,
    real_name   VARCHAR(50),
    college     VARCHAR(100),
    grade       VARCHAR(20),
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- 2. 课表表
CREATE TABLE IF NOT EXISTS courses (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER  NOT NULL,
    course_name  VARCHAR(100) NOT NULL,
    teacher      VARCHAR(50),
    location     VARCHAR(100),
    day_of_week  INTEGER,
    start_time   TIME,
    end_time     TIME,
    start_week   INTEGER,
    end_week     INTEGER,
    semester     VARCHAR(20),
    credit       FLOAT,
    remark       TEXT,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. 食堂表
CREATE TABLE IF NOT EXISTS canteens (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        VARCHAR(100) NOT NULL,
    location    VARCHAR(255),
    open_time   VARCHAR(100),
    description TEXT,
    image       VARCHAR(255),
    phone       VARCHAR(20),
    avg_rating  FLOAT       DEFAULT 0,
    status      INTEGER     DEFAULT 1,
    created_at  DATETIME    DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME    DEFAULT CURRENT_TIMESTAMP
);

-- 4. 评价表
CREATE TABLE IF NOT EXISTS reviews (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER  NOT NULL,
    canteen_id   INTEGER  NOT NULL,
    dish_name    VARCHAR(100),
    rating       INTEGER  NOT NULL,
    content      TEXT,
    images       TEXT,
    is_anonymous INTEGER  DEFAULT 0,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (canteen_id) REFERENCES canteens(id) ON DELETE CASCADE
);

-- 5. 二手物品表
CREATE TABLE IF NOT EXISTS items (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER  NOT NULL,
    title          VARCHAR(100) NOT NULL,
    description    TEXT,
    price          DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    category       VARCHAR(50),
    condition      VARCHAR(20),
    images         TEXT,
    location       VARCHAR(100),
    contact        VARCHAR(100),
    status         INTEGER  DEFAULT 1,
    view_count     INTEGER  DEFAULT 0,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. 失物招领表
CREATE TABLE IF NOT EXISTS lost_found (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER  NOT NULL,
    type        INTEGER  NOT NULL,
    title       VARCHAR(100) NOT NULL,
    description TEXT,
    category    VARCHAR(50),
    location    VARCHAR(100),
    lost_time   DATETIME,
    images      TEXT,
    contact     VARCHAR(100),
    status      INTEGER  DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_courses_user_id    ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id    ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_canteen_id ON reviews(canteen_id);
CREATE INDEX IF NOT EXISTS idx_items_user_id      ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_status       ON items(status);
CREATE INDEX IF NOT EXISTS idx_lost_found_user_id ON lost_found(user_id);
CREATE INDEX IF NOT EXISTS idx_lost_found_type    ON lost_found(type);
CREATE INDEX IF NOT EXISTS idx_lost_found_status  ON lost_found(status);
`

// ============================================================
// 初始数据
// ============================================================
const INITIAL_CANTEENS = [
  { name: '第一食堂', location: '东校区', avg_rating: 4.2, tags: '["自选","快餐"]' },
  { name: '第二食堂', location: '西校区', avg_rating: 4.0, tags: '["面食","小炒"]' },
  { name: '第三食堂', location: '北校区', avg_rating: 3.8, tags: '["麻辣烫","盖饭"]' },
  { name: '教工食堂', location: '中心区', avg_rating: 4.5, tags: '["自助","点菜"]' },
]

const INITIAL_ITEMS = [
  { user_id: 1, title: '高等数学（第七版）', price: 25, category: '教材', contact: '学长A', status: 1 },
  { user_id: 1, title: '机械键盘 Cherry MX', price: 150, category: '电子', contact: '同学B', status: 1 },
  { user_id: 1, title: '台灯 LED 护眼', price: 45, category: '生活', contact: '学姐C', status: 1 },
  { user_id: 1, title: 'Python编程从入门到实践', price: 30, category: '教材', contact: '学长D', status: 1 },
  { user_id: 1, title: '蓝牙耳机 AirPods', price: 200, category: '电子', contact: '同学E', status: 1 },
  { user_id: 1, title: '床上小桌板', price: 35, category: '生活', contact: '学姐F', status: 1 },
]

const INITIAL_LOST_FOUND = [
  { user_id: 1, type: 0, title: '黑色钱包', location: '图书馆', lost_time: '2025-01-10', description: '内有学生证和现金' },
  { user_id: 1, type: 1, title: 'U盘 金士顿32G', location: '教学楼A301', lost_time: '2025-01-11', description: '蓝色外壳' },
  { user_id: 1, type: 0, title: '校园卡', location: '食堂二楼', lost_time: '2025-01-12', description: '学号2024开头' },
  { user_id: 1, type: 1, title: '雨伞 黑色折叠', location: '图书馆门口', lost_time: '2025-01-12', description: '' },
]

// ============================================================
// 辅助函数：将 sql.js 的 exec 结果转成对象数组
// ============================================================
function queryToObjects(resultSet) {
  if (!resultSet || resultSet.length === 0) return []
  const { columns, values } = resultSet[0]
  return values.map((row) => {
    const obj = {}
    columns.forEach((col, i) => {
      obj[col] = row[i]
    })
    return obj
  })
}

// ============================================================
// 初始化表结构
// ============================================================
export function initSchema() {
  const db = getDb()
  db.exec(CREATE_TABLES_SQL)
  saveDb()
  console.log('[DB] 数据库表结构初始化完成')
}

// ============================================================
// 填充初始数据（幂等：已有数据则跳过）
// ============================================================
export function seedData() {
  const db = getDb()

  // ---- 检查食堂表是否已有数据 ----
  const canteenResult = db.exec('SELECT COUNT(*) AS count FROM canteens')
  const canteenCount = canteenResult.length > 0 ? canteenResult[0].values[0][0] : 0

  if (canteenCount === 0) {
    const stmt = db.prepare(
      'INSERT INTO canteens (name, location, avg_rating, description) VALUES (?, ?, ?, ?)'
    )
    INITIAL_CANTEENS.forEach((c) => {
      stmt.run([c.name, c.location, c.avg_rating, c.tags])
    })
    stmt.free()
    console.log('[DB] 已插入初始食堂数据:', INITIAL_CANTEENS.length, '条')
  } else {
    console.log('[DB] 食堂表已有数据，跳过 seed')
  }

  // ---- 检查二手物品表是否已有数据 ----
  const itemResult = db.exec('SELECT COUNT(*) AS count FROM items')
  const itemCount = itemResult.length > 0 ? itemResult[0].values[0][0] : 0

  if (itemCount === 0) {
    const stmt = db.prepare(
      'INSERT INTO items (user_id, title, price, category, contact, status) VALUES (?, ?, ?, ?, ?, ?)'
    )
    INITIAL_ITEMS.forEach((item) => {
      stmt.run([item.user_id, item.title, item.price, item.category, item.contact, item.status])
    })
    stmt.free()
    console.log('[DB] 已插入初始二手商品数据:', INITIAL_ITEMS.length, '条')
  } else {
    console.log('[DB] 二手物品表已有数据，跳过 seed')
  }

  // ---- 检查失物招领表是否已有数据 ----
  const lfResult = db.exec('SELECT COUNT(*) AS count FROM lost_found')
  const lfCount = lfResult.length > 0 ? lfResult[0].values[0][0] : 0

  if (lfCount === 0) {
    const stmt = db.prepare(
      'INSERT INTO lost_found (user_id, type, title, location, lost_time, description) VALUES (?, ?, ?, ?, ?, ?)'
    )
    INITIAL_LOST_FOUND.forEach((lf) => {
      stmt.run([lf.user_id, lf.type, lf.title, lf.location, lf.lost_time, lf.description])
    })
    stmt.free()
    console.log('[DB] 已插入初始失物招领数据:', INITIAL_LOST_FOUND.length, '条')
  } else {
    console.log('[DB] 失物招领表已有数据，跳过 seed')
  }

  saveDb()
  console.log('[DB] 初始数据填充完成')
}

// ============================================================
// 一键初始化：数据库连接 + 建表 + 填充数据
// 返回数据库实例，供 index.js 挂载到 app 上
// ============================================================
export async function initDatabase() {
  const db = await initConnection()
  initSchema()
  seedData()
  return db
}

// ============================================================
// 一键初始化：建表 + 填充数据（不包含连接初始化，供内部调用）
// ============================================================
export function setupDatabase() {
  initSchema()
  seedData()
}

// ============================================================
// 导出辅助查询函数（供路由层使用）
// ============================================================

/**
 * 执行查询并返回对象数组
 * @param {string} sql
 * @param {any[]} params
 * @returns {Record<string, any>[]}
 */
export function queryAll(sql, params = []) {
  const db = getDb()
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const results = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

/**
 * 执行查询并返回单行对象
 * @param {string} sql
 * @param {any[]} params
 * @returns {Record<string, any> | null}
 */
export function queryOne(sql, params = []) {
  const db = getDb()
  const stmt = db.prepare(sql)
  stmt.bind(params)
  let result = null
  if (stmt.step()) {
    result = stmt.getAsObject()
  }
  stmt.free()
  return result
}

/**
 * 执行 INSERT / UPDATE / DELETE
 * @param {string} sql
 * @param {any[]} params
 * @returns {number} 受影响的行数
 */
export function run(sql, params = []) {
  const db = getDb()
  const stmt = db.prepare(sql)
  stmt.run(params)
  stmt.free()
  // sql.js 不直接返回 changes，这里返回 1 表示执行成功
  return 1
}

/**
 * 执行 INSERT 并返回最后插入的 ID
 * @param {string} sql
 * @param {any[]} params
 * @returns {number}
 */
export function insert(sql, params = []) {
  const db = getDb()
  const stmt = db.prepare(sql)
  stmt.run(params)
  stmt.free()
  // 获取最后插入的 ID
  const result = db.exec('SELECT last_insert_rowid() AS id')
  if (result.length > 0 && result[0].values.length > 0) {
    return result[0].values[0][0]
  }
  return 0
}
