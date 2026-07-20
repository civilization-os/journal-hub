# Journal Hub 安装指南

本文档用于让人类用户或 AI Agent 快速完成 Journal Hub 的本地安装、构建和 MCP 接入。

## 环境要求

- Node.js 18 或更高版本
- npm
- Windows、macOS 或 Linux 终端

## 一键安装步骤

在项目根目录执行以下命令：

```bash
cd frontend
npm install
npm run build

cd ../backend
npm install

cd ../mcp-server
npm install
```

## 启动 Journal Hub

推荐从 MCP 服务入口启动。它会自动启动 Web/API 服务，并同时暴露 MCP stdio 工具。

```bash
cd mcp-server
node index.js
```

启动后访问：

```text
http://localhost:3001
```

## MCP 客户端配置

将你的 MCP 客户端配置指向 `mcp-server/index.js`。请把路径替换成你的本地绝对路径。

```json
{
  "mcpServers": {
    "journal-hub": {
      "command": "node",
      "args": [
        "D:\\project\\journal-hub\\mcp-server\\index.js"
      ]
    }
  }
}
```

如果项目路径不是 `D:\project\journal-hub`，请修改为实际路径，例如：

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

## Codex 项目级配置

本项目已提供项目级 MCP 配置文件：

```text
.mcp.json
```

内容示例：

```json
{
  "mcpServers": {
    "journal-hub": {
      "command": "node",
      "args": [
        "D:\\project\\journal-hub\\mcp-server\\index.js"
      ]
    }
  }
}
```

如果你移动了项目目录，需要同步更新 `.mcp.json` 中的绝对路径。

## 验证 MCP 是否可用

重启 MCP 客户端后，确认能看到 `journal-hub` 工具。可用工具包括：

- `journal_create`
- `journal_list`
- `journal_search`
- `todo_create`
- `todo_update`
- `todo_complete`
- `calendar_events_list`
- `calendar_get_day`
- `stats_overview`
- `open_web_ui`

## 常见问题

### 端口 3001 被占用

这是预期行为。MCP 服务内置多启动防护：

- 如果 3001 空闲，会启动完整 Web/API 服务。
- 如果 3001 已被占用，会只启动 MCP stdio 服务，避免端口冲突。

### 修改 `.mcp.json` 后没有生效

多数 MCP 客户端不会热加载配置。修改后请重启客户端，或重新打开项目。

### 中文显示乱码

请确保用 UTF-8 读取 Markdown 文件。在 PowerShell 中可使用：

```powershell
Get-Content install.md -Encoding utf8
Get-Content README.md -Encoding utf8
```
