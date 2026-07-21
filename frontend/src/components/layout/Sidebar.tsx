import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { BookOpen, Calendar, CheckSquare, BarChart2, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SettingsModal } from '@/components/settings/SettingsModal'

const navItems = [
  { to: '/', icon: BarChart2, label: '概览' },
  { to: '/journals', icon: BookOpen, label: '日志' },
  { to: '/calendar', icon: Calendar, label: '日历' },
  { to: '/todos', icon: CheckSquare, label: '待办' },
]

export function Sidebar() {
  const location = useLocation()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <aside className="h-full w-full bg-transparent flex flex-col pb-6 shrink-0">
      <div className="flex flex-col gap-8 w-full px-4">
        {/* Navigation */}
        <nav className="flex flex-col gap-1 w-full">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.to

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-secondary text-secondary-foreground" 
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </div>

      <div className="px-4 mt-auto">
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
