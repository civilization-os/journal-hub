import { useEffect, useState, useCallback } from 'react'
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
import { useToast } from '@/components/ui/toaster'
import { formatRelative, stripHtml, todayStr } from '@/lib/utils'
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

  const loadJournals = useCallback(async (q?: string) => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { limit: 100 }
      if (q) params.search = q
      const r = await journalApi.list(params)
      setJournals(r.data.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadJournals()
    if (searchParams.get('new')) openNew()
  }, [])

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
        toast({ title: '日志已更新', variant: 'success' })
      } else {
        await journalApi.create(payload)
        toast({ title: '日志已创建', variant: 'success' })
      }
      setDialogOpen(false)
      loadJournals(search)
    } catch {
      toast({ title: '保存失败', description: '请重试', variant: 'error' })
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
    const timer = setTimeout(() => loadJournals(val), 300)
    return () => clearTimeout(timer)
  }

  const mood = MOODS.find(m => m.value === selectedJournal?.mood)

  return (
    <PageLayout
      title="日志"
      description={`共 ${journals.length} 篇`}
      actions={
        <Button size="sm" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" /> 新建日志
        </Button>
      }
    >
      <div className="flex gap-6 h-[calc(100vh-8rem)]">
        {/* Journal List */}
        <div className="w-72 shrink-0 flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="搜索日志..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {loading && (
              <div className="space-y-2 pt-2">
                {[0,1,2,3].map(i => (
                  <div key={i} className="rounded-lg border border-border p-3 animate-pulse space-y-2">
                    <div className="h-3.5 bg-muted rounded w-3/4" />
                    <div className="h-2.5 bg-muted rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}
            {!loading && journals.length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                没有日志记录
              </div>
            )}
            {!loading && journals.map(j => (
              <button
                key={j.id}
                onClick={() => setSelectedJournal(j)}
                className={`w-full text-left rounded-lg px-3 py-3 transition-colors border ${
                  selectedJournal?.id === j.id
                    ? 'border-foreground/30 bg-muted'
                    : 'border-transparent hover:border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium truncate">{j.title || '无标题'}</span>
                  {j.mood && (
                    <span className="shrink-0 text-base">
                      {MOODS.find(m => m.value === j.mood)?.emoji}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {stripHtml(j.content) || '暂无内容'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">{j.date}</span>
                  {j.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-xs border border-border rounded px-1.5 py-0.5">{tag}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Journal Detail */}
        <div className="flex-1 overflow-y-auto">
          {!selectedJournal ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
              选择一篇日志查看详情
            </div>
          ) : (
            <div className="border border-border rounded-xl p-8 space-y-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold">{selectedJournal.title || '无标题'}</h2>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{selectedJournal.date}</span>
                    {mood && (
                      <span className="flex items-center gap-1">
                        <Smile className="h-3.5 w-3.5" /> {mood.emoji} {mood.label}
                      </span>
                    )}
                  </div>
                  {selectedJournal.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      {selectedJournal.tags.map(tag => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(selectedJournal)}>
                    <Edit2 className="h-3.5 w-3.5" /> 编辑
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(selectedJournal.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div
                className="tiptap-editor prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedJournal.content || '<p class="text-muted-foreground">暂无内容</p>' }}
              />

              <div className="text-xs text-muted-foreground border-t border-border pt-4">
                创建于 {formatRelative(selectedJournal.created_at)} · 更新于 {formatRelative(selectedJournal.updated_at)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑日志' : '新建日志'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="标题（可选）"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="text-base font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-foreground"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">日期</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">心情</label>
                <Select value={form.mood} onValueChange={v => setForm(f => ({ ...f, mood: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择心情" />
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

            <RichEditor
              content={form.content}
              onChange={html => setForm(f => ({ ...f, content: html }))}
              minHeight="220px"
              placeholder="今天发生了什么..."
            />

            {/* Tags */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">标签</label>
              <div className="flex gap-2">
                <Input
                  placeholder="添加标签后回车"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={addTag}>添加</Button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.tags.map(tag => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:border-destructive hover:text-destructive"
                      onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : editingId ? '保存更改' : '创建日志'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
