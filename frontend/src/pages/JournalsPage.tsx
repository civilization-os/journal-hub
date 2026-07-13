import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { journalApi } from '@/lib/api'
import { Journal, Mood } from '@/types'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RichEditor } from '@/components/journal/RichEditor'
import { useToast } from '@/components/ui/toaster'
import { formatRelative, todayStr } from '@/lib/utils'
import { Plus, Search, Trash2, Edit2, Tag, Smile } from 'lucide-react'

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
  const { toast } = useToast()
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

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
    loadJournals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadJournals])

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
      <div className="flex-1 flex flex-col lg:flex-row gap-6 w-full text-zinc-100 min-h-[500px]">
        {/* Journal List */}
        <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索日志标题或内容..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="pl-9 bg-card border shadow-sm"
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {loading && (
              <div className="space-y-3 pt-2">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="rounded-xl border bg-muted/20 p-4 animate-pulse space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}
            {!loading && journals.length === 0 && (
              <div className="text-center py-10 text-sm text-muted-foreground border border-dashed rounded-xl bg-muted/10 shadow-sm">
                没有任何日志记录
              </div>
            )}
            {!loading && journals.map(j => (
              <button
                key={j.id}
                onClick={() => setSelectedJournal(j)}
                className={`w-full text-left rounded-xl p-4 transition-all duration-200 border ${
                  selectedJournal?.id === j.id
                    ? 'border-primary bg-accent text-accent-foreground shadow-sm'
                    : 'bg-card hover:border-primary/50 hover:bg-secondary/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-bold truncate">
                    {j.title || '无标题日志'}
                  </span>
                  {j.mood && (
                    <span className="shrink-0 text-sm">
                      {MOODS.find(m => m.value === j.mood)?.emoji}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                  {j.content || '暂无内容'}
                </p>
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground font-medium">
                  <span>{j.date}</span>
                  {j.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="border rounded-md px-2 py-0.5 bg-secondary/50">{tag}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Journal Detail */}
        <div className="flex-1 flex flex-col min-w-0 min-h-[500px]">
          {!selectedJournal ? (
            <div className="flex-1 flex items-center justify-center text-sm font-medium text-muted-foreground border border-dashed rounded-2xl bg-muted/10 shadow-sm">
              请从左侧选择一篇日志开始阅读
            </div>
          ) : (
            <div className="border bg-card rounded-2xl p-8 space-y-6 flex-1 overflow-y-auto flex flex-col justify-between shadow-sm">
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b pb-6">
                  <div className="space-y-3">
                    <h2 className="text-xl sm:text-2xl font-black text-foreground leading-snug">{selectedJournal.title || '无标题日志'}</h2>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
                      <span className="px-2 py-1 bg-secondary rounded-md text-secondary-foreground">{selectedJournal.date}</span>
                      {mood && (
                        <span className="flex items-center gap-1.5 bg-secondary text-secondary-foreground px-2 py-1 rounded-md">
                          <Smile className="h-4 w-4" /> <span>{mood.emoji}</span> {mood.label}
                        </span>
                      )}
                    </div>
                    {selectedJournal.tags.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap pt-2">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                        {selectedJournal.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="px-2">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openEdit(selectedJournal)}>
                      <Edit2 className="h-4 w-4 mr-1.5" /> 编辑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDelete(selectedJournal.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" /> 删除
                    </Button>
                  </div>
                </div>

                <div className="text-sm text-foreground leading-loose white-space-pre-wrap font-medium">
                  {selectedJournal.content || <p className="text-muted-foreground italic opacity-70">日志内容为空</p>}
                </div>
              </div>

              <div className="text-xs text-muted-foreground font-medium border-t pt-5 flex flex-col sm:flex-row justify-between gap-2">
                <span>创建于 {formatRelative(selectedJournal.created_at)}</span>
                <span>更新于 {formatRelative(selectedJournal.updated_at)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <Select value={form.mood} onValueChange={(v: string) => setForm(f => ({ ...f, mood: v }))}>
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
