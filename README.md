# 🎓 校园生活服务平台

一站式校园生活综合服务平台，集成食堂点评、二手交易、失物招领、AI智能助手等核心功能，为在校师生提供便捷的校园生活服务。

---

## ✨ 功能截图

### 🏠 首页
![首页](screenshot-home.png)
> 平台首页，展示校园生活四大核心功能入口：食堂点评、二手交易、失物招领、课程表

### 🔐 登录注册
![登录页面](screenshot-auth.png)
> 用户认证系统，支持注册和登录，JWT Token 保障安全，登录后导航栏显示用户名

### 🍽️ 食堂点评 + AI 总结
![食堂AI总结](screenshot-canteen-ai.png)
> 查看各食堂评分评价，点击「🤖 AI总结」自动生成三句话口碑分析（整体口碑、推荐菜品、价格水平）

### 🔄 二手交易 + AI 描述
![二手AI描述](screenshot-trade-ai.png)
> 浏览和发布二手商品，填写名称和价格后点击「🤖 AI帮我写描述」自动生成带 emoji 的活泼文案

### 🔍 失物招领
![失物招领](screenshot-lostfound.png)
> 查看和发布丢失/捡到物品信息，支持按类型筛选（丢失/捡到），最新发布排在前面

### 👤 个人中心
![个人中心](screenshot-profile.png)
> 个人中心页面，展示用户基本信息（建设中，更多功能即将上线）

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **前端框架** | React 19 + TypeScript |
| **构建工具** | Vite 5 |
| **样式** | Tailwind CSS 3 |
| **路由** | React Router v7 |
| **后端框架** | Express 5 (Node.js) |
| **数据库** | SQLite (sql.js) |
| **认证** | JWT (jsonwebtoken) + bcryptjs |
| **AI 模型** | DeepSeek Chat API |
| **部署前端** | Vercel |
| **部署后端** | Railway |

---

## 🔗 部署链接

| 服务 | 地址 |
|------|------|
| **前端（Vercel）** | [https://campus-life-platform-zeta.vercel.app](https://campus-life-platform-zeta.vercel.app) |
| **后端 API（Railway）** | [https://campus-life-platform-production.up.railway.app](https://campus-life-platform-production.up.railway.app) |
| **GitHub 仓库** | [https://github.com/jiangman-gx/campus-life-platform](https://github.com/jiangman-gx/campus-life-platform) |

---

## 🚀 本地运行方法

### 前置要求
- Node.js >= 18
- npm >= 9

### 1. 克隆项目

```bash
git clone https://github.com/jiangman-gx/campus-life-platform.git
cd campus-life-platform
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量（可选，如需 AI 功能）

创建 `.env` 文件：

```env
DEEPSEEK_API_KEY=你的DeepSeek_API_Key
DEEPSEEK_API_BASE=https://api.deepseek.com
```

### 4. 启动后端

```bash
npm run server
```

后端默认运行在 `http://localhost:3001`

### 5. 启动前端

```bash
npm run dev
```

前端默认运行在 `http://localhost:5173`

> 前端通过 Vite 代理将 `/api` 请求转发到 `localhost:3001`，无需额外配置跨域。

### 6. 打开浏览器

访问 [http://localhost:5173](http://localhost:5173)

---

## 📁 项目结构

```
campus-life-platform/
├── server/                  # 后端
│   ├── database/           # 数据库初始化、连接
│   ├── middleware/         # 认证中间件
│   ├── routes/            # 路由模块
│   │   ├── ai.js          # AI 接口（评价总结、商品描述）
│   │   ├── auth.js        # 注册、登录、用户信息
│   │   ├── canteens.js    # 食堂
│   │   ├── items.js       # 二手商品
│   │   ├── lost-found.js  # 失物招领
│   │   └── reviews.js     # 评价
│   └── index.js           # 入口文件
├── src/                    # 前端
│   ├── components/        # 可复用组件
│   ├── pages/             # 页面
│   ├── config/            # 配置（API 地址等）
│   └── App.tsx            # 根组件
├── public/                 # 静态资源
├── vercel.json             # Vercel 部署配置
├── package.json
└── vite.config.js
```

---

## 📊 测试报告

- [测试报告文档](测试报告-校园生活服务平台.docx)
- [Bug 修复报告](Bug修复报告.docx)

所有测试用例 **46 个全部通过**，通过率 **100%**。

---

## 📄 许可证

MIT
