# Journal Hub

Journal Hub 是一个本地优先的 Desktop 日志、日历与待办管理应用，带 MCP 接入能力。

## 架构原则

Desktop 是主程序和唯一控制面：

- Desktop 可以独立启动和运行。
- Desktop 负责启动 Backend API。
- Desktop 负责启动或停止 MCP SSE 服务。
- MCP 不负责启动 Desktop 或 Backend。
- 安装过程中会检查并提示关闭已运行的 `Journal Hub.exe`。

## 项目结构

```text
journal-hub/
├── frontend/              # React + Electron Desktop
│   ├── src/               # 页面、组件和 API 客户端
│   └── electron/          # Electron main/preload
├── backend/               # Express + SQLite 本地 API
└── mcp-server/            # MCP SSE 服务与 stdio 兼容 shim
```

## 运行模型

```text
Journal Hub Desktop
  ├─ Backend API: http://127.0.0.1:3001/api
  └─ MCP SSE:     http://127.0.0.1:3002/sse

MCP stdio shim
  └─ only forwards calls to Desktop-managed Backend API
```

如果 Desktop 没有启动，MCP 不提供业务能力。stdio shim 被外部 MCP 客户端拉起时，也只会返回明确错误，不会自行启动后端服务。

## MCP 接入

优先使用支持 SSE/HTTP 的 MCP 客户端：

```text
http://127.0.0.1:3002/sse
```

仅支持 stdio 的客户端可以配置兼容 shim：

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

MCP 开关在 Desktop 设置中控制。关闭后，SSE 服务会停止；stdio shim 即使被客户端启动，也无法访问数据。

## 安装

详见 [install.md](./install.md)。
