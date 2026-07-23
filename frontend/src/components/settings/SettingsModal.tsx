import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Check, Copy, Folder, RefreshCw, Server } from 'lucide-react'

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type McpConfig = {
  http: string
  sse: string
  stdio: string
  stdioPath: string
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [mcpEnabled, setMcpEnabled] = useState(false)
  const [dataPath, setDataPath] = useState<string>('')
  const [mcpConfig, setMcpConfig] = useState<McpConfig | null>(null)
  const [copied, setCopied] = useState<'http' | 'sse' | 'stdio' | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMigrating, setIsMigrating] = useState(false)

  useEffect(() => {
    if (!open) return

    setIsLoading(true)
    Promise.all([
      window.electronAPI?.getSettings(),
      window.electronAPI?.getDataPath(),
      window.electronAPI?.getMcpConfig(),
    ])
      .then(([settings, pathStr, config]) => {
        setMcpEnabled(!!settings?.mcpEnabled)
        if (pathStr) setDataPath(pathStr)
        if (config) setMcpConfig(config)
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [open])

  const handleMcpToggle = async (checked: boolean) => {
    setMcpEnabled(checked)
    try {
      await window.electronAPI?.toggleMcp?.(checked)
      window.dispatchEvent(new CustomEvent('mcp_status_changed'))
    } catch (e) {
      setMcpEnabled(!checked)
      console.error('Failed to toggle MCP:', e)
    }
  }

  const copyConfig = async (type: 'http' | 'sse' | 'stdio') => {
    const value = type === 'http' ? mcpConfig?.http : type === 'sse' ? mcpConfig?.sse : mcpConfig?.stdio
    if (!value) return

    await navigator.clipboard.writeText(value)
    setCopied(type)
    window.setTimeout(() => setCopied(null), 1200)
  }

  const handleMigrate = async () => {
    if (!window.electronAPI?.selectDirectory) return
    const targetPath = await window.electronAPI.selectDirectory()
    if (!targetPath || targetPath === dataPath) return

    setIsMigrating(true)
    try {
      const result = await window.electronAPI.migrateData?.(targetPath)
      if (!result?.success) {
        console.error('Data migration failed:', result?.message)
        setIsMigrating(false)
      }
    } catch (err) {
      console.error('Data migration failed:', err)
      setIsMigrating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[86vh] p-0 overflow-hidden border-zinc-200 shadow-2xl rounded-2xl">
        <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            系统设置
          </DialogTitle>
        </div>
        <div className="p-6 bg-white space-y-6 overflow-y-auto max-h-[calc(86vh-82px)]">
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">MCP 服务配置</h3>
            <div className="space-y-3">
              <div className="flex flex-row items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 p-4 shadow-sm">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-zinc-900 cursor-pointer" onClick={() => handleMcpToggle(!mcpEnabled)}>
                    启用 MCP 协议
                  </label>
                  <p className="text-xs text-zinc-500">
                    由 Desktop 托管 MCP 服务，允许 AI 客户端接入本地数据。
                  </p>
                </div>
                <button
                  disabled={isLoading || isMigrating}
                  onClick={() => handleMcpToggle(!mcpEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                    mcpEnabled ? 'bg-[#10b981]' : 'bg-zinc-200'
                  }`}
                  aria-label="切换 MCP"
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      mcpEnabled ? 'translate-x-5' : 'translate-x-1'
                    } shadow-sm`}
                  />
                </button>
              </div>

              <ConfigBlock
                title="推荐配置：Streamable HTTP"
                description="适用于支持 URL endpoint 的 MCP 客户端。Desktop 未启动或 MCP 关闭时，该 endpoint 不可用。"
                value={mcpConfig?.http || ''}
                copied={copied === 'http'}
                onCopy={() => copyConfig('http')}
              />

              <ConfigBlock
                title="兼容配置：legacy SSE"
                description="保留给仍使用 SSE 传输的客户端。新客户端优先使用 Streamable HTTP。"
                value={mcpConfig?.sse || ''}
                copied={copied === 'sse'}
                onCopy={() => copyConfig('sse')}
              />

              <ConfigBlock
                title="兼容配置：stdio shim"
                description="适用于只支持 command/args 的客户端。该 shim 不启动 Desktop，只转发到 Desktop 管理的本地 API。"
                value={mcpConfig?.stdio || ''}
                copied={copied === 'stdio'}
                onCopy={() => copyConfig('stdio')}
              />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">数据存储与迁移</h3>
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <span className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                    <Folder className="w-4 h-4 text-zinc-500 shrink-0" />
                    当前数据目录
                  </span>
                  <p className="text-xs text-zinc-500 font-mono break-all bg-white/80 p-2 rounded border border-zinc-200/60 mt-1">
                    {dataPath || '读取中...'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  disabled={isMigrating}
                  onClick={handleMigrate}
                  className="flex items-center gap-2 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-800 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isMigrating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      正在迁移数据并重启...
                    </>
                  ) : (
                    <>
                      <Folder className="w-3.5 h-3.5 text-zinc-600" />
                      更改并迁移存储目录
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-zinc-100">
            <button
              onClick={() => onOpenChange(false)}
              className="bg-zinc-900 text-white hover:bg-zinc-800 px-6 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              完成
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ConfigBlock({
  title,
  description,
  value,
  copied,
  onCopy,
}: {
  title: string
  description: string
  value: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 text-sm font-bold text-zinc-900">
            <Server className="h-4 w-4 text-zinc-500" />
            {title}
          </div>
          <p className="text-xs text-zinc-500">{description}</p>
        </div>
        <button
          onClick={onCopy}
          disabled={!value}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 shadow-sm transition-colors hover:bg-zinc-100 disabled:opacity-50"
          aria-label={`复制 ${title}`}
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <pre className="mt-3 max-h-44 overflow-auto rounded-md border border-zinc-200 bg-white p-3 text-xs leading-relaxed text-zinc-700">
        <code>{value || '读取中...'}</code>
      </pre>
    </div>
  )
}
