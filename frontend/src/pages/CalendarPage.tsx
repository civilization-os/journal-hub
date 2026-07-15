import { useEffect, useState, useCallback } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, isSameMonth, parseISO, startOfWeek, endOfWeek
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { calendarApi, CalendarListResponse } from '@/lib/api'
import { CalendarEvent, DayData, Journal, Todo } from '@/types'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toaster'
import { ChevronLeft, ChevronRight, Plus, BookOpen, CheckSquare, X, Calendar as CalendarIcon, Clock } from 'lucide-react'
import { cn, todayStr } from '@/lib/utils'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

interface EventForm {
  title: string
  start_date: string
  end_date: string
  color: string
  description: string
}

export function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [monthData, setMonthData] = useState<CalendarListResponse>({ events: [], journals: [], todos: [] })
  const [selectedDate, setSelectedDate] = useState<string | null>(todayStr())
  const [dayData, setDayData] = useState<DayData | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<EventForm>({
    title: '',
    start_date: todayStr(),
    end_date: '',
    color: 'default',
    description: '',
  })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const loadEvents = useCallback(async () => {
    const start = format(startOfWeek(startOfMonth(currentMonth)), 'yyyy-MM-dd')
    const end = format(endOfWeek(endOfMonth(currentMonth)), 'yyyy-MM-dd')
    try {
      const r = await calendarApi.list({ start, end })
      setMonthData(r.data)
    } catch {
      toast({ title: '加载日程事件失败', variant: 'error' })
    }
  }, [currentMonth, toast])

  const loadDayData = useCallback(() => {
    if (!selectedDate) return
    setDayData(null)
    const controller = new AbortController()
    calendarApi.getDay(selectedDate).then(r => {
      if (!controller.signal.aborted) setDayData(r.data)
    }).catch(() => {
      if (!controller.signal.aborted) {
        setDayData(null)
        toast({ title: '加载日程详情失败', variant: 'error' })
      }
    })
    return () => controller.abort()
  }, [selectedDate, toast])

  useEffect(() => {
    const abort = loadDayData()
    return abort
  }, [loadDayData])

  useEffect(() => { 
    loadEvents() 
    const handler = () => {
      loadEvents()
      loadDayData()
    }
    window.addEventListener('app_data_changed', handler)
    return () => window.removeEventListener('app_data_changed', handler)
  }, [loadEvents, loadDayData])

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth)),
  })

  const getItemsForDay = useCallback((dateStr: string) => {
     const dayEvents = monthData.events.filter(e => e.start_date === dateStr).map(e => ({ id: e.id, type: 'event', title: e.title, color: e.color, completed: false }));
     const dayJournals = monthData.journals.filter(j => j.date === dateStr).map(j => ({ id: j.id, type: 'journal', title: j.title || '无标题日志', color: 'emerald', completed: false }));
     const dayTodos = monthData.todos.filter(t => t.due_date === dateStr).map(t => ({ id: t.id, type: 'todo', title: t.title, color: 'blue', completed: t.completed }));
     return [...dayEvents, ...dayJournals, ...dayTodos];
  }, [monthData])

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr)
  }

  const openNewEvent = (date?: string) => {
    setForm({
      title: '',
      start_date: date || selectedDate || todayStr(),
      end_date: '',
      color: 'default',
      description: '',
    })
    setDialogOpen(true)
  }

  const handleSaveEvent = async () => {
    if (!form.title.trim()) {
      toast({ title: '请输入事件标题', variant: 'error' })
      return
    }
    setSaving(true)
    try {
      await calendarApi.create({ ...form, end_date: form.end_date || null, all_day: true })
      toast({ title: '事件创建成功', variant: 'success' })
      setDialogOpen(false)
      loadEvents()
      if (selectedDate) {
        calendarApi.getDay(selectedDate).then(r => setDayData(r.data))
      }
    } catch {
      toast({ title: '创建事件失败', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEvent = async (id: string) => {
    try {
      await calendarApi.delete(id)
      toast({ title: '事件已删除', variant: 'success' })
      loadEvents()
      if (selectedDate) {
        calendarApi.getDay(selectedDate).then(r => setDayData(r.data))
      }
    } catch {
      toast({ title: '删除事件失败', variant: 'error' })
    }
  }

  const today = todayStr()

  return (
    <PageLayout
      title="日历视图"
      description="管理您的日程、追踪日志与待办事项"
      actions={
        <Button size="sm" onClick={() => openNewEvent()} className="rounded-full shadow-sm hover:shadow-md transition-all">
          <Plus className="h-4 w-4 mr-1" /> 新建日程
        </Button>
      }
    >
      <div className="flex-1 flex flex-col xl:flex-row gap-6 w-full min-h-[600px] h-full pb-6">
        
        {/* Main Calendar Grid Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full bg-card border rounded-3xl shadow-sm overflow-hidden p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {format(currentMonth, 'yyyy年 M月', { locale: zhCN })}
            </h2>
            <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl">
              <Button variant="ghost" size="icon-sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="rounded-lg hover:bg-background shadow-sm">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setCurrentMonth(new Date()); setSelectedDate(today) }}
                className="text-xs font-semibold rounded-lg hover:bg-background shadow-sm px-4"
              >
                回到今天
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="rounded-lg hover:bg-background shadow-sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((d, i) => (
              <div key={d} className={cn(
                "text-center text-xs font-bold uppercase tracking-wider py-2 text-muted-foreground",
                (i === 0 || i === 6) && "text-primary/70"
              )}>
                {d}
              </div>
            ))}
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-7 flex-1 gap-px bg-border/50 border rounded-2xl overflow-hidden">
            {/* Days spanning the full calendar weeks */}
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const dayItems = getItemsForDay(dateStr)
              const isToday = dateStr === today
              const isSelected = dateStr === selectedDate
              const isCurrentMonth = isSameMonth(day, currentMonth)

              return (
                <div
                  key={dateStr}
                  onClick={() => handleDayClick(dateStr)}
                  className={cn(
                    'bg-card min-h-[100px] p-2 cursor-pointer transition-all duration-300 flex flex-col hover:bg-muted/30 group relative',
                    isSelected && 'bg-primary/5 ring-1 ring-inset ring-primary/20 z-10',
                    !isCurrentMonth && 'opacity-40 bg-muted/5'
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                      isToday ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20' : 'text-foreground group-hover:text-primary',
                      isSelected && !isToday && 'bg-primary/10 text-primary'
                    )}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  
                  {/* Event Pills */}
                  <div className="space-y-1.5 flex-1 overflow-hidden">
                    {dayItems.slice(0, 3).map(item => {
                      let pillStyle = '';
                      let icon = null;
                      
                      if (item.type === 'journal') {
                        pillStyle = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50';
                        icon = <BookOpen className="h-3 w-3 shrink-0" />;
                      } else if (item.type === 'todo') {
                         pillStyle = item.completed 
                           ? 'bg-muted/50 text-muted-foreground line-through'
                           : 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200/50';
                         icon = <CheckSquare className="h-3 w-3 shrink-0" />;
                      } else {
                         pillStyle = item.color === 'red' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' :
                                     item.color === 'green' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                                     item.color === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' :
                                     item.color === 'yellow' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }

                      return (
                        <div
                          key={item.type + item.id}
                          className={cn(
                            'text-[10px] font-semibold px-2 py-1 rounded-md truncate transition-all duration-200 group-hover:scale-[1.02] flex items-center gap-1.5',
                            pillStyle
                          )}
                        >
                          {icon}
                          <span className="truncate">{item.title}</span>
                        </div>
                      )
                    })}
                    {dayItems.length > 3 && (
                      <div className="text-[10px] text-muted-foreground pl-1 font-semibold flex items-center gap-1">
                        <Plus className="h-3 w-3" /> {dayItems.length - 3} 更多
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Side Panel: Daily Details */}
        <div className="w-full xl:w-80 shrink-0 flex flex-col gap-4">
          {selectedDate ? (
            <div className="bg-card border rounded-3xl p-6 shadow-sm flex-1 overflow-y-auto scrollbar-thin">
              <div className="flex items-center justify-between border-b border-border/50 pb-5 mb-5">
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    {format(parseISO(selectedDate), 'd日', { locale: zhCN })}
                  </h3>
                  <p className="text-sm font-medium text-muted-foreground">
                    {format(parseISO(selectedDate), 'yyyy年M月 EEEE', { locale: zhCN })}
                  </p>
                </div>
                <Button variant="secondary" size="icon" onClick={() => openNewEvent(selectedDate)} className="rounded-full shadow-sm hover:shadow-md transition-all hover:scale-105">
                  <Plus className="h-5 w-5 text-primary" />
                </Button>
              </div>

              <div className="space-y-8">
                {/* Events Section */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-primary" />
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">日程安排</h4>
                  </div>
                  <div className="space-y-3">
                    {dayData?.events && dayData.events.length > 0 ? (
                      dayData.events.map(ev => {
                        const eventBg = ev.color === 'red' ? 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/30 dark:border-rose-900/50' :
                                        ev.color === 'green' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/50' :
                                        ev.color === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/50' :
                                        ev.color === 'yellow' ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/50' : 'bg-muted/30 text-foreground border-border/50'
                        return (
                        <div
                          key={ev.id}
                          className={cn(
                            'group flex items-center justify-between rounded-2xl border p-4 text-sm font-bold transition-all duration-300 hover:shadow-md hover:-translate-y-0.5',
                            eventBg
                          )}
                        >
                          <span className="truncate">{ev.title}</span>
                          <button
                            onClick={() => handleDeleteEvent(ev.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-muted-foreground hover:text-destructive shrink-0 bg-background/50 backdrop-blur rounded-full p-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )})
                    ) : (
                      <div className="text-sm font-medium text-muted-foreground/60 py-6 text-center border-2 border-dashed rounded-2xl bg-muted/10">
                        今日暂无日程
                      </div>
                    )}
                  </div>
                </section>

                {/* Journals Section */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">随想日志</h4>
                  </div>
                  <div className="space-y-3">
                    {dayData?.journals && dayData.journals.length > 0 ? (
                      dayData.journals.map(j => (
                        <div key={j.id} className="flex items-center gap-3 border border-border/50 bg-card rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group">
                          <div className="bg-primary/10 p-2 rounded-xl text-primary group-hover:scale-110 transition-transform">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{j.title || '无标题日志'}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm font-medium text-muted-foreground/60 py-6 text-center border-2 border-dashed rounded-2xl bg-muted/10">
                        今日没有记录日志
                      </div>
                    )}
                  </div>
                </section>

                {/* Todos Section */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckSquare className="h-4 w-4 text-primary" />
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">待办任务</h4>
                  </div>
                  <div className="space-y-3">
                    {dayData?.todos && dayData.todos.length > 0 ? (
                      dayData.todos.map(t => (
                        <div
                          key={t.id}
                          className={cn(
                            'flex items-center gap-3 border border-border/50 bg-card rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300',
                            t.completed && 'opacity-60 bg-muted/30 shadow-none hover:shadow-none hover:translate-y-0'
                          )}
                        >
                          <CheckSquare className={cn(
                            'h-5 w-5 shrink-0 transition-colors',
                            t.completed ? 'text-primary' : 'text-muted-foreground'
                          )} />
                          <span className={cn('text-sm font-bold truncate', t.completed ? 'line-through text-muted-foreground' : 'text-foreground')}>{t.title}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm font-medium text-muted-foreground/60 py-6 text-center border-2 border-dashed rounded-2xl bg-muted/10">
                        所有的任务都已清空
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <div className="bg-card border rounded-3xl p-6 shadow-sm flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <CalendarIcon className="h-12 w-12 opacity-20 mb-4" />
              <p className="font-medium text-sm">选择一个日期查看详情</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Event Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl border-border/50 shadow-xl overflow-hidden">
          <DialogHeader className="pb-4 border-b border-border/50">
            <DialogTitle className="text-lg font-bold">新建日历事件</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-4">
            <Input
              placeholder="事件标题（如：部门周会） *"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="font-medium bg-muted/30 border-border/50 focus-visible:ring-primary/30 rounded-xl"
            />
            <Input
              placeholder="描述信息（可选）"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="text-sm bg-muted/30 border-border/50 focus-visible:ring-primary/30 rounded-xl"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">开始日期</label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="bg-muted/30 rounded-xl" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">结束日期 (可选)</label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="bg-muted/30 rounded-xl" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 block">色彩标识</label>
              <div className="flex gap-3">
                {Object.entries({ default: '默认', red: '紧急', green: '工作', blue: '生活', yellow: '学习' }).map(([val, label]) => {
                  const colorClass = val === 'red' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' :
                                     val === 'green' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                     val === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                                     val === 'yellow' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                  return (
                    <button
                      key={val}
                      onClick={() => setForm(f => ({ ...f, color: val }))}
                      className={cn(
                        'flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-300 hover:scale-105',
                        colorClass,
                        form.color === val ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-sm' : 'opacity-60 hover:opacity-100'
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-8 pt-4 border-t border-border/50 sm:justify-between">
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSaveEvent} disabled={saving} className="rounded-xl font-bold px-8 shadow-sm hover:shadow-md transition-shadow">
              {saving ? '保存中...' : '添加日程'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
