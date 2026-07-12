# Journal Hub - 极简日志与待办管理系统 (带 MCP 能力)

Journal Hub 是一个专为效率和极简主义者设计的个人日志、日历与待办事项管理系统。本系统前端采用 React 18 + TypeScript + Vite + Tailwind CSS v4 构建，后端使用 Express + SQLite 提供持久化存储，并为 AI 客户端提供了原生的 MCP (Model Context Protocol) 协议接入支持，使得 AI 可以直接读取、创建和管理您的日志与待办事项。

---

## 🌟 核心设计规范与特点

1. **极简主义视觉风格**：
   - **统一字体与排版**：采用统一的 `Inter` 字体，文字排版遵循严格的行高 (1.6) 和基准网格间距。
   - **无背景色高亮**：信息突出不使用花哨的背景色，仅通过微弱精致的边框 (`border`) 变化来区分。
   - **完全无原生弹窗**：禁用浏览器原生的 `alert`、`confirm` 和 `prompt`，全部使用高度定制的 shadcn/ui 组件和 Toast 系统。
2. **日历与待办双向联动**：
   - 支持在日历视图中直观查看日志的分布与当天的事项。
   - 待办事项支持优先级设置（高、中、低）、截止日期，并可在日历中展现。
3. **AI 友好 (MCP 协议)**：
   - 内置一套功能完备的 MCP 服务端，提供 16 个标准化工具，涵盖日志管理、待办操作、日历事件获取及多维度数据统计。

---

## 📂 项目结构

```
journal-hub/
├── frontend/              # React 前端
│   ├── src/
│   │   ├── components/    # 页面组件与 UI 库
│   │   ├── pages/         # 日历、日志、待办、仪表盘页面
│   │   ├── lib/           # API 接口请求与辅助工具
│   │   └── types/         # TypeScript 类型定义
├── backend/               # Express + SQLite 后端服务
│   ├── src/
│   │   ├── db/            # 数据库配置与 schema 定义
│   │   ├── routes/        # API 接口路由 (journals, todos, calendar, stats)
│   │   └── server.js      # 后端入口
└── mcp-server/            # 基于 @modelcontextprotocol/sdk 的 MCP 服务
    ├── index.js           # MCP 服务入口
    └── package.json
```

---

## 🚀 启动与运行指南

### 1. 后端 Express 服务

后端使用 SQLite 作为数据库，第一次运行会自动在 `backend/data/` 目录下生成数据库文件。

```bash
cd backend
npm install
npm run dev
```
*后端服务将默认运行在：`http://localhost:3001`*

### 2. 前端 React 应用

```bash
cd frontend
npm install
npm run dev
```
*前端页面将默认运行在：`http://localhost:5173`*

### 3. MCP 服务端验证与接入

MCP 服务端使用标准输入输出 (`stdio`) 进行通信。

#### 本地运行与验证
```bash
cd mcp-server
npm install
node index.js
```
*成功启动将输出：`Journal Hub MCP Server running via stdio`*

#### 接入 Claude Desktop
若要在 Claude Desktop 客户端中直接调用 Journal Hub 的功能，请在 Claude 的配置文件 `claude_desktop_config.json` 中添加以下配置：

```json
{
  "mcpServers": {
    "journal-hub": {
      "command": "node",
      "args": [
        "d:/project/journal-hub/mcp-server/index.js"
      ],
      "env": {
        "API_BASE": "http://localhost:3001/api"
      }
    }
  }
}
```

---

## 🛠️ MCP 工具清单 (AI 接口)

AI 可直接调用的核心能力包括：
- **日志管理**：
  - `journal_create`: 新增日志（支持情绪表情与标签）
  - `journal_list`: 按日期、标签过滤或分页读取日志列表
  - `journal_get`: 根据 ID 查询单篇日志
  - `journal_update`: 更新日志内容
  - `journal_delete`: 删除指定日志
  - `journal_search`: 日志全文检索
- **待办管理**：
  - `todo_list`: 获取待办事项列表（支持状态、优先级、到期日过滤）
  - `todo_create`: 创建新待办任务
  - `todo_update`: 更新待办属性
  - `todo_complete`: 快速标记待办完成状态
  - `todo_delete`: 删除待办
- **日历与统计**：
  - `calendar_events_list`: 获取指定时间范围内的日历日程
  - `calendar_event_create`: 添加新的日程通知
  - `calendar_get_day`: 聚合获取特定一天的全部信息（日志、待办、日程）
  - `stats_overview`: 系统的使用统计概览
