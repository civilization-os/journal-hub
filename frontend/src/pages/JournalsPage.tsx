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
import { Plus, Search, Trash2, Edit2, Tag, Smile, Copy, FileText, ZoomIn, ZoomOut } from 'lucide-react'

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
    >
      <div className="flex-1 flex flex-col gap-6 w-full text-foreground min-h-[500px]">
        {/* Search */}
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索日志标题或内容..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="pl-9 bg-card border shadow-sm rounded-xl h-11"
          />
        </div>

        {/* Grid List */}
        <div className="flex-1 min-h-[400px]">
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground border border-dashed rounded-2xl bg-muted/10 shadow-sm">
              没有任何日志记录
            </div>
          )}
          {!loading && journals.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {journals.map(j => (
                <button
                  key={j.id}
                  onClick={() => {
                    setSelectedJournal(j)
                    navigate(`/journals/${j.id}`, { replace: true })
                  }}
                  className={`text-left rounded-2xl p-5 transition-all duration-300 border flex flex-col h-[200px] ${
                    selectedJournal?.id === j.id
                      ? 'border-primary bg-accent/40 text-accent-foreground shadow-md ring-1 ring-primary/20'
                      : 'bg-card hover:border-primary/50 hover:bg-secondary/40 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 w-full">
                    <span className="text-base font-bold truncate leading-tight">
                      {j.title || '无标题日志'}
                    </span>
                    {j.mood && (
                      <span className="shrink-0 text-lg leading-none">
                        {MOODS.find(m => m.value === j.mood)?.emoji}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-3 leading-relaxed flex-1 w-full">
                    {stripHtml(j.content) || '暂无内容'}
                  </p>
                  <div className="flex items-center flex-wrap gap-2 mt-4 text-xs text-muted-foreground font-medium w-full">
                    <span className="bg-secondary/60 px-2 py-1 rounded-md text-foreground/80">{j.date}</span>
                    {j.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="border border-border/60 rounded-md px-2 py-1 truncate max-w-[80px]">{tag}</span>
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
        <DialogContent className="max-w-[1400px] w-[96vw] shadow-2xl bg-card/95 backdrop-blur-xl border-border/40 sm:rounded-3xl p-6 sm:p-10">
          {selectedJournal && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b pb-6">
                <div className="space-y-4">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground leading-snug tracking-tight">
                    {selectedJournal.title || '无标题日志'}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
                    <span className="px-3 py-1.5 bg-secondary/80 rounded-lg text-secondary-foreground">{selectedJournal.date}</span>
                    {mood && (
                      <span className="flex items-center gap-1.5 bg-secondary/80 text-secondary-foreground px-3 py-1.5 rounded-lg">
                        <Smile className="h-4 w-4" /> <span>{mood.emoji}</span> {mood.label}
                      </span>
                    )}
                  </div>
                  {selectedJournal.tags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap pt-2">
                      <Tag className="h-4 w-4 text-muted-foreground mr-1" />
                      {selectedJournal.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="px-2.5 py-0.5 bg-background/50 backdrop-blur-sm">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap justify-end items-center">
                  <div className="flex items-center bg-secondary/30 border border-border/50 rounded-lg p-0.5 mr-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => setZoomLevel(z => Math.max(50, z - 10))}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium w-12 text-center select-none">{zoomLevel}%</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => setZoomLevel(z => Math.min(300, z + 10))}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" className="bg-background/50 hover:bg-secondary/80 text-zinc-900 border-border/50" onClick={() => handleCopy(selectedJournal.content, '源码(Markdown)')}>
                    <FileText className="h-4 w-4 mr-1.5" /> 源码
                  </Button>
                  <Button variant="outline" size="sm" className="bg-background/50 hover:bg-secondary/80 text-zinc-900 border-border/50" onClick={() => handleCopy(stripHtml(selectedJournal.content), '纯文本')}>
                    <Copy className="h-4 w-4 mr-1.5" /> 纯文本
                  </Button>
                  <Button variant="outline" size="sm" className="bg-background/50 hover:bg-secondary/80 text-zinc-900 border-border/50" onClick={() => openEdit(selectedJournal)}>
                    <Edit2 className="h-4 w-4 mr-1.5" /> 编辑
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground bg-background/50 border-destructive/20"
                    onClick={() => {
                      handleDelete(selectedJournal.id)
                      navigate('/journals', { replace: true })
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" /> 删除
                  </Button>
                </div>
              </div>

              <div 
                className="pt-2 pb-8 min-h-[30vh] origin-top-left transition-all duration-200"
                style={{ zoom: `${zoomLevel}%` }}
              >
                {selectedJournal.content ? (
                  <MarkdownViewer content={selectedJournal.content} />
                ) : (
                  <p className="text-muted-foreground italic opacity-70">日志内容为空</p>
                )}
              </div>

              <div className="text-xs text-muted-foreground font-medium border-t pt-6 flex flex-col sm:flex-row justify-between gap-2 opacity-70">
                <span>创建于 {formatRelative(selectedJournal.created_at)}</span>
                <span>更新于 {formatRelative(selectedJournal.updated_at)}</span>
              </div>
            </div>
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
