import { useMemo } from 'react'
import { eachDayOfInterval, format, parseISO, subDays, addDays, differenceInDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Todo } from '@/types'
import { cn, todayStr } from '@/lib/utils'

export function TodoGanttChart({ todos, onPreview }: { todos: Todo[], onPreview: (t: Todo) => void }) {
  const { days, minDate } = useMemo(() => {
    if (todos.length === 0) return { days: [], minDate: new Date() }
    
    let minD = new Date()
    let maxD = new Date()
    let first = true
    
    todos.forEach(t => {
      const start = parseISO(t.created_at.split('T')[0])
      const end = t.due_date ? parseISO(t.due_date) : start
      if (first) { minD = start; maxD = end; first = false }
      else {
        if (start < minD) minD = start
        if (end > maxD) maxD = end
      }
    })
    
    minD = subDays(minD, 5)
    maxD = addDays(maxD, 15)
    
    const today = new Date()
    if (minD > today) minD = subDays(today, 5)
    if (maxD < today) maxD = addDays(today, 15)
    
    return {
      days: eachDayOfInterval({ start: minD, end: maxD }),
      minDate: minD
    }
  }, [todos])

  if (todos.length === 0) return (
    <div className="flex items-center justify-center py-20 text-muted-foreground bg-card border rounded-2xl shadow-sm">暂无任务数据</div>
  )

  const today = todayStr()
  const colWidth = 56 // pixels per day

  return (
    <div className="border rounded-2xl bg-card shadow-sm overflow-hidden flex flex-col min-h-[500px] h-[calc(100vh-280px)]">
      <div className="flex-1 overflow-auto flex relative custom-scrollbar">
        {/* Left Sticky Column */}
        <div className="w-[260px] shrink-0 border-r bg-card sticky left-0 z-30 flex flex-col shadow-[2px_0_15px_rgba(0,0,0,0.08)]">
          <div className="h-14 border-b flex items-center px-4 font-bold text-sm text-muted-foreground bg-muted/80 backdrop-blur-md sticky top-0 z-40">
            任务列表 ({todos.length})
          </div>
          <div className="flex-1 bg-card">
            {todos.map(t => (
              <div 
                key={t.id} 
                className="h-14 border-b flex items-center px-4 hover:bg-secondary/80 cursor-pointer text-sm truncate transition-colors group"
                onClick={() => onPreview(t)}
              >
                <div className={cn("w-2.5 h-2.5 rounded-full mr-3 shrink-0 shadow-sm transition-transform group-hover:scale-125", 
                  t.priority === 'high' ? 'bg-rose-500 shadow-rose-500/50' : 
                  t.priority === 'medium' ? 'bg-amber-500 shadow-amber-500/50' : 
                  'bg-zinc-500 shadow-zinc-500/50'
                )} />
                <span className={cn("truncate font-medium transition-colors", t.completed ? "line-through opacity-40" : "text-foreground group-hover:text-primary")}>{t.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gantt Timeline Right Side */}
        <div className="flex flex-col min-w-max bg-muted/5 relative">
          {/* Header Row */}
          <div className="h-14 border-b flex items-stretch sticky top-0 bg-card/90 backdrop-blur-md z-20">
            {days.map(d => {
              const dStr = format(d, 'yyyy-MM-dd')
              const isT = dStr === today
              return (
                <div key={dStr} className={cn("shrink-0 border-r flex flex-col items-center justify-center text-xs transition-colors", isT && "bg-blue-500/10 text-blue-600 font-bold border-b-2 border-b-blue-500")} style={{ width: colWidth }}>
                  <span className="uppercase tracking-wider">{format(d, 'E', { locale: zhCN })}</span>
                  <span className={isT ? "text-blue-500 text-sm mt-0.5" : "text-muted-foreground mt-0.5"}>{format(d, 'd')}</span>
                </div>
              )
            })}
          </div>
          
          {/* Today vertical line */}
          {days.map((d, i) => {
             const dStr = format(d, 'yyyy-MM-dd')
             if (dStr === today) {
               return <div key={`line-${i}`} className="absolute top-14 bottom-0 border-r-2 border-dashed border-blue-500/40 z-10 pointer-events-none" style={{ left: `${(i * colWidth) + (colWidth / 2)}px` }} />
             }
             return null
          })}

          {/* Task Rows */}
          <div className="flex-1 relative z-10">
            {todos.map((t) => {
              const start = parseISO(t.created_at.split('T')[0])
              const end = t.due_date ? parseISO(t.due_date) : start
              
              const startOffset = differenceInDays(start, minDate)
              const duration = differenceInDays(end, start) + 1
              
              const left = Math.max(0, startOffset * colWidth)
              const width = duration * colWidth
              
              const barWidth = Math.max(width - 12, 24)
              const isShort = barWidth < 100

              const barTrackColor = t.completed ? 'bg-zinc-500/10 border-zinc-500/20' : 
                            t.priority === 'high' ? 'bg-rose-500/10 border-rose-500/30' : 
                            t.priority === 'medium' ? 'bg-amber-500/10 border-amber-500/30' : 
                            'bg-blue-500/10 border-blue-500/30'

              const barProgressColor = t.completed ? 'bg-emerald-500' :
                            t.priority === 'high' ? 'bg-rose-500' : 
                            t.priority === 'medium' ? 'bg-amber-500' : 
                            'bg-blue-500'

              const textColorOutside = t.completed ? 'text-zinc-500 line-through opacity-60' :
                            t.priority === 'high' ? 'text-rose-600 dark:text-rose-400' : 
                            t.priority === 'medium' ? 'text-amber-600 dark:text-amber-400' : 
                            'text-blue-600 dark:text-blue-400'

              return (
                <div key={t.id} className="h-14 border-b flex items-center relative group hover:bg-muted/30 transition-colors">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex pointer-events-none z-0">
                    {days.map((_, i) => (
                      <div key={i} className="shrink-0 border-r border-border/40" style={{ width: colWidth }} />
                    ))}
                  </div>

                  {/* Gantt Bar Wrapper */}
                  <div 
                    className="absolute h-9 flex items-center z-10 cursor-pointer transition-all group-hover:-translate-y-0.5"
                    style={{ left: `${left + 6}px` }}
                    onClick={() => onPreview(t)}
                  >
                    {/* Colored Box */}
                    <div className={cn("h-full rounded-lg border overflow-hidden relative shadow-sm", barTrackColor)} style={{ width: `${barWidth}px` }}>
                      <div
                        className={cn("h-full rounded-md transition-all", barProgressColor)}
                        style={{ width: `${t.progress ?? 0}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground/80">
                        {t.progress ?? 0}%
                      </span>
                    </div>
                    
                    {/* Text */}
                    {isShort ? (
                      <span className={cn("ml-2 text-xs font-bold whitespace-nowrap drop-shadow-sm transition-transform group-hover:translate-x-1", textColorOutside)}>
                        {t.title}
                      </span>
                    ) : (
                      <span className={cn("absolute left-3 text-xs font-semibold whitespace-nowrap truncate pointer-events-none drop-shadow-sm", t.completed ? "text-zinc-500 dark:text-zinc-400 line-through" : "text-white")} style={{ maxWidth: `${barWidth - 24}px` }}>
                        {t.title}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
