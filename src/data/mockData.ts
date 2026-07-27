// ============================================================
// 校园生活服务平台 - 模拟数据文件
// 包含：食堂列表、二手商品列表、评价列表
// ============================================================

// ---------------- 类型定义 ----------------

export interface Canteen {
  id: number
  name: string
  location: string
  rating: number
  tags: string[]
  image: string
}

export interface Item {
  id: number
  title: string
  price: number
  category: string
  image: string
  seller: string
}

export interface Review {
  id: number
  canteenId: number
  username: string
  content: string
  rating: number
  time: string
}

// ---------------- 食堂列表数据 ----------------

export const canteens: Canteen[] = [
  {
    id: 1,
    name: '第一食堂',
    location: '教学楼A栋一楼',
    rating: 4.5,
    tags: ['经济实惠', '菜量大', '人流量大'],
    image: 'https://picsum.photos/seed/canteen1/400/300',
  },
  {
    id: 2,
    name: '第二食堂',
    location: '图书馆旁',
    rating: 4.2,
    tags: ['环境好', '种类多', '适合自习'],
    image: 'https://picsum.photos/seed/canteen2/400/300',
  },
  {
    id: 3,
    name: '第三食堂',
    location: '学生宿舍区',
    rating: 3.8,
    tags: ['距离近', '快餐为主', '价格便宜'],
    image: 'https://picsum.photos/seed/canteen3/400/300',
  },
  {
    id: 4,
    name: '教工食堂',
    location: '行政楼一楼',
    rating: 4.7,
    tags: ['品质高', '安静', '需教工卡'],
    image: 'https://picsum.photos/seed/canteen4/400/300',
  },
]

// ---------------- 二手商品列表数据 ----------------

export const items: Item[] = [
  {
    id: 1,
    title: '高等数学第七版（上下册）',
    price: 25,
    category: '教材',
    image: 'https://picsum.photos/seed/item1/400/300',
    seller: '学霸小明',
  },
  {
    id: 2,
    title: 'iPad Air 4 64G 银色',
    price: 2800,
    category: '电子',
    image: 'https://picsum.photos/seed/item2/400/300',
    seller: '数码达人',
  },
  {
    id: 3,
    title: '大学物理实验报告册',
    price: 8,
    category: '教材',
    image: 'https://picsum.photos/seed/item3/400/300',
    seller: '物理课代表',
  },
  {
    id: 4,
    title: '宿舍收纳架三层',
    price: 35,
    category: '生活',
    image: 'https://picsum.photos/seed/item4/400/300',
    seller: '搬家中',
  },
  {
    id: 5,
    title: '罗技无线鼠标 M275',
    price: 45,
    category: '电子',
    image: 'https://picsum.photos/seed/item5/400/300',
    seller: '数码达人',
  },
  {
    id: 6,
    title: '吉他入门教程+谱子',
    price: 15,
    category: '其他',
    image: 'https://picsum.photos/seed/item6/400/300',
    seller: '音乐爱好者',
  },
  {
    id: 7,
    title: '英语四级真题合集',
    price: 12,
    category: '教材',
    image: 'https://picsum.photos/seed/item7/400/300',
    seller: '已上岸',
  },
  {
    id: 8,
    title: '台灯护眼LED款',
    price: 30,
    category: '生活',
    image: 'https://picsum.photos/seed/item8/400/300',
    seller: '搬家中',
  },
]

// ---------------- 评价列表数据 ----------------

export const reviews: Review[] = [
  {
    id: 1,
    canteenId: 1,
    username: '吃货同学A',
    content: '红烧肉盖饭绝绝子！肉给得超多，汤汁拌饭一绝，强烈推荐。',
    rating: 5,
    time: '2025-03-15 12:30',
  },
  {
    id: 2,
    canteenId: 1,
    username: '匿名用户',
    content: '中午人太多了，排队要十几分钟，但味道确实不错。',
    rating: 4,
    time: '2025-03-14 13:10',
  },
  {
    id: 3,
    canteenId: 2,
    username: '图书馆常客',
    content: '环境很好，吃完可以直接去图书馆学习，麻辣香锅很正宗。',
    rating: 5,
    time: '2025-03-13 18:45',
  },
  {
    id: 4,
    canteenId: 2,
    username: '挑剔的胃',
    content: '种类是多，但价格比一食堂贵一点，性价比一般。',
    rating: 3,
    time: '2025-03-12 12:00',
  },
  {
    id: 5,
    canteenId: 3,
    username: '宿舍楼长',
    content: '离宿舍近是最大优点，快餐为主，赶时间可以吃，别期待太多。',
    rating: 4,
    time: '2025-03-11 19:20',
  },
  {
    id: 6,
    canteenId: 3,
    username: '匿名用户',
    content: '黄焖鸡米饭还行，其他菜品味道偏淡，胜在便宜。',
    rating: 3,
    time: '2025-03-10 12:50',
  },
  {
    id: 7,
    canteenId: 4,
    username: '蹭饭学生',
    content: '菜品品质确实高，环境安静不拥挤，就是需要教工卡才能进。',
    rating: 5,
    time: '2025-03-09 11:30',
  },
  {
    id: 8,
    canteenId: 4,
    username: '教工王老师',
    content: '糖醋排骨做得很好，食材新鲜，比学生食堂质量高一截。',
    rating: 5,
    time: '2025-03-08 12:15',
  },
]
