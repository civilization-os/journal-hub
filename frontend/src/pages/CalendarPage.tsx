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
      setEvents(r.data.data)
    } catch {
      toast({ title: '加载日程事件失败', variant: 'error' })
    }
  }, [currentMonth, toast])

  useEffect(() => { loadEvents() }, [loadEvents])

  useEffect(() => {
    if (selectedDate) {
      calendarApi.getDay(selectedDate).then(r => setDayData(r.data)).catch(() => setDayData(null))
    }
  }, [selectedDate])

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })

  const startPadding = getDay(startOfMonth(currentMonth))

  const getEventsForDay = (dateStr: string) => events.filter(e => e.start_date === dateStr)

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
      <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-10rem)] w-full text-zinc-200">
        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon-sm" className="border-zinc-800 text-zinc-300" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon-sm" className="border-zinc-800 text-zinc-300" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-800 text-zinc-300"
                onClick={() => { setCurrentMonth(new Date()); setSelectedDate(today) }}
              >
                今天
              </Button>
            </div>
            <h2 className="text-xs font-bold text-zinc-300">
              {format(currentMonth, 'yyyy年 M月', { locale: zhCN })}
            </h2>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 mb-1.5">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-zinc-500 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 flex-1 gap-px bg-zinc-850 border border-zinc-850 rounded-lg overflow-hidden shadow-sm">
            {/* Padding */}
            {Array.from({ length: startPadding }).map((_, i) => (
              <div key={`pad-${i}`} className="bg-zinc-950/20 min-h-[70px]" />
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
                    'bg-card min-h-[70px] p-2 cursor-pointer transition-all duration-150 flex flex-col justify-between hover:bg-zinc-900/30',
                    isSelected && 'ring-1 ring-inset ring-white',
                    !isCurrentMonth && 'opacity-30'
                  )}
                >
                  <div className="flex justify-between items-start">
                    <span className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold',
                      isToday && 'bg-white text-zinc-950',
                      !isToday && 'text-zinc-300'
                    )}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="space-y-1 mt-2">
                    {dayEvents.slice(0, 2).map(ev => {
                      const prefixBorder = ev.color === 'red' ? 'border-l-rose-500 bg-rose-950/20 text-rose-300 border-rose-900/40' :
                                           ev.color === 'green' ? 'border-l-emerald-500 bg-emerald-950/20 text-emerald-300 border-emerald-900/40' :
                                           ev.color === 'blue' ? 'border-l-blue-500 bg-blue-950/20 text-blue-300 border-blue-900/40' :
                                           ev.color === 'yellow' ? 'border-l-amber-500 bg-amber-950/20 text-amber-300 border-amber-900/40' : 'border-l-zinc-500 bg-zinc-900/60 border-zinc-800 text-zinc-300'
                      return (
                        <div
                          key={ev.id}
                          className={cn(
                            'text-[9px] font-bold px-1.5 py-0.5 rounded border truncate',
                            prefixBorder
                          )}
                        >
                          {ev.title}
                        </div>
                      )
                    })}
                    {dayEvents.length > 2 && (
                      <div className="text-[9px] text-zinc-500 pl-1 font-semibold">
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
        <div className="w-full lg:w-72 shrink-0 overflow-y-auto space-y-4 lg:h-full pb-8 lg:pb-0">
          {selectedDate && (
            <>
              <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                <h3 className="text-xs font-bold text-zinc-200">
                  {format(parseISO(selectedDate), 'M月d日 EEEE', { locale: zhCN })}
                </h3>
                <Button variant="outline" size="icon-sm" className="border-zinc-800 text-zinc-300" onClick={() => openNewEvent(selectedDate)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Events */}
              <section className="space-y-2">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">日程事件</h4>
                <div className="space-y-1.5">
                  {dayData?.events && dayData.events.length > 0 ? (
                    dayData.events.map(ev => (
                      <div
                        key={ev.id}
                        className={cn(
                          'flex items-center justify-between rounded-lg border p-3 text-xs font-bold shadow-sm',
                          COLOR_MAP[ev.color] || COLOR_MAP.default
                        )}
                      >
                        <span className="truncate">{ev.title}</span>
                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="ml-2 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-[11px] text-zinc-500 py-3 text-center border border-dashed border-zinc-850 rounded-lg bg-zinc-900/10">
                      无日程安排
                    </div>
                  )}
                </div>
              </section>

              {/* Journals */}
              <section className="space-y-2">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">当日日志</h4>
                <div className="space-y-1.5">
                  {dayData?.journals && dayData.journals.length > 0 ? (
                    dayData.journals.map(j => (
                      <div key={j.id} className="flex items-center gap-2.5 border border-zinc-850 bg-card rounded-lg p-3 shadow-sm">
                        <BookOpen className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                        <span className="text-xs font-bold text-zinc-300 truncate">{j.title || '无标题日志'}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[11px] text-zinc-500 py-3 text-center border border-dashed border-zinc-850 rounded-lg bg-zinc-900/10">
                      无日志记录
                    </div>
                  )}
                </div>
              </section>

              {/* Todos */}
              <section className="space-y-2">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">相关待办</h4>
                <div className="space-y-1.5">
                  {dayData?.todos && dayData.todos.length > 0 ? (
                    dayData.todos.map(t => (
                      <div
                        key={t.id}
                        className={cn(
                          'flex items-center gap-2.5 border border-zinc-850 bg-card rounded-lg p-3 shadow-sm',
                          t.completed && 'opacity-40'
                        )}
                      >
                        <CheckSquare className={cn(
                          'h-3.5 w-3.5 shrink-0',
                          t.completed ? 'text-emerald-500' : 'text-zinc-550'
                        )} />
                        <span className={cn('text-xs font-bold text-zinc-300 truncate', t.completed && 'line-through')}>{t.title}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[11px] text-zinc-500 py-3 text-center border border-dashed border-zinc-850 rounded-lg bg-zinc-900/10">
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
        <DialogContent className="max-w-md bg-card border-zinc-800">
          <DialogHeader>
            <DialogTitle>新建日历事件</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="事件标题（如：部门周会） *"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="bg-zinc-900 border-zinc-800"
            />
            <Input
              placeholder="描述信息（可选）"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="bg-zinc-900 border-zinc-800"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">开始日期</label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="bg-zinc-900 border-zinc-800" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">结束日期（可选）</label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="bg-zinc-900 border-zinc-800" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 block">事件标识色彩</label>
              <div className="flex gap-2">
                {Object.entries({ default: '默认', red: '紧急', green: '工作', blue: '生活', yellow: '学习' }).map(([val, label]) => {
                  const borderClass = val === 'red' ? 'border-l-2 border-l-rose-500' :
                                      val === 'green' ? 'border-l-2 border-l-emerald-500' :
                                      val === 'blue' ? 'border-l-2 border-l-blue-500' :
                                      val === 'yellow' ? 'border-l-2 border-l-amber-500' : 'border-l-2 border-l-zinc-500'
                  return (
                    <button
                      key={val}
                      onClick={() => setForm(f => ({ ...f, color: val }))}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-zinc-800 bg-zinc-900 text-zinc-300 transition-all cursor-pointer',
                        borderClass,
                        form.color === val ? 'ring-1 ring-white ring-offset-0' : ''
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-zinc-800 text-zinc-400" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSaveEvent} disabled={saving}>
              {saving ? '正在保存...' : '添加日程'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
