import { useEffect, useState, useCallback } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, isSameMonth, parseISO,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { calendarApi } from '@/lib/api'
import { CalendarEvent, DayData } from '@/types'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toaster'
import { ChevronLeft, ChevronRight, Plus, BookOpen, CheckSquare, X } from 'lucide-react'
import { cn, todayStr } from '@/lib/utils'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const COLOR_MAP: Record<string, string> = {
  default: 'border-l-2 border-l-zinc-500 bg-zinc-900/60 border-zinc-800 text-zinc-300',
  red: 'border-l-2 border-l-rose-500 bg-rose-950/10 border-rose-900/30 text-rose-300',
  green: 'border-l-2 border-l-emerald-500 bg-emerald-950/10 border-emerald-900/30 text-emerald-300',
  blue: 'border-l-2 border-l-blue-500 bg-blue-950/10 border-blue-900/30 text-blue-300',
  yellow: 'border-l-2 border-l-amber-500 bg-amber-950/10 border-amber-900/30 text-amber-300',
}

interface EventForm {
  title: string
  start_date: string
  end_date: string
  color: string
  description: string
}

export function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
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
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
    try {
      const r = await calendarApi.list({ start, end })
      setEvents(r.data)
    } catch {
      toast({ title: '加载日程事件失败', variant: 'error' })
    }
  }, [currentMonth, toast])

  useEffect(() => { loadEvents() }, [loadEvents])

  useEffect(() => {
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
  }, [selectedDate])

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })

  const startPadding = getDay(startOfMonth(currentMonth))

  const getEventsForDay = useCallback((dateStr: string) => events.filter(e => e.start_date === dateStr), [events])

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
      title="日历"
      description={format(currentMonth, 'yyyy年 MMMM', { locale: zhCN })}
      actions={
        <Button size="sm" onClick={() => openNewEvent()}>
          <Plus className="h-3.5 w-3.5" /> 添加日程
        </Button>
      }
    >
      <div className="flex-1 flex flex-col lg:flex-row gap-8 w-full text-zinc-200 min-h-[500px]">
        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon-sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setCurrentMonth(new Date()); setSelectedDate(today) }}
              >
                今天
              </Button>
            </div>
            <h2 className="text-sm font-bold text-foreground">
              {format(currentMonth, 'yyyy年 M月', { locale: zhCN })}
            </h2>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 mb-1.5">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs font-bold text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 flex-1 gap-px bg-border border rounded-2xl overflow-hidden shadow-sm">
            {/* Padding */}
            {Array.from({ length: startPadding }).map((_, i) => (
              <div key={`pad-${i}`} className="bg-muted/30 min-h-[80px]" />
            ))}

            {/* Days */}
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const dayEvents = getEventsForDay(dateStr)
              const isToday = dateStr === today
              const isSelected = dateStr === selectedDate
              const isCurrentMonth = isSameMonth(day, currentMonth)

              return (
                <div
                  key={dateStr}
                  onClick={() => handleDayClick(dateStr)}
                  className={cn(
                    'bg-card min-h-[80px] p-2.5 cursor-pointer transition-all duration-200 flex flex-col justify-between hover:bg-muted/50',
                    isSelected && 'ring-2 ring-inset ring-primary bg-primary/5',
                    !isCurrentMonth && 'opacity-50 bg-muted/20'
                  )}
                >
                  <div className="flex justify-between items-start">
                    <span className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                      isToday && 'bg-primary text-primary-foreground',
                      !isToday && 'text-foreground'
                    )}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="space-y-1 mt-2">
                    {dayEvents.slice(0, 2).map(ev => {
                      const prefixBorder = ev.color === 'red' ? 'border-l-rose-500 bg-rose-50 text-rose-700 border-rose-200' :
                                           ev.color === 'green' ? 'border-l-emerald-500 bg-emerald-50 text-emerald-700 border-emerald-200' :
                                           ev.color === 'blue' ? 'border-l-blue-500 bg-blue-50 text-blue-700 border-blue-200' :
                                           ev.color === 'yellow' ? 'border-l-amber-500 bg-amber-50 text-amber-700 border-amber-200' : 'border-l-primary bg-secondary text-secondary-foreground border-border'
                      return (
                        <div
                          key={ev.id}
                          className={cn(
                            'text-[10px] font-bold px-1.5 py-0.5 rounded border truncate',
                            prefixBorder
                          )}
                        >
                          {ev.title}
                        </div>
                      )
                    })}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-muted-foreground pl-1 font-medium">
                        +{dayEvents.length - 2}项日程
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Day Detail Panel */}
        <div className="w-full lg:w-72 shrink-0 overflow-y-auto space-y-5 lg:h-full pb-8 lg:pb-0 scrollbar-thin">
          {selectedDate && (
            <>
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="text-base font-bold text-foreground">
                  {format(parseISO(selectedDate), 'M月d日 EEEE', { locale: zhCN })}
                </h3>
                <Button variant="outline" size="icon-sm" onClick={() => openNewEvent(selectedDate)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Events */}
              <section className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">日程事件</h4>
                <div className="space-y-2">
                  {dayData?.events && dayData.events.length > 0 ? (
                    dayData.events.map(ev => {
                      const eventBg = ev.color === 'red' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                      ev.color === 'green' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                      ev.color === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                      ev.color === 'yellow' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-secondary text-secondary-foreground border-border'
                      return (
                      <div
                        key={ev.id}
                        className={cn(
                          'flex items-center justify-between rounded-xl border p-3.5 text-sm font-bold shadow-sm',
                          eventBg
                        )}
                      >
                        <span className="truncate">{ev.title}</span>
                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="ml-2 opacity-50 hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )})
                  ) : (
                    <div className="text-xs text-muted-foreground py-3 text-center border border-dashed rounded-lg bg-muted/20">
                      无日程安排
                    </div>
                  )}
                </div>
              </section>

              {/* Journals */}
              <section className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">当日日志</h4>
                <div className="space-y-2">
                  {dayData?.journals && dayData.journals.length > 0 ? (
                    dayData.journals.map(j => (
                      <div key={j.id} className="flex items-center gap-3 border bg-card rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
                        <BookOpen className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className="text-sm font-bold text-foreground truncate">{j.title || '无标题日志'}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-xl bg-muted/20">
                      无日志记录
                    </div>
                  )}
                </div>
              </section>

              {/* Todos */}
              <section className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">相关待办</h4>
                <div className="space-y-2">
                  {dayData?.todos && dayData.todos.length > 0 ? (
                    dayData.todos.map(t => (
                      <div
                        key={t.id}
                        className={cn(
                          'flex items-center gap-3 border bg-card rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow',
                          t.completed && 'opacity-50 grayscale'
                        )}
                      >
                        <CheckSquare className={cn(
                          'h-4 w-4 shrink-0',
                          t.completed ? 'text-primary' : 'text-muted-foreground'
                        )} />
                        <span className={cn('text-sm font-bold truncate', t.completed ? 'line-through text-muted-foreground' : 'text-foreground')}>{t.title}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-xl bg-muted/20">
                      无相关任务
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {/* Create Event Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新建日历事件</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder="事件标题（如：部门周会） *"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
            <Input
              placeholder="描述信息（可选）"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">开始日期</label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">结束日期（可选）</label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">事件标识色彩</label>
              <div className="flex gap-2">
                {Object.entries({ default: '默认', red: '紧急', green: '工作', blue: '生活', yellow: '学习' }).map(([val, label]) => {
                  const borderClass = val === 'red' ? 'border-l-rose-500 bg-rose-50 text-rose-700' :
                                      val === 'green' ? 'border-l-emerald-500 bg-emerald-50 text-emerald-700' :
                                      val === 'blue' ? 'border-l-blue-500 bg-blue-50 text-blue-700' :
                                      val === 'yellow' ? 'border-l-amber-500 bg-amber-50 text-amber-700' : 'border-l-primary bg-secondary text-secondary-foreground'
                  return (
                    <button
                      key={val}
                      onClick={() => setForm(f => ({ ...f, color: val }))}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-bold border-l-2 transition-all cursor-pointer border-t border-r border-b',
                        borderClass,
                        form.color === val ? 'ring-2 ring-primary ring-offset-1' : 'opacity-70 hover:opacity-100'
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSaveEvent} disabled={saving}>
              {saving ? '正在保存...' : '添加日程'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
