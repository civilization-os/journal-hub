import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { todoApi } from '@/lib/api'
import { Todo, Priority } from '@/types'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/toaster'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { todayStr, cn } from '@/lib/utils'

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'high', label: '高优先级' },
  { value: 'medium', label: '中优先级' },
  { value: 'low', label: '低优先级' },
]

interface TodoFormData {
  title: string
  description: string
  priority: Priority
  due_date: string
  tags: string[]
}

const emptyForm: TodoFormData = {
  title: '',
  description: '',
  priority: 'medium',
  due_date: '',
  tags: [],
}

export function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TodoFormData>(emptyForm)
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const today = todayStr()

  const loadTodos = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { limit: 200 }
      if (filter === 'pending') params.completed = false
      if (filter === 'completed') params.completed = true
      const r = await todoApi.list(params)
      setTodos(r.data.data)
    } catch {
      toast({ title: '加载待办事项失败', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [filter, toast])

  useEffect(() => { loadTodos() }, [loadTodos])

  useEffect(() => {
    if (searchParams.get('new')) openNew()
  }, [searchParams])

  const openNew = () => {
    setEditingId(null)
    setForm(emptyForm)
    setTagInput('')
    setDialogOpen(true)
  }

  const openEdit = (t: Todo) => {
    setEditingId(t.id)
    setForm({
      title: t.title,
      description: t.description || '',
      priority: t.priority,
      due_date: t.due_date || '',
      tags: t.tags || [],
    })
    setTagInput('')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: '请输入待办事项标题', variant: 'error' })
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, due_date: form.due_date || null }
      if (editingId) {
        await todoApi.update(editingId, payload)
        toast({ title: '待办任务已更新', variant: 'success' })
      } else {
        await todoApi.create(payload)
        toast({ title: '待办任务已创建', variant: 'success' })
      }
      setDialogOpen(false)
      loadTodos()
    } catch {
      toast({ title: '保存待办事项失败', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id: string) => {
    try {
      await todoApi.complete(id)
      loadTodos()
    } catch {
      toast({ title: '更新待办状态失败', variant: 'error' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await todoApi.delete(id)
      toast({ title: '待办任务已删除', variant: 'success' })
      loadTodos()
    } catch {
      toast({ title: '删除待办失败', variant: 'error' })
    }
  }

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !form.tags.includes(tag)) {
      setForm(f => ({ ...f, tags: [...f.tags, tag] }))
    }
    setTagInput('')
  }

  const overdueItems = todos.filter(t => !t.completed && t.due_date && t.due_date < today)
  const todayItems = todos.filter(t => !t.completed && t.due_date === today)
  const upcomingItems = todos.filter(t => !t.completed && (!t.due_date || t.due_date > today))
  const completedItems = todos.filter(t => t.completed)

  const priorityBadge = (p: Priority) => {
    if (p === 'high') return <Badge variant="priority-high">高</Badge>
    if (p === 'medium') return <Badge variant="priority-medium">中</Badge>
    return <Badge variant="priority-low">低</Badge>
  }

  const TodoItem = ({ todo }: { todo: Todo }) => {
    const priorityBorder = todo.priority === 'high' ? 'border-l-2 border-l-rose-500' :
                           todo.priority === 'medium' ? 'border-l-2 border-l-amber-500' :
                           'border-l-2 border-l-zinc-300'
    return (
      <div className={`group flex items-start gap-4 rounded-lg px-4 py-3.5 bg-white border border-zinc-200/60 shadow-xs hover:border-zinc-300 hover:shadow-sm transition-all duration-200 ${priorityBorder} ${
        todo.completed ? 'opacity-55' : ''
      }`}>
        <Checkbox
          checked={todo.completed}
          onCheckedChange={() => handleToggle(todo.id)}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <div
            onClick={() => handleToggle(todo.id)}
            className={`text-xs font-bold cursor-pointer text-zinc-900 ${todo.completed ? 'line-through text-zinc-400 font-medium' : ''}`}
          >
            {todo.title}
          </div>
          {todo.description && (
            <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{todo.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            {priorityBadge(todo.priority)}
            {todo.due_date && (
              <span className={`text-[10px] font-bold ${todo.due_date < today && !todo.completed ? 'text-rose-600' : 'text-zinc-400'}`}>
                {todo.due_date === today ? '今天截止' : todo.due_date < today ? `已逾期 ${todo.due_date}` : `截止 ${todo.due_date}`}
              </span>
            )}
            {todo.tags.map(tag => (
              <span key={tag} className="text-[10px] font-semibold border border-zinc-200 rounded px-1.5 py-0.5 bg-zinc-50 text-zinc-500">{tag}</span>
            ))}
          </div>
        </div>
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(todo)}>
            <Edit2 className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-950" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="hover:text-rose-600 hover:bg-rose-50"
            onClick={() => handleDelete(todo.id)}
          >
            <Trash2 className="h-3.5 w-3.5 text-zinc-400" />
          </Button>
        </div>
      </div>
    )
  }

  const Section = ({ title, items }: { title: string; items: Todo[] }) => {
    if (items.length === 0) return null
    return (
      <section className="space-y-2">
        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1">{title}</h3>
        <div className="space-y-2">
          {items.map(t => <TodoItem key={t.id} todo={t} />)}
        </div>
      </section>
    )
  }

  return (
    <PageLayout
      title="待办事项"
      description={`有 ${todos.filter(t => !t.completed).length} 项任务待处理`}
      actions={
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-zinc-200 overflow-hidden bg-white shadow-xs">
            {(['pending', 'all', 'completed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                  filter === f ? 'bg-zinc-950 text-white border-zinc-950' : 'hover:bg-zinc-50 text-zinc-500'
                }`}
              >
                {f === 'pending' ? '待处理' : f === 'completed' ? '已完成' : '全部'}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-3.5 w-3.5" /> 添加任务
          </Button>
        </div>
      }
    >
      <div className="max-w-2xl space-y-6 w-full">
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="flex gap-4 px-4 py-3.5 border border-zinc-200 rounded-lg bg-white animate-pulse">
                <div className="h-4 w-4 bg-zinc-100 rounded mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-zinc-100 rounded w-2/3" />
                  <div className="h-2.5 bg-zinc-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && todos.length === 0 && (
          <div className="text-center py-14 border border-dashed border-zinc-200 rounded-lg bg-zinc-50/50">
            <p className="text-xs text-zinc-500 mb-4">
              {filter === 'completed' ? '没有已完成的待办事项' : '所有任务已全部搞定！没有待办事项了 🌟'}
            </p>
            {filter !== 'completed' && (
              <Button size="sm" onClick={openNew}>
                <Plus className="h-3.5 w-3.5" /> 创建第一个待办
              </Button>
            )}
          </div>
        )}

        {!loading && filter !== 'completed' && (
          <>
            <Section title="已逾期任务" items={overdueItems} />
            <Section title="今天截止" items={todayItems} />
            <Section title="计划中" items={upcomingItems} />
          </>
        )}

        {!loading && filter === 'completed' && (
          <Section title="已完成任务" items={completedItems} />
        )}

        {!loading && filter === 'all' && (
          <>
            <Section title="进行中" items={todos.filter(t => !t.completed)} />
            <Section title="已完成" items={completedItems} />
          </>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑待办任务' : '添加待办任务'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <Input
              placeholder="任务名称 *"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
            <Textarea
              placeholder="任务详细描述（可选）"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">优先级</label>
                <Select value={form.priority} onValueChange={(v: string) => setForm(f => ({ ...f, priority: v as Priority }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">截止日期</label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">任务标签</label>
              <div className="flex gap-2">
                <Input
                  placeholder="添加任务标签..."
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
                      className="cursor-pointer hover:border-rose-300 hover:text-rose-600 transition-all"
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
              {saving ? '正在保存...' : editingId ? '保存任务' : '创建任务'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
