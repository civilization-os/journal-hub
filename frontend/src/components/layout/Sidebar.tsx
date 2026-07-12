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
    <aside className="h-screen w-16 border-r border-zinc-850 bg-card flex flex-col items-center justify-between py-6 shrink-0 z-40">
      {/* Top logo block with light ring */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-zinc-200 to-zinc-600 flex items-center justify-center shadow-md shadow-white/5">
          <span className="text-zinc-950 text-xs font-black">J</span>
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-card" />
        </div>

        <nav className="flex flex-col gap-2 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.to

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="relative group flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 cursor-pointer"
              >
                <div
                  className={cn(
                    "absolute inset-0 rounded-xl opacity-0 scale-95 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 bg-zinc-900",
                    isActive && "opacity-100 scale-100 bg-white"
                  )}
                />
                <Icon
                  className={cn(
                    "relative h-4.5 w-4.5 text-zinc-400 group-hover:text-zinc-200 transition-colors z-10",
                    isActive && "text-zinc-950 group-hover:text-zinc-950"
                  )}
                />
                
                {/* Minimalist Tooltip tooltip with border */}
                <div className="absolute left-full ml-3 hidden rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[10px] font-bold text-zinc-200 whitespace-nowrap shadow-lg group-hover:flex pointer-events-none z-50">
                  {item.label}
                </div>
              </NavLink>
            )
          })}
        </nav>
      </div>

      {/* Bottom Profile and Settings */}
      <div className="flex flex-col items-center gap-4">
        <button className="w-10 h-10 rounded-xl border border-zinc-850 hover:border-zinc-700 bg-zinc-900/50 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-all cursor-pointer">
          <Settings className="h-4.5 w-4.5" />
        </button>
        <div className="relative w-8 h-8 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-400 cursor-pointer">
          <User className="h-4 w-4" />
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-zinc-900" />
        </div>
      </div>
    </aside>
  )
}
