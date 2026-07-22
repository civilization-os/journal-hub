# Journal Hub 安装与 MCP 接入

Journal Hub 的主程序是 Desktop。Desktop 可以独立启动和运行，并负责启动本地 Backend API 与 MCP 服务。

## 安装依赖与构建

```bash
cd frontend
npm install
npm run build

cd ../backend
npm install

cd ../mcp-server
npm install
```

## 启动方式

推荐从 Desktop 启动 Journal Hub：

```bash
cd frontend
npm run build:electron
```

安装后的 `Journal Hub.exe` 会作为主控制面启动：

- Backend API: `http://127.0.0.1:3001/api`
- MCP SSE endpoint: `http://127.0.0.1:3002/sse`

如果 Desktop 没有启动，MCP 不会提供业务能力。

## MCP 开关

在 Desktop 的设置中启用或关闭 MCP。

- 开启后，Desktop 会启动 MCP SSE 服务。
- 关闭后，Desktop 会停止 MCP SSE 服务。
- stdio 兼容入口即使被外部 MCP 客户端启动，也只会连接 Desktop 管理的 API；如果 Desktop 未运行或 MCP 已关闭，会返回明确错误。

## MCP 客户端配置

优先使用支持 SSE/HTTP 的 MCP 客户端，连接：

```text
http://127.0.0.1:3002/sse
```

如果客户端只支持 stdio，可以使用兼容 shim：

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

stdio shim 不会启动 Desktop 或 Backend。它只负责把 MCP 工具调用转发到 Desktop 管理的本地 API。

## 安装时关闭已运行程序

Windows 安装包会在安装开始时检查 `Journal Hub.exe` 是否正在运行。如果检测到已运行实例，会提示用户确认关闭程序后继续安装，或取消安装。

## 常见问题

### Desktop 没启动时 MCP 会怎样？

SSE 模式下 endpoint 不存在，客户端无法连接。

stdio shim 模式下，MCP 进程可以被客户端拉起，但工具调用会返回：

```text
Journal Hub Desktop is not running or MCP is disabled. Please start Journal Hub Desktop and enable MCP in Settings, then retry this tool.
```

### 端口 3001 或 3002 被占用怎么办？

3001 是 Desktop 管理的 Backend API 端口，3002 是 Desktop 管理的 MCP SSE 端口。正常使用时不应该手动启动这些服务。若端口被其他进程占用，请关闭占用进程后重新启动 Desktop。
