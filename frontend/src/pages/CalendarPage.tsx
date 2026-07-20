import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, isSameMonth, parseISO, startOfWeek, endOfWeek
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Solar, HolidayUtil } from 'lunar-javascript'
import { calendarApi, CalendarListResponse } from '@/lib/api'
import { CalendarEvent, DayData, Journal, Todo } from '@/types'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toaster'
import { ChevronLeft, ChevronRight, Plus, BookOpen, CheckSquare, X, Calendar as CalendarIcon, Clock, List, Search, Edit2, Trash2 } from 'lucide-react'
import { cn, todayStr } from '@/lib/utils'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

interface EventForm {
  title: string
  start_date: string
  end_date: string
  color: string
  description: string
}

interface CalendarDayItem {
  id: string
  type: 'event' | 'journal' | 'todo'
  title: string
  color: string
  completed: boolean
  progress?: number
}

export function CalendarPage() {
  const navigate = useNavigate()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [monthData, setMonthData] = useState<CalendarListResponse>({ events: [], journals: [], todos: [] })
  const [selectedDate, setSelectedDate] = useState<string | null>(todayStr())
  const [dayData, setDayData] = useState<DayData | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [searchQuery, setSearchQuery] = useState('')
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([])
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
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

  const loadAllEvents = useCallback(async () => {
    try {
      const r = await calendarApi.list({ limit: 1000 })
      setAllEvents(r.data.events)
    } catch {
      toast({ title: '加载日程列表失败', variant: 'error' })
    }
  }, [toast])

  useEffect(() => {
    if (viewMode === 'list') {
      loadAllEvents()
    }
  }, [viewMode, loadAllEvents])

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
     const dayEvents: CalendarDayItem[] = monthData.events.filter(e => e.start_date === dateStr).map(e => ({ id: e.id, type: 'event', title: e.title, color: e.color, completed: false }));
     const dayJournals: CalendarDayItem[] = monthData.journals.filter(j => j.date === dateStr).map(j => ({ id: j.id, type: 'journal', title: j.title || '无标题日志', color: 'emerald', completed: false }));
     const dayTodos: CalendarDayItem[] = monthData.todos.filter(t => t.due_date === dateStr).map(t => ({ id: t.id, type: 'todo', title: t.title, color: 'blue', completed: t.completed, progress: t.progress ?? 0 }));
     return [...dayEvents, ...dayJournals, ...dayTodos];
  }, [monthData])

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr)
  }

  const openNewEvent = (date?: string) => {
    setEditingEventId(null)
    setForm({
      title: '',
      start_date: date || selectedDate || todayStr(),
      end_date: '',
      color: 'default',
      description: '',
    })
    setDialogOpen(true)
  }

  const openEditEvent = (ev: CalendarEvent) => {
    setEditingEventId(ev.id)
    setForm({
      title: ev.title,
      start_date: ev.start_date,
      end_date: ev.end_date || '',
      color: ev.color || 'default',
      description: ev.description || '',
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
      if (editingEventId) {
        await calendarApi.update(editingEventId, { ...form, end_date: form.end_date || null, all_day: true })
        toast({ title: '事件更新成功', variant: 'success' })
      } else {
        await calendarApi.create({ ...form, end_date: form.end_date || null, all_day: true })
        toast({ title: '事件创建成功', variant: 'success' })
      }
      setDialogOpen(false)
      loadEvents()
      if (viewMode === 'list') loadAllEvents()
      if (selectedDate) {
        calendarApi.getDay(selectedDate).then(r => setDayData(r.data))
      }
    } catch {
      toast({ title: '保存事件失败', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEvent = async (id: string) => {
    try {
      await calendarApi.delete(id)
      toast({ title: '事件已删除', variant: 'success' })
      loadEvents()
      if (viewMode === 'list') loadAllEvents()
      if (selectedDate) {
        calendarApi.getDay(selectedDate).then(r => setDayData(r.data))
      }
    } catch {
      toast({ title: '删除事件失败', variant: 'error' })
    }
  }

  const today = todayStr()
  const monthStats = {
    events: monthData.events.length,
    journals: monthData.journals.length,
    todos: monthData.todos.length,
    overdueTodos: monthData.todos.filter(t => !t.completed && t.due_date && t.due_date < today).length,
  }

  return (
    <PageLayout
      title="日历视图"
      description="管理您的日程、追踪日志与待办事项"
      actions={
        <div className="flex items-center gap-4 flex-wrap justify-end">
          {viewMode === 'list' && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索日程..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px] h-9 bg-background"
              />
            </div>
          )}
          <div className="flex rounded-md border bg-muted p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={cn("px-3 py-1.5 flex items-center gap-1.5 text-sm font-medium transition-all rounded-sm", viewMode === 'calendar' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              <CalendarIcon className="h-4 w-4" /> 日历
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn("px-3 py-1.5 flex items-center gap-1.5 text-sm font-medium transition-all rounded-sm", viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              <List className="h-4 w-4" /> 列表
            </button>
          </div>
          <Button size="sm" onClick={() => openNewEvent()} className="rounded-full shadow-sm hover:shadow-md transition-all">
            <Plus className="h-4 w-4 mr-1" /> 新建日程
          </Button>
        </div>
      }
    >
      <div className="flex-1 flex flex-col xl:flex-row gap-6 w-full min-h-[600px] pb-6 relative">
        
        {viewMode === 'list' ? (
          <div className="w-full">
            <EventListView 
              events={allEvents} 
              searchQuery={searchQuery} 
              onEdit={openEditEvent} 
              onDelete={handleDeleteEvent} 
            />
          </div>
        ) : (
          <>
            {/* Main Calendar Grid Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-card border rounded-3xl shadow-sm overflow-hidden p-6 relative">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_35%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.10),transparent_30%)]" />
          {/* Calendar Header */}
          <div className="flex items-start justify-between mb-6 relative z-10 gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                <CalendarIcon className="h-6 w-6 text-primary" />
                {format(currentMonth, 'yyyy年 M月', { locale: zhCN })}
              </h2>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <MonthStat label="日程" value={monthStats.events} tone="blue" />
                <MonthStat label="日志" value={monthStats.journals} tone="emerald" />
                <MonthStat label="待办" value={monthStats.todos} tone="amber" />
                <MonthStat label="逾期" value={monthStats.overdueTodos} tone="rose" />
              </div>
            </div>
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
          <div className="grid grid-cols-7 mb-2 relative z-10">
            {WEEKDAYS.map((d, i) => (
              <div key={d} className={cn(
                "text-center text-xs font-bold uppercase tracking-wider py-2 text-muted-foreground",
                (i === 0 || i === 6) && "text-primary/70"
              )}>
                {d}
              </div>
            ))}
          </div>

          <CalendarLegend />

          {/* Grid Layout */}
          <div className="grid grid-cols-7 flex-1 gap-px bg-border/60 border rounded-2xl overflow-hidden relative z-10 shadow-inner">
            {/* Days spanning the full calendar weeks */}
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const dayItems = getItemsForDay(dateStr)
              const density = Math.min(dayItems.length, 4)
              const isToday = dateStr === today
              const isSelected = dateStr === selectedDate
              const isCurrentMonth = isSameMonth(day, currentMonth)

              const solar = Solar.fromYmd(day.getFullYear(), day.getMonth() + 1, day.getDate())
              const lunar = solar.getLunar()
              const holiday = HolidayUtil.getHoliday(day.getFullYear(), day.getMonth() + 1, day.getDate())
              
              let lunarText = lunar.getJieQi() || lunar.getFestivals()[0] || solar.getFestivals()[0] || lunar.getDayInChinese()
              if (lunar.getDayInChinese() === '初一') {
                lunarText = lunar.getMonthInChinese() + '月' + (lunarText !== '初一' ? ' ' + lunarText : '')
              }
              const isHolidayTarget = holiday && holiday.getTarget() === dateStr
              if (isHolidayTarget) {
                lunarText = holiday.getName()
              }

              return (
                <div
                  key={dateStr}
                  onClick={() => handleDayClick(dateStr)}
                  className={cn(
                    'bg-card min-h-[112px] p-2.5 cursor-pointer transition-all duration-300 flex flex-col hover:bg-muted/40 group relative overflow-hidden',
                    density === 1 && 'bg-gradient-to-br from-blue-500/[0.035] to-transparent',
                    density === 2 && 'bg-gradient-to-br from-blue-500/[0.06] to-emerald-500/[0.035]',
                    density === 3 && 'bg-gradient-to-br from-blue-500/[0.08] via-emerald-500/[0.045] to-amber-500/[0.04]',
                    density >= 4 && 'bg-gradient-to-br from-blue-500/[0.10] via-emerald-500/[0.06] to-rose-500/[0.05]',
                    isToday && 'bg-blue-500/5 ring-2 ring-inset ring-blue-500/70 z-20 shadow-[0_0_22px_rgba(59,130,246,0.22)]',
                    isSelected && !isToday && 'bg-primary/5 ring-2 ring-inset ring-primary/25 z-10',
                    !isCurrentMonth && 'opacity-45 bg-muted/10'
                  )}
                >
                  {dayItems.length > 0 && (
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-500 via-emerald-500 to-amber-500 opacity-80" />
                  )}
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      openNewEvent(dateStr)
                    }}
                    className="absolute bottom-2 right-2 h-6 w-6 rounded-full border bg-background/90 text-muted-foreground opacity-0 shadow-sm backdrop-blur transition-all hover:text-foreground group-hover:opacity-100"
                    aria-label={`${dateStr} 新建日程`}
                  >
                    <Plus className="mx-auto h-3.5 w-3.5" />
                  </button>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all shrink-0',
                        isToday ? 'bg-blue-500 text-white shadow-md shadow-blue-500/50' : 'text-foreground group-hover:text-primary',
                        isSelected && !isToday && 'bg-primary/10 text-primary'
                      )}>
                        {format(day, 'd')}
                      </span>
                      <span className={cn("text-[11px] font-medium truncate max-w-[60px]", isHolidayTarget || lunar.getJieQi() || lunar.getFestivals().length > 0 ? "text-emerald-500 dark:text-emerald-400 font-bold" : "text-muted-foreground")}>
                        {lunarText}
                      </span>
                      {isToday && <span className="text-[10px] font-bold text-blue-500 px-1.5 py-0.5 bg-blue-500/10 rounded-sm shadow-[0_0_8px_rgba(59,130,246,0.2)] shrink-0">今日</span>}
                    </div>
                    {holiday && (
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-sm shrink-0",
                        holiday.isWork() ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      )}>
                        {holiday.isWork() ? '班' : '休'}
                      </span>
                    )}
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
                          {item.type === 'todo' && !item.completed && (
                            <span className="ml-auto shrink-0 tabular-nums opacity-70">{item.progress}%</span>
                          )}
                        </div>
                      )
                    })}
                    {dayItems.length > 3 && (
                      <div className="text-[10px] text-muted-foreground pl-1 font-semibold flex items-center gap-1">
                        <Plus className="h-3 w-3" /> {dayItems.length - 3} 更多
                      </div>
                    )}
                  </div>
                  {dayItems.length > 0 && (
                    <div className="mt-2 flex items-center gap-1">
                      {dayItems.slice(0, 6).map(item => (
                        <span
                          key={`${item.type}-dot-${item.id}`}
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            item.type === 'event' && "bg-blue-500",
                            item.type === 'journal' && "bg-emerald-500",
                            item.type === 'todo' && (item.completed ? "bg-zinc-400" : "bg-amber-500")
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Side Panel: Daily Details */}
        <div className="w-full xl:w-80 shrink-0 relative">
          <div className="flex flex-col gap-4 xl:absolute xl:inset-0 h-full">
          {selectedDate ? (
            <div className="bg-card border rounded-3xl p-6 shadow-sm flex-1 overflow-y-auto scrollbar-thin relative overflow-hidden">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-primary/8 via-transparent to-transparent" />
              <div className="flex items-center justify-between border-b border-border/50 pb-5 mb-5 relative z-10">
                <div>
                  <h3 className="text-3xl font-black text-foreground leading-none">
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

              <div className="grid grid-cols-3 gap-2 mb-6 relative z-10">
                <DayStat label="日程" value={dayData?.events.length ?? 0} />
                <DayStat label="日志" value={dayData?.journals.length ?? 0} />
                <DayStat label="待办" value={dayData?.todos.length ?? 0} />
              </div>

              <div className="space-y-8 relative z-10">
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
                          <div className="min-w-0">
                            <div className="truncate">{ev.title}</div>
                            {ev.description && (
                              <p className="mt-1 line-clamp-2 text-xs font-medium opacity-70">{ev.description}</p>
                            )}
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 shrink-0 bg-background/50 backdrop-blur rounded-full p-1 border">
                            <button
                              onClick={() => openEditEvent(ev)}
                              className="cursor-pointer text-muted-foreground hover:text-primary p-1"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(ev.id)}
                              className="cursor-pointer text-muted-foreground hover:text-destructive p-1"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
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
                  <div className="space-y-2">
                    {dayData?.journals && dayData.journals.length > 0 ? (
                      dayData.journals.map(j => (
                        <div 
                          key={j.id} 
                          onClick={() => navigate(`/journals/${j.id}`)}
                          className="flex items-center gap-2.5 border border-border/50 bg-card rounded-xl p-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group"
                        >
                          <div className="bg-primary/10 p-1.5 rounded-lg text-primary group-hover:scale-110 transition-transform">
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
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <span className={cn('text-sm font-bold truncate', t.completed ? 'line-through text-muted-foreground' : 'text-foreground')}>{t.title}</span>
                              <span className="text-xs font-bold text-muted-foreground tabular-nums">{t.progress ?? 0}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn("h-full rounded-full", t.completed ? "bg-emerald-500" : "bg-blue-500")}
                                style={{ width: `${t.progress ?? 0}%` }}
                              />
                            </div>
                          </div>
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
        </>
        )}
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

function MonthStat({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'emerald' | 'amber' | 'rose' }) {
  const toneClass = {
    blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
  }[tone]

  return (
    <div className={cn("rounded-xl border px-3 py-2 shadow-sm backdrop-blur-sm", toneClass)}>
      <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</div>
      <div className="text-lg font-black leading-tight tabular-nums">{value}</div>
    </div>
  )
}

function CalendarLegend() {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-background/70 px-4 py-2.5 text-xs font-bold text-muted-foreground shadow-sm backdrop-blur-sm relative z-10">
      <div className="flex flex-wrap items-center gap-3">
        <LegendItem color="bg-blue-500" label="日程" />
        <LegendItem color="bg-emerald-500" label="日志" />
        <LegendItem color="bg-amber-500" label="待办" />
        <LegendItem color="bg-zinc-400" label="已完成" />
      </div>
      <span className="text-[11px] font-medium text-muted-foreground/70">色点表示当日内容类型，背景深度表示事项密度</span>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      {label}
    </span>
  )
}

function DayStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-muted/20 px-3 py-2 text-center">
      <div className="text-lg font-black leading-tight tabular-nums">{value}</div>
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</div>
    </div>
  )
}

function EventListView({ events, searchQuery, onEdit, onDelete }: { events: CalendarEvent[], searchQuery: string, onEdit: (ev: CalendarEvent) => void, onDelete: (id: string) => void }) {
  const today = todayStr()
  const filtered = events.filter(e => !searchQuery || e.title.toLowerCase().includes(searchQuery.toLowerCase()) || (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase())))

  const overdue = filtered.filter(e => e.start_date < today)
  const todayEvents = filtered.filter(e => e.start_date === today)
  const upcoming = filtered.filter(e => e.start_date > today)

  const renderSection = (title: string, list: CalendarEvent[]) => {
    if (list.length === 0) return null
    return (
      <section className="space-y-4">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">{title} ({list.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {list.map(ev => {
            const eventBg = ev.color === 'red' ? 'border-l-rose-500' :
                            ev.color === 'green' ? 'border-l-emerald-500' :
                            ev.color === 'blue' ? 'border-l-blue-500' :
                            ev.color === 'yellow' ? 'border-l-amber-500' : 'border-l-zinc-500'
            return (
              <div key={ev.id} className={`group flex flex-col rounded-xl px-5 py-5 border bg-card shadow-sm hover:shadow-md transition-all duration-300 border-l-4 ${eventBg} relative min-h-[120px]`}>
                <div className="flex-1">
                  <div className="text-base font-bold text-foreground pr-12">{ev.title}</div>
                  {ev.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{ev.description}</p>}
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50">
                  <span className="text-xs font-medium px-2 py-1 bg-secondary text-secondary-foreground rounded-md">
                    {ev.start_date === today ? '今天' : ev.start_date}
                    {ev.end_date ? ` 至 ${ev.end_date}` : ''}
                  </span>
                </div>
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-card/90 backdrop-blur-sm rounded-md p-1 shadow-sm border border-border/50">
                  <Button variant="ghost" size="icon-sm" onClick={() => onEdit(ev)} className="h-7 w-7 text-muted-foreground hover:text-foreground">
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 w-7" onClick={() => onDelete(ev.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-20 border border-dashed rounded-2xl bg-muted/10 shadow-sm mt-8">
        <p className="text-sm font-medium text-muted-foreground">
          没有找到任何日程
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-10 mt-2">
      {renderSection('过往日程', overdue)}
      {renderSection('今日日程', todayEvents)}
      {renderSection('即将到来', upcoming)}
    </div>
  )
}
