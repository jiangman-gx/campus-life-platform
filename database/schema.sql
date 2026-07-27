-- ============================================================
-- 校园生活服务平台 - 数据库表结构设计
-- 数据库: SQLite
-- 说明: 包含用户、课表、食堂、评价、二手物品、失物招领6张表
-- ============================================================

-- ------------------------------------------------------------
-- 1. 用户表 (users)
-- 用途: 存储所有注册用户的基本信息
-- 关联: 被 courses、reviews、items、lost_found 表通过 user_id 引用
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,  -- 主键，自增
    username    VARCHAR(50)  NOT NULL UNIQUE,       -- 用户名，唯一，非空
    password    VARCHAR(255) NOT NULL,              -- 密码哈希值，非空
    email       VARCHAR(100) UNIQUE,                -- 邮箱，唯一
    phone       VARCHAR(20),                        -- 手机号
    avatar      VARCHAR(255),                       -- 头像URL
    student_id  VARCHAR(20)  UNIQUE,                -- 学号，唯一
    real_name   VARCHAR(50),                        -- 真实姓名
    college     VARCHAR(100),                       -- 学院
    grade       VARCHAR(20),                        -- 年级
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
    updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP   -- 更新时间
);

-- ------------------------------------------------------------
-- 2. 课表表 (courses)
-- 用途: 存储用户个人的课程安排信息
-- 关联: 通过 user_id 关联 users 表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,  -- 主键，自增
    user_id      INTEGER  NOT NULL,                  -- 用户ID，外键→users.id
    course_name  VARCHAR(100) NOT NULL,              -- 课程名称，非空
    teacher      VARCHAR(50),                        -- 授课教师
    location     VARCHAR(100),                       -- 上课地点
    day_of_week  INTEGER,                            -- 星期几（1-7，1=周一）
    start_time   TIME,                               -- 开始时间
    end_time     TIME,                               -- 结束时间
    start_week   INTEGER,                            -- 开始周次
    end_week     INTEGER,                            -- 结束周次
    semester     VARCHAR(20),                        -- 学期（如 2025春）
    credit       FLOAT,                              -- 学分
    remark       TEXT,                               -- 备注
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP, -- 创建时间
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP, -- 更新时间
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 3. 食堂表 (canteens)
-- 用途: 存储学校各食堂的基本信息
-- 关联: 被 reviews 表通过 canteen_id 引用
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS canteens (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,   -- 主键，自增
    name        VARCHAR(100) NOT NULL,               -- 食堂名称，非空
    location    VARCHAR(255),                        -- 位置
    open_time   VARCHAR(100),                        -- 营业时间
    description TEXT,                                -- 食堂描述
    image       VARCHAR(255),                        -- 食堂图片URL
    phone       VARCHAR(20),                         -- 联系电话
    avg_rating  FLOAT       DEFAULT 0,               -- 平均评分（0-5）
    status      INTEGER     DEFAULT 1,               -- 状态（0关闭，1营业）
    created_at  DATETIME    DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
    updated_at  DATETIME    DEFAULT CURRENT_TIMESTAMP   -- 更新时间
);

-- ------------------------------------------------------------
-- 4. 评价表 (reviews)
-- 用途: 存储用户对食堂及菜品的评价信息
-- 关联: 通过 user_id 关联 users 表，通过 canteen_id 关联 canteens 表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,   -- 主键，自增
    user_id      INTEGER  NOT NULL,                   -- 用户ID，外键→users.id
    canteen_id   INTEGER  NOT NULL,                   -- 食堂ID，外键→canteens.id
    dish_name    VARCHAR(100),                        -- 菜品名称
    rating       INTEGER  NOT NULL,                   -- 评分（1-5），非空
    content      TEXT,                                -- 评价内容
    images       TEXT,                                -- 评价图片URL（JSON数组）
    is_anonymous INTEGER  DEFAULT 0,                  -- 是否匿名（0否，1是）
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 更新时间
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (canteen_id) REFERENCES canteens(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 5. 二手物品表 (items)
-- 用途: 存储用户发布的二手交易物品信息
-- 关联: 通过 user_id 关联 users 表（发布者）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS items (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,   -- 主键，自增
    user_id       INTEGER  NOT NULL,                   -- 发布者ID，外键→users.id
    title         VARCHAR(100) NOT NULL,               -- 物品标题，非空
    description   TEXT,                                -- 物品描述
    price         DECIMAL(10,2) NOT NULL,              -- 价格，非空
    original_price DECIMAL(10,2),                      -- 原价
    category      VARCHAR(50),                         -- 分类（书籍/电子/生活等）
    condition     VARCHAR(20),                         -- 成色（全新/九成新等）
    images        TEXT,                                -- 图片URL（JSON数组）
    location      VARCHAR(100),                        -- 交易地点
    contact       VARCHAR(100),                        -- 联系方式
    status        INTEGER  DEFAULT 1,                  -- 状态（0下架，1在售，2已售出）
    view_count    INTEGER  DEFAULT 0,                  -- 浏览次数
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 更新时间
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 6. 失物招领表 (lost_found)
-- 用途: 存储用户发布的失物或招领信息
-- 关联: 通过 user_id 关联 users 表（发布者）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lost_found (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,   -- 主键，自增
    user_id     INTEGER  NOT NULL,                   -- 发布者ID，外键→users.id
    type        INTEGER  NOT NULL,                   -- 类型（0失物，1招领），非空
    title       VARCHAR(100) NOT NULL,               -- 标题，非空
    description TEXT,                                -- 详细描述
    category    VARCHAR(50),                         -- 物品分类
    location    VARCHAR(100),                        -- 丢失/捡到地点
    lost_time   DATETIME,                            -- 丢失/捡到时间
    images      TEXT,                                -- 图片URL（JSON数组）
    contact     VARCHAR(100),                        -- 联系方式
    status      INTEGER  DEFAULT 0,                  -- 状态（0未解决，1已解决）
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 更新时间
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- 索引（提升查询性能）
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_courses_user_id      ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id      ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_canteen_id   ON reviews(canteen_id);
CREATE INDEX IF NOT EXISTS idx_items_user_id        ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_status         ON items(status);
CREATE INDEX IF NOT EXISTS idx_lost_found_user_id   ON lost_found(user_id);
CREATE INDEX IF NOT EXISTS idx_lost_found_type      ON lost_found(type);
CREATE INDEX IF NOT EXISTS idx_lost_found_status    ON lost_found(status);
