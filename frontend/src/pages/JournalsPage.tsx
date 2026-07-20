import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useParams, useNavigate } from 'react-router-dom'
import { journalApi } from '@/lib/api'
import { Journal, Mood } from '@/types'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RichEditor } from '@/components/journal/RichEditor'
import { MarkdownViewer } from '@/components/journal/MarkdownViewer'
import { useToast } from '@/components/ui/toaster'
import { formatRelative, todayStr, stripHtml } from '@/lib/utils'
import { Plus, Search, Trash2, Edit2, Tag, Smile, Copy, FileText, ZoomIn, ZoomOut, CalendarDays } from 'lucide-react'

const MOODS: { value: Mood; label: string; emoji: string }[] = [
  { value: 'happy', label: '开心', emoji: '😊' },
  { value: 'excited', label: '兴奋', emoji: '🎉' },
  { value: 'neutral', label: '一般', emoji: '😐' },
  { value: 'sad', label: '难过', emoji: '😢' },
  { value: 'anxious', label: '焦虑', emoji: '😰' },
  { value: 'grateful', label: '感恩', emoji: '🙏' },
]

interface JournalFormData {
  title: string
  content: string
  mood: string
  tags: string[]
  date: string
}

const emptyForm: JournalFormData = {
  title: '',
  content: '',
  mood: '',
  tags: [],
  date: todayStr(),
}

export function JournalsPage() {
  const [journals, setJournals] = useState<Journal[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<JournalFormData>(emptyForm)
  const [tagInput, setTagInput] = useState('')
  const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchParams] = useSearchParams()
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [zoomLevel, setZoomLevel] = useState(100)

  useEffect(() => {
    if (selectedJournal) setZoomLevel(100)
  }, [selectedJournal?.id])

  useEffect(() => {
    if (!selectedJournal) return
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        if (e.deltaY > 0) {
          setZoomLevel(z => Math.max(50, z - 10))
        } else {
          setZoomLevel(z => Math.min(300, z + 10))
        }
      }
    }
    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [selectedJournal])

  useEffect(() => {
    if (id && journals.length > 0) {
      const found = journals.find(j => j.id === id)
      if (found) {
        setSelectedJournal(found)
      }
    } else if (!id) {
      setSelectedJournal(null)
    }
  }, [id, journals])

  const loadJournals = useCallback(async (q?: string) => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { limit: 100 }
      if (q) params.search = q
      const r = await journalApi.list(params)
      setJournals(r.data)
    } catch {
      toast({ title: '加载日志失败', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadJournals(search)
    const handler = () => loadJournals(search)
    window.addEventListener('app_data_changed', handler)
    return () => window.removeEventListener('app_data_changed', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadJournals, search])

  useEffect(() => {
    if (searchParams.get('new')) openNew()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const openNew = () => {
    setEditingId(null)
    setForm(emptyForm)
    setTagInput('')
    setDialogOpen(true)
  }

  const openEdit = (j: Journal) => {
    setEditingId(j.id)
    setForm({ title: j.title, content: j.content, mood: j.mood || '', tags: j.tags, date: j.date })
    setTagInput('')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.title && !form.content) {
      toast({ title: '请输入标题或内容', variant: 'error' })
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, mood: form.mood || null }
      if (editingId) {
        await journalApi.update(editingId, payload)
        toast({ title: '日志更新成功', variant: 'success' })
      } else {
        await journalApi.create(payload)
        toast({ title: '日志保存成功', variant: 'success' })
      }
      setDialogOpen(false)
      loadJournals(search)
      setSelectedJournal(null)
    } catch {
      toast({ title: '保存失败', description: '请稍后再试', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await journalApi.delete(id)
      if (selectedJournal?.id === id) setSelectedJournal(null)
      toast({ title: '日志已删除', variant: 'success' })
      loadJournals(search)
    } catch {
      toast({ title: '删除失败', variant: 'error' })
    }
  }

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: `${type}已复制到剪贴板`, variant: 'success' })
    } catch {
      toast({ title: '复制失败', variant: 'error' })
    }
  }

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !form.tags.includes(tag)) {
      setForm(f => ({ ...f, tags: [...f.tags, tag] }))
    }
    setTagInput('')
  }

  const handleSearch = (val: string) => {
    setSearch(val)
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => loadJournals(val), 300)
  }

  const mood = MOODS.find(m => m.value === selectedJournal?.mood)

  return (
    <PageLayout
      title="日志"
      description={`共收录 ${journals.length} 篇日志`}
      actions={
        <Button size="sm" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" /> 写日志
        </Button>
      }
      wide
      compact
    >
      <div className="flex-1 flex flex-col gap-5 w-full text-foreground min-h-[calc(100vh-180px)]">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,1fr)_auto] gap-4 items-stretch">
          <div className="relative w-full max-w-3xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索标题、正文或标签..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="pl-10 bg-card border shadow-sm rounded-2xl h-12"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <JournalMetric label="总数" value={journals.length} />
            <JournalMetric label="今日" value={journals.filter(j => j.date === todayStr()).length} />
            <JournalMetric label="标签" value={new Set(journals.flatMap(j => j.tags)).size} />
          </div>
        </div>

        {/* Grid List */}
        <div className="flex-1 min-h-[400px]">
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={i} className="rounded-2xl border bg-muted/20 p-5 animate-pulse space-y-4">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && journals.length === 0 && (
            <div className="flex flex-col items-center justify-center h-80 text-sm text-muted-foreground border border-dashed rounded-3xl bg-muted/10 shadow-sm">
              <FileText className="h-10 w-10 mb-3 opacity-40" />
              <div className="font-bold text-foreground">没有任何日志记录</div>
              <div className="mt-1">写下第一篇日志，页面会从这里开始长出来。</div>
              <Button className="mt-5" size="sm" onClick={openNew}>
                <Plus className="h-4 w-4 mr-1" /> 写第一篇
              </Button>
            </div>
          )}
          {!loading && journals.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {journals.map(j => (
                <button
                  key={j.id}
                  onClick={() => {
                    setSelectedJournal(j)
                    navigate(`/journals/${j.id}`, { replace: true })
                  }}
                  className={`group text-left rounded-3xl p-5 transition-all duration-300 border flex flex-col min-h-[220px] relative overflow-hidden ${
                    selectedJournal?.id === j.id
                      ? 'border-primary bg-accent/50 text-accent-foreground shadow-md ring-1 ring-primary/20'
                      : 'bg-card hover:border-primary/40 hover:bg-secondary/30 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-amber-500 opacity-0 group-hover:opacity-80 transition-opacity" />
                  <div className="flex items-start justify-between gap-3 w-full">
                    <span className="text-lg font-black truncate leading-tight">
                      {j.title || '无标题日志'}
                    </span>
                    {j.mood && (
                      <span className="shrink-0 text-xl leading-none">
                        {MOODS.find(m => m.value === j.mood)?.emoji}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-4 leading-relaxed flex-1 w-full">
                    {stripHtml(j.content) || '暂无内容'}
                  </p>
                  <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground font-medium w-full">
                    <span className="inline-flex items-center gap-1 bg-secondary/70 px-2.5 py-1 rounded-full text-foreground/80">
                      <CalendarDays className="h-3 w-3" /> {j.date}
                    </span>
                    {j.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="border border-border/60 rounded-full px-2.5 py-1 truncate max-w-[90px]">#{tag}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Journal Detail Preview Dialog */}
      <Dialog 
        open={!!selectedJournal && !dialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            navigate('/journals', { replace: true })
          }
        }}
      >
        <DialogContent className="max-w-[1400px] w-[96vw] max-h-[92vh] overflow-y-auto shadow-2xl bg-card/95 backdrop-blur-xl border-border/40 sm:rounded-3xl p-0">
          {selectedJournal && (
            <JournalPreview
              journal={selectedJournal}
              mood={mood}
              zoomLevel={zoomLevel}
              setZoomLevel={setZoomLevel}
              onCopy={handleCopy}
              onEdit={openEdit}
              onDelete={(journal) => {
                handleDelete(journal.id)
                navigate('/journals', { replace: true })
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl w-[96vw] sm:rounded-3xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑日志' : '写新日志'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <Input
              placeholder="日志标题..."
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="text-lg font-bold border-0 border-b rounded-none px-0 py-2 focus-visible:ring-0 shadow-none bg-transparent"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">写记日期</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">今日心情</label>
                <Select 
                  value={form.mood} 
                  displayValue={
                    form.mood ? (
                      <span className="flex items-center gap-1.5">
                        {MOODS.find(m => m.value === form.mood)?.emoji} {MOODS.find(m => m.value === form.mood)?.label}
                      </span>
                    ) : undefined
                  }
                  onValueChange={(v: string) => setForm(f => ({ ...f, mood: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择心情..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MOODS.map(m => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.emoji} {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">日志内容</label>
              <RichEditor
                content={form.content}
                onChange={text => setForm(f => ({ ...f, content: text }))}
                minHeight="240px"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">日志标签</label>
              <div className="flex gap-2">
                <Input
                  placeholder="输入标签后按回车，或点击右侧添加按钮..."
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={addTag}>添加</Button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {form.tags.map(tag => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                      onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '正在保存...' : editingId ? '保存日志' : '创建日志'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}

function JournalMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card px-4 py-2.5 shadow-sm min-w-[92px]">
      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-2xl font-black tabular-nums leading-tight">{value}</div>
    </div>
  )
}

function JournalPreview({
  journal,
  mood,
  zoomLevel,
  setZoomLevel,
  onCopy,
  onEdit,
  onDelete,
}: {
  journal: Journal
  mood?: { value: Mood; label: string; emoji: string }
  zoomLevel: number
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>
  onCopy: (text: string, type: string) => void
  onEdit: (journal: Journal) => void
  onDelete: (journal: Journal) => void
}) {
  return (
    <div>
      <div className="p-6 border-b bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.10),transparent_34%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.10),transparent_32%)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-black leading-tight tracking-tight truncate">
              {journal.title || '无标题日志'}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-muted-foreground">
              <span className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground">{journal.date}</span>
              {mood && (
                <span className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground">
                  {mood.emoji} {mood.label}
                </span>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => onEdit(journal)}>
            <Edit2 className="h-4 w-4 mr-1" /> 编辑
          </Button>
        </div>

        {journal.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {journal.tags.map(tag => (
              <Badge key={tag} variant="outline" className="bg-background/60">#{tag}</Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 p-4 border-b bg-muted/15">
        <div className="flex items-center bg-background border rounded-lg p-0.5 mr-auto">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => setZoomLevel(z => Math.max(50, z - 10))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium w-12 text-center select-none">{zoomLevel}%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => setZoomLevel(z => Math.min(300, z + 10))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => onCopy(journal.content, '源码(Markdown)')}>
          <FileText className="h-4 w-4 mr-1" /> 源码
        </Button>
        <Button variant="outline" size="sm" onClick={() => onCopy(stripHtml(journal.content), '纯文本')}>
          <Copy className="h-4 w-4 mr-1" /> 文本
        </Button>
        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => onDelete(journal)}>
          <Trash2 className="h-4 w-4 mr-1" /> 删除
        </Button>
      </div>

      <div className="p-6">
        <div className="origin-top-left transition-all duration-200" style={{ zoom: `${zoomLevel}%` }}>
          {journal.content ? (
            <MarkdownViewer content={journal.content} />
          ) : (
            <p className="text-muted-foreground italic opacity-70">日志内容为空</p>
          )}
        </div>
      </div>

      <div className="px-6 pb-6 text-xs text-muted-foreground font-medium flex flex-col gap-1 opacity-70">
        <span>创建于 {formatRelative(journal.created_at)}</span>
        <span>更新于 {formatRelative(journal.updated_at)}</span>
      </div>
    </div>
  )
}
