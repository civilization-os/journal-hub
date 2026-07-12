import { useEffect, useState, useCallback } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, isSameDay, isSameMonth, parseISO,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { calendarApi, journalApi } from '@/lib/api'
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
  default: 'bg-gray-100 text-gray-700 border-gray-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  yellow: 'bg-amber-50 text-amber-700 border-amber-200',
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
    const r = await calendarApi.list({ start, end })
    setEvents(r.data.data)
  }, [currentMonth])

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
      toast({ title: '事件已创建', variant: 'success' })
      setDialogOpen(false)
      loadEvents()
      if (selectedDate) {
        calendarApi.getDay(selectedDate).then(r => setDayData(r.data))
      }
    } catch {
      toast({ title: '创建失败', variant: 'error' })
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
      toast({ title: '删除失败', variant: 'error' })
    }
  }

  const today = todayStr()

  return (
    <PageLayout
      title="日历"
      description={format(currentMonth, 'yyyy年 MMMM', { locale: zhCN })}
      actions={
        <Button size="sm" onClick={() => openNewEvent()}>
          <Plus className="h-3.5 w-3.5" /> 新建事件
        </Button>
      }
    >
      <div className="flex gap-6 h-[calc(100vh-8rem)]">
        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
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
            <h2 className="text-sm font-semibold">
              {format(currentMonth, 'yyyy年 M月', { locale: zhCN })}
            </h2>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs text-muted-foreground py-2 font-medium">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 flex-1 gap-px bg-border rounded-lg overflow-hidden border border-border">
            {/* Padding */}
            {Array.from({ length: startPadding }).map((_, i) => (
              <div key={`pad-${i}`} className="bg-background min-h-[80px]" />
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
                    'bg-background min-h-[80px] p-1.5 cursor-pointer transition-colors hover:bg-muted/50',
                    isSelected && 'ring-1 ring-inset ring-foreground',
                    !isCurrentMonth && 'opacity-40'
                  )}
                >
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs mb-1 font-medium',
                    isToday && 'bg-primary text-primary-foreground',
                    !isToday && 'text-foreground'
                  )}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map(ev => (
                      <div
                        key={ev.id}
                        className={cn(
                          'text-[10px] px-1 py-0.5 rounded truncate border',
                          COLOR_MAP[ev.color] || COLOR_MAP.default
                        )}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-muted-foreground pl-1">
                        +{dayEvents.length - 2}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Day Detail Panel */}
        <div className="w-72 shrink-0 overflow-y-auto space-y-4">
          {selectedDate && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {format(parseISO(selectedDate), 'M月d日 EEEE', { locale: zhCN })}
                </h3>
                <Button variant="ghost" size="icon-sm" onClick={() => openNewEvent(selectedDate)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Events */}
              {dayData?.events && dayData.events.length > 0 && (
                <section>
                  <h4 className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">事件</h4>
                  <div className="space-y-1">
                    {dayData.events.map(ev => (
                      <div
                        key={ev.id}
                        className={cn(
                          'flex items-center justify-between rounded-lg border px-3 py-2 text-sm',
                          COLOR_MAP[ev.color] || COLOR_MAP.default
                        )}
                      >
                        <span className="truncate">{ev.title}</span>
                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="ml-2 opacity-60 hover:opacity-100 shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Journals */}
              {dayData?.journals && dayData.journals.length > 0 && (
                <section>
                  <h4 className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">日志</h4>
                  <div className="space-y-1">
                    {dayData.journals.map(j => (
                      <div key={j.id} className="flex items-center gap-2 border border-border rounded-lg px-3 py-2">
                        <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{j.title || '无标题'}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Todos */}
              {dayData?.todos && dayData.todos.length > 0 && (
                <section>
                  <h4 className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">待办</h4>
                  <div className="space-y-1">
                    {dayData.todos.map(t => (
                      <div
                        key={t.id}
                        className={cn(
                          'flex items-center gap-2 border border-border rounded-lg px-3 py-2',
                          t.completed && 'opacity-50'
                        )}
                      >
                        <CheckSquare className={cn(
                          'h-3.5 w-3.5 shrink-0',
                          t.completed ? 'text-green-500' : 'text-muted-foreground'
                        )} />
                        <span className={cn('text-sm truncate', t.completed && 'line-through')}>{t.title}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {(!dayData || (dayData.events.length === 0 && dayData.journals.length === 0 && dayData.todos.length === 0)) && (
                <div className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border rounded-lg">
                  这天没有内容
                </div>
              )}
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
          <div className="space-y-4">
            <Input
              placeholder="事件标题 *"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              autoFocus
            />
            <Input
              placeholder="描述（可选）"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">开始日期</label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">结束日期（可选）</label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">颜色</label>
              <div className="flex gap-2">
                {Object.entries({ default: '默认', red: '红', green: '绿', blue: '蓝', yellow: '黄' }).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setForm(f => ({ ...f, color: val }))}
                    className={cn(
                      'px-2.5 py-1 rounded text-xs border transition-colors',
                      COLOR_MAP[val],
                      form.color === val ? 'ring-2 ring-offset-1 ring-foreground/30' : ''
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSaveEvent} disabled={saving}>
              {saving ? '创建中...' : '创建事件'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
