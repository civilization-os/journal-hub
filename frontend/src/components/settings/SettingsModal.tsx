import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Folder, RefreshCw } from 'lucide-react'

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [mcpEnabled, setMcpEnabled] = useState(false)
  const [dataPath, setDataPath] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isMigrating, setIsMigrating] = useState(false)

  useEffect(() => {
    if (open) {
      setIsLoading(true)
      Promise.all([
        window.electronAPI?.getSettings(),
        window.electronAPI?.getDataPath()
      ])
        .then(([settings, pathStr]) => {
          setMcpEnabled(!!settings?.mcpEnabled)
          if (pathStr) setDataPath(pathStr)
        })
        .catch(console.error)
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [open])

  const handleMcpToggle = async (checked: boolean) => {
    setMcpEnabled(checked)
    try {
      await window.electronAPI?.toggleMcp(checked)
    } catch (e) {
      console.error('Failed to toggle MCP:', e)
    }
  }

  const handleMigrate = async () => {
    if (!window.electronAPI?.selectDirectory) return
    const targetPath = await window.electronAPI.selectDirectory()
    if (!targetPath) return

    if (targetPath === dataPath) {
      alert('选择的存储路径与当前路径相同！')
      return
    }

    const confirmMigrate = confirm(
      `确定要将所有数据（数据库、日志、配置）迁移至以下新目录吗？\n\n${targetPath}\n\n迁移完成后应用将自动重启。`
    )
    if (!confirmMigrate) return

    setIsMigrating(true)
    try {
      const result = await window.electronAPI.migrateData(targetPath)
      if (!result.success) {
        alert(`数据迁移失败: ${result.message}`)
        setIsMigrating(false)
      }
    } catch (err: any) {
      alert(`数据迁移出错: ${err.message}`)
      setIsMigrating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden border-zinc-200 shadow-2xl rounded-2xl">
        <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            ⚙️ 系统设置
          </DialogTitle>
        </div>
        <div className="p-6 bg-white space-y-6">
          {/* MCP Server Section */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">MCP 服务器配置</h3>
            <div className="flex flex-row items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 p-4 shadow-sm">
              <div className="space-y-1">
                <label className="text-sm font-bold text-zinc-900 cursor-pointer" onClick={() => handleMcpToggle(!mcpEnabled)}>
                  启用 MCP 协议
                </label>
                <p className="text-xs text-zinc-500">
                  允许 AI Agent (如 Cursor) 接入并控制项目资源
                </p>
              </div>
              <button
                disabled={isLoading || isMigrating}
                onClick={() => handleMcpToggle(!mcpEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                  mcpEnabled ? 'bg-[#10b981]' : 'bg-zinc-200'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    mcpEnabled ? 'translate-x-5' : 'translate-x-1'
                  } shadow-sm`}
                />
              </button>
            </div>
          </div>

          {/* Data Directory & Migration Section */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">数据存储与迁移</h3>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 shadow-sm space-y-3">
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

          {/* Footer Action */}
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
