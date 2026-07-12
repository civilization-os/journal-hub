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
    <aside className="h-screen w-16 border-r border-border bg-card flex flex-col items-center py-6 shrink-0 z-40 shadow-xs">
      {/* Logo */}
      <div className="mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-xs shadow-primary/10">
          <BookOpen className="h-5 w-5 text-primary-foreground" />
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex flex-col items-center gap-2 flex-1 w-full px-2">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={cn(
                'group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 hover:scale-105',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {/* Tooltip */}
              <span className="absolute left-full ml-3 hidden rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap shadow-md group-hover:flex pointer-events-none z-50">
                {label}
              </span>
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom dot */}
      <div className="w-2 h-2 rounded-full bg-emerald-500 mb-2 shadow-xs shadow-emerald-500/50" title="后端已连接" />
    </aside>
  )
}
