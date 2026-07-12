import { useEffect, useState, useCallback } from 'react'
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

  const loadJournals = useCallback(async (q?: string) => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { limit: 100 }
      if (q) params.search = q
      const r = await journalApi.list(params)
      setJournals(r.data.data)
    } catch {
      toast({ title: '加载日志失败', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [toast])

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
    const timer = setTimeout(() => loadJournals(val), 300)
    return () => clearTimeout(timer)
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
      <div className="flex gap-6 h-[calc(100vh-10rem)] w-full">
        {/* Journal List */}
        <div className="w-72 shrink-0 flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              placeholder="搜索日志标题或内容..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loading && (
              <div className="space-y-2 pt-2">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="rounded-lg border border-zinc-200 p-3.5 bg-white animate-pulse space-y-2">
                    <div className="h-3.5 bg-zinc-100 rounded w-3/4" />
                    <div className="h-2.5 bg-zinc-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}
            {!loading && journals.length === 0 && (
              <div className="text-center py-10 text-xs text-zinc-500 border border-dashed border-zinc-200 rounded-lg bg-zinc-50/50">
                没有任何日志记录
              </div>
            )}
            {!loading && journals.map(j => (
              <button
                key={j.id}
                onClick={() => setSelectedJournal(j)}
                className={`w-full text-left rounded-lg p-3.5 transition-all duration-200 border border-zinc-200/60 bg-white ${
                  selectedJournal?.id === j.id
                    ? 'border-l-2 border-l-zinc-950 border-zinc-300 shadow-sm'
                    : 'hover:border-zinc-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-zinc-900 truncate">{j.title || '无标题日志'}</span>
                  {j.mood && (
                    <span className="shrink-0 text-sm">
                      {MOODS.find(m => m.value === j.mood)?.emoji}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1.5 line-clamp-2 leading-relaxed">
                  {j.content || '暂无内容'}
                </p>
                <div className="flex items-center gap-2 mt-3 text-[10px] text-zinc-400 font-semibold">
                  <span>{j.date}</span>
                  {j.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="border border-zinc-200 rounded px-1.5 py-0.5 bg-zinc-50">{tag}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Journal Detail */}
        <div className="flex-1 min-w-0">
          {!selectedJournal ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-500 border border-dashed border-zinc-200 rounded-lg bg-zinc-50/50">
              请从左侧选择一篇日志开始阅读
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-6 h-full overflow-y-auto flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-5">
                  <div className="space-y-2">
                    <h2 className="text-base font-bold text-zinc-900">{selectedJournal.title || '无标题日志'}</h2>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 font-medium">
                      <span>{selectedJournal.date}</span>
                      {mood && (
                        <span className="flex items-center gap-1">
                          <Smile className="h-3.5 w-3.5 text-zinc-400" /> {mood.emoji} {mood.label}
                        </span>
                      )}
                    </div>
                    {selectedJournal.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <Tag className="h-3 w-3 text-zinc-400" />
                        {selectedJournal.tags.map(tag => (
                          <Badge key={tag} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openEdit(selectedJournal)}>
                      <Edit2 className="h-3.5 w-3.5" /> 编辑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-rose-600 border-rose-100 hover:bg-rose-50"
                      onClick={() => handleDelete(selectedJournal.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> 删除
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-zinc-900 leading-relaxed white-space-pre-wrap font-medium">
                  {selectedJournal.content || <p className="text-zinc-400 italic">日志内容为空</p>}
                </div>
              </div>

              <div className="text-[10px] text-zinc-400 font-semibold border-t border-zinc-100 pt-4 flex justify-between">
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

          <div className="space-y-4 pt-2">
            <Input
              placeholder="日志标题..."
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="text-sm font-bold border-0 border-b border-zinc-200 rounded-none px-0 py-2 focus:border-zinc-900 focus:shadow-none"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">写记日期</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">今日心情</label>
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
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">日志内容</label>
              <RichEditor
                content={form.content}
                onChange={text => setForm(f => ({ ...f, content: text }))}
                minHeight="240px"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">日志标签</label>
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
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {form.tags.map(tag => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:border-rose-300 hover:text-rose-600 transition-colors"
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
              {saving ? '正在保存...' : editingId ? '保存日志' : '创建日志'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
