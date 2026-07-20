# Journal Hub - 极简日志与待办管理系统 (带 MCP 能力)

Journal Hub 是一个专为效率和极简主义者设计的个人日志、日历与待办事项管理系统。本系统前端采用 React 18 + TypeScript + Vite + Tailwind CSS v4 构建，后端使用 Express + SQLite 提供持久化存储，并为 AI 客户端提供了原生的 MCP (Model Context Protocol) 协议接入支持，使得 AI 可以直接读取、创建和管理您的日志与待办事项。

> 安装与 MCP 接入请优先阅读：[install.md](./install.md)

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
   - 内置一套功能完备的 MCP 服务端，提供标准化工具，涵盖日志管理、待办操作、日历事件获取及多维度数据统计。

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

完整安装步骤请见：[install.md](./install.md)

本系统采用 **MCP 统一入口与多启动防护架构**。MCP 服务不仅提供 AI 操作能力，还负责自动启动 Web 后端并挂载前端产物。

### 1. 准备环境与构建前端

首先需要安装依赖并构建前端静态页面，以便后端能够挂载 `dist` 产物。

```bash
# 构建前端
cd frontend
npm install
npm run build

# 安装后端和 MCP 依赖
cd ../backend
npm install
cd ../mcp-server
npm install
```

### 2. 启动服务 (人机协同统一入口)

你可以直接通过启动 MCP 服务来拉起整个系统：

```bash
cd mcp-server
node index.js
```
* **首次启动（Primary）**：由于端口 3001 闲置，系统将启动 Express API 服务、挂载前端页面，并同时开启 MCP stdio 服务。你可以直接在浏览器访问 `http://localhost:3001` 使用网页端。
* **多次启动（多启动防护）**：当你在其他 AI Agent（或新终端）中再次运行此命令时，系统会检测到端口 3001 被占用，从而触发多启动防护。此时它会优雅降级，**仅启动 MCP stdio 服务**，避免冲突。

### 3. AI 客户端 (MCP) 接入配置

无论是使用 Linkweaver、Claude Desktop、Cursor 还是 Cline，你只需要将系统指向 `mcp-server/index.js` 即可。

#### 示例：接入配置 (Claude Desktop / Cline 等)

请在相应的 MCP 配置文件（如 `claude_desktop_config.json`）中添加以下配置：

```json
{
  "mcpServers": {
    "journal-hub": {
      "command": "node",
      "args": [
        "绝对路径/到/你的/journal-hub/mcp-server/index.js"
      ]
    }
  }
}
```
*配置完成后，当 AI 客户端启动该命令时，它将自动提供 AI 操作能力，并在本地没有服务时自动为你启动完整的 `http://localhost:3001` Web 页面服务！*

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
