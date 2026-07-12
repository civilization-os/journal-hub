import { NavLink, useLocation } from 'react-router-dom'
import { BookOpen, Calendar, CheckSquare, BarChart2 } from 'lucide-react'
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
    <aside className="h-screen w-14 border-r border-border bg-card flex flex-col items-center py-5 shrink-0 z-40">
      {/* Logo */}
      <div className="mb-8">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <BookOpen className="h-4 w-4 text-primary-foreground" />
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={cn(
                'group relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {/* Tooltip */}
              <span className="absolute left-full ml-3 hidden rounded-md border bg-card px-2 py-1 text-xs font-medium whitespace-nowrap shadow-md group-hover:flex pointer-events-none">
                {label}
              </span>
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom dot */}
      <div className="w-1.5 h-1.5 rounded-full bg-green-400 mb-1" title="后端已连接" />
    </aside>
  )
}
