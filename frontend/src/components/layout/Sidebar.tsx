import { NavLink, useLocation } from 'react-router-dom'
import { BookOpen, Calendar, CheckSquare, BarChart2, User, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: BarChart2, label: '概览' },
  { to: '/journals', icon: BookOpen, label: '日志' },
  { to: '/calendar', icon: Calendar, label: '日历' },
  { to: '/todos', icon: CheckSquare, label: '待办' },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="h-screen sticky top-0 w-64 border-r bg-muted/30 flex flex-col justify-between py-6 shrink-0">
      <div className="flex flex-col gap-8 w-full px-4">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-bold">J</span>
          </div>
          <span className="font-bold text-lg">Journal Hub</span>
        </div>

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

      {/* Bottom Actions */}
      <div className="flex flex-col gap-1 w-full px-4">
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors w-full">
          <Settings className="h-4 w-4" />
          设置
        </button>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-foreground w-full cursor-pointer hover:bg-secondary/50 mt-2">
          <div className="w-8 h-8 rounded-full bg-secondary border flex items-center justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium leading-none">访客用户</span>
            <span className="text-xs text-muted-foreground mt-1">本地模式</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
