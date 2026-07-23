import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AlertCircle, BarChart2, BookOpen, Calendar, CheckCircle2, CheckSquare, CircleDashed, Settings, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SettingsModal } from '@/components/settings/SettingsModal'

const navItems = [
  { to: '/', icon: BarChart2, label: '概览' },
  { to: '/journals', icon: BookOpen, label: '日志' },
  { to: '/calendar', icon: Calendar, label: '日历' },
  { to: '/todos', icon: CheckSquare, label: '待办' },
]

type ServiceState = 'stopped' | 'starting' | 'running' | 'failed' | 'disabled'

type ServiceStatus = {
  backend: ServiceState
  mcp: ServiceState
  mcpConnections?: number
  errors?: string[]
  logPath?: string
}

const fallbackStatus: ServiceStatus = {
  backend: 'stopped',
  mcp: 'stopped',
}

export function Sidebar() {
  const location = useLocation()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>(fallbackStatus)

  const refreshServiceStatus = async () => {
    if (!window.electronAPI?.getServiceStatus) return
    try {
      const status = await window.electronAPI.getServiceStatus()
      setServiceStatus(status as ServiceStatus)
    } catch (error) {
      console.error('Failed to load service status:', error)
    }
  }

  useEffect(() => {
    refreshServiceStatus()
    const interval = window.setInterval(refreshServiceStatus, 3000)
    window.addEventListener('mcp_status_changed', refreshServiceStatus)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('mcp_status_changed', refreshServiceStatus)
    }
  }, [])

  const indicator = useMemo(() => getMcpIndicator(serviceStatus), [serviceStatus])
  const IndicatorIcon = indicator.icon

  return (
    <aside className="h-full w-full bg-transparent flex flex-col pb-6 shrink-0">
      <div className="flex flex-col gap-8 w-full px-4">
        <nav className="flex flex-col gap-1 w-full">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.to

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </div>

      <div className="px-4 mt-auto space-y-2">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          title={indicator.description}
          className={cn(
            'flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left text-xs font-medium transition-colors',
            indicator.className
          )}
        >
          <IndicatorIcon className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold leading-tight">{indicator.label}</span>
            <span className="block truncate opacity-75">{indicator.detail}</span>
          </span>
        </button>

        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
          设置
        </button>
      </div>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </aside>
  )
}

function getMcpIndicator(status: ServiceStatus) {
  if (status.backend === 'failed' || status.mcp === 'failed') {
    return {
      icon: AlertCircle,
      label: 'MCP 连接失败',
      detail: '点击查看设置',
      description: status.errors?.[0] || '内部服务启动失败',
      className: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
    }
  }

  if (status.mcp === 'running') {
    const count = status.mcpConnections ?? 0
    return {
      icon: CheckCircle2,
      label: count > 0 ? `MCP 已连接 · ${count}` : 'MCP 已开启',
      detail: count > 0 ? `${count} 个连接` : '等待客户端连接',
      description: count > 0 ? `当前有 ${count} 个 MCP transport session` : 'MCP 服务已由 Desktop 托管运行，当前没有客户端连接',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    }
  }

  if (status.backend === 'starting' || status.mcp === 'starting') {
    return {
      icon: CircleDashed,
      label: 'MCP 启动中',
      detail: '正在等待服务',
      description: '内部服务正在启动',
      className: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
    }
  }

  if (status.mcp === 'disabled') {
    return {
      icon: WifiOff,
      label: 'MCP 未启用',
      detail: '点击打开设置',
      description: '可在系统设置里启用 MCP',
      className: 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100',
    }
  }

  return {
    icon: WifiOff,
    label: 'MCP 未连接',
    detail: '等待 Desktop 服务',
    description: 'MCP 服务当前未连接',
    className: 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100',
  }
}
