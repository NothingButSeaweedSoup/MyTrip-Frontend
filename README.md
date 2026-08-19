 # My_Trip 前端应用
 
 基于 **Vue 3 + Vite 8 + Vue Router + Pinia** 构建的智能旅游平台前端，提供现代化的 SPA 用户体验，涵盖游记浏览、发布、搜索、智能行程规划等功能。
 
 ## 技术栈
 
 - **框架**: Vue 3 (Composition API, `<script setup>`)
 - **构建工具**: Vite 8
 - **路由**: Vue Router 4 (History 模式)
 - **状态管理**: Pinia（组合式 Store）
 - **Markdown 渲染**: marked
 - **后端代理**: Vite 开发服务器代理至后端 `localhost:8180`
 
 ## 页面与功能
 
 | 页面 | 路由 | 说明 |
 |------|------|------|
 | **首页** | `/` | 游记信息流 |
 | **登录** | `/login` | 用户登录 |
 | **注册** | `/register` | 用户注册 |
 | **游记详情** | `/post/:id` | 查看游记全文（需登录） |
 | **发布游记** | `/publish` | 创建新游记（需登录） |
 | **收藏夹** | `/favorites` | 我的收藏（需登录） |
 | **个人主页** | `/profile` | 个人信息展示（需登录） |
 | **编辑资料** | `/profile/edit` | 修改个人资料（需登录） |
 | **设置** | `/settings` | 账户设置（需登录） |
 | **修改密码** | `/settings/password` | 修改登录密码（需登录） |
 | **搜索** | `/search` | 游记搜索 |
 | **审核页** | `/review` | 内容审核（审核员/管理员） |
 | **管理后台** | `/admin` | 系统管理（管理员） |
 | **行程规划** | `/trip` | AI 智能行程规划（需登录） |
 
 ### 管理后台功能
 
 - **仪表盘** — 系统数据统计概览
 - **用户管理** — 用户列表、角色分配、状态管理
 - **景点管理** — 景点 CRUD
 - **标签管理** — 标签 CRUD
 - **内容审核** — 游记审核队列
 - **系统配置** — 推荐参数、搜索参数等动态配置
 - **敏感词管理** — 敏感词库维护
 - **邮件推送** — 邮件通知管理
 - **模型配置** — AI 模型参数配置
 
 ## 快速启动
 
 ### 前置要求
 
 - Node.js 20+ 或 22+
 - npm
 
 ### 安装依赖
 
 ```bash
 npm install
 ```
 
 ### 开发模式
 
 ```bash
 npm run dev
 ```
 
 开发服务器默认运行在 **`http://localhost:5173`**，并自动代理 `/api` 和 `/uploads` 请求到后端 `http://localhost:8180`。
 
 ### 生产构建
 
 ```bash
 npm run build
 ```
 
 构建产物输出到 `dist/` 目录，可使用 Nginx 等静态服务器部署。
 
 ## 项目结构
 
 ```
 frontend/
 ├── public/                  # 静态资源
 ├── src/
 │   ├── api/                 # API 请求封装
 │   ├── assets/              # 样式、图片等资源
 │   ├── components/          # 通用组件
 │   │   ├── admin/           # 管理后台通用组件
 │   │   ├── PostCard.vue     # 游记卡片
 │   │   ├── PostGrid.vue     # 游记网格
 │   │   ├── SearchBar.vue    # 搜索栏
 │   │   └── SidebarNav.vue   # 侧边导航
 │   ├── pages/               # 页面组件
 │   │   └── admin/           # 管理后台各标签页
 │   ├── router/              # 路由配置
 │   ├── stores/              # Pinia 状态管理
 │   ├── utils/               # 工具函数
 │   ├── config.js            # 前端配置
 │   ├── App.vue              # 根组件
 │   └── main.js              # 入口文件
 ├── index.html
 ├── vite.config.js
 ├── nginx.conf               # Nginx 部署配置
 ├── Dockerfile
 └── package.json
 ```
 
 ## Docker 部署
 
 项目根目录提供了 Docker Compose 配置，可一键启动前后端及依赖服务：
 
 ```bash
 docker compose up -d
 ```
 
 也可单独构建前端镜像：
 
 ```bash
 docker build -t my-trip-frontend .
 docker run -p 5173:80 my-trip-frontend
 ```
