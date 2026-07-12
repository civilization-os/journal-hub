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
import { Plus, Trash2, Edit2, Filter } from 'lucide-react'
import { todayStr } from '@/lib/utils'

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
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
    } finally {
      setLoading(false)
    }
  }, [filter])

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
      description: t.description,
      priority: t.priority,
      due_date: t.due_date || '',
      tags: t.tags,
    })
    setTagInput('')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: '标题不能为空', variant: 'error' })
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, due_date: form.due_date || null }
      if (editingId) {
        await todoApi.update(editingId, payload)
        toast({ title: '待办已更新', variant: 'success' })
      } else {
        await todoApi.create(payload)
        toast({ title: '待办已创建', variant: 'success' })
      }
      setDialogOpen(false)
      loadTodos()
    } catch {
      toast({ title: '保存失败', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id: string) => {
    try {
      await todoApi.complete(id)
      loadTodos()
    } catch {
      toast({ title: '操作失败', variant: 'error' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await todoApi.delete(id)
      toast({ title: '已删除', variant: 'success' })
      loadTodos()
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

  // Group todos by due date
  const overdueItems = todos.filter(t => !t.completed && t.due_date && t.due_date < today)
  const todayItems = todos.filter(t => !t.completed && t.due_date === today)
  const upcomingItems = todos.filter(t => !t.completed && (!t.due_date || t.due_date > today))
  const completedItems = todos.filter(t => t.completed)

  const priorityBadge = (p: Priority) => {
    if (p === 'high') return <Badge variant="priority-high">高</Badge>
    if (p === 'medium') return <Badge variant="priority-medium">中</Badge>
    return <Badge variant="priority-low">低</Badge>
  }

  const TodoItem = ({ todo }: { todo: Todo }) => (
    <div className={`group flex items-start gap-3 rounded-lg px-3 py-3 hover:bg-muted/50 transition-colors border border-transparent hover:border-border ${
      todo.completed ? 'opacity-60' : ''
    }`}>
      <Checkbox
        id={`todo-${todo.id}`}
        checked={todo.completed}
        onCheckedChange={() => handleToggle(todo.id)}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <label
          htmlFor={`todo-${todo.id}`}
          className={`text-sm font-medium cursor-pointer ${todo.completed ? 'line-through text-muted-foreground' : ''}`}
        >
          {todo.title}
        </label>
        {todo.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{todo.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {priorityBadge(todo.priority)}
          {todo.due_date && (
            <span className={`text-xs ${todo.due_date < today && !todo.completed ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
              {todo.due_date === today ? '今天截止' : todo.due_date < today ? `已逾期 ${todo.due_date}` : todo.due_date}
            </span>
          )}
          {todo.tags.map(tag => (
            <span key={tag} className="text-xs border border-border rounded px-1.5 py-0.5">{tag}</span>
          ))}
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(todo)}>
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="hover:text-destructive"
          onClick={() => handleDelete(todo.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )

  const Section = ({ title, items }: { title: string; items: Todo[] }) => {
    if (items.length === 0) return null
    return (
      <section className="space-y-0.5">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-3 pb-1">{title}</h3>
        {items.map(t => <TodoItem key={t.id} todo={t} />)}
      </section>
    )
  }

  return (
    <PageLayout
      title="待办事项"
      description={`${todos.filter(t => !t.completed).length} 项待处理`}
      actions={
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(['pending', 'all', 'completed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs transition-colors ${
                  filter === f ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
                }`}
              >
                {f === 'pending' ? '待处理' : f === 'completed' ? '已完成' : '全部'}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-3.5 w-3.5" /> 添加
          </Button>
        </div>
      }
    >
      <div className="max-w-2xl space-y-6">
        {loading && (
          <div className="space-y-2">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="flex gap-3 px-3 py-3 animate-pulse">
                <div className="h-4 w-4 bg-muted rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-muted rounded w-2/3" />
                  <div className="h-2.5 bg-muted rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && todos.length === 0 && (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <p className="text-sm text-muted-foreground mb-3">
              {filter === 'completed' ? '还没有已完成的待办' : '没有待处理的事项 🎉'}
            </p>
            {filter !== 'completed' && (
              <Button size="sm" variant="outline" onClick={openNew}>
                <Plus className="h-3.5 w-3.5" /> 添加第一个待办
              </Button>
            )}
          </div>
        )}

        {!loading && filter !== 'completed' && (
          <>
            <Section title="已逾期" items={overdueItems} />
            <Section title="今天" items={todayItems} />
            <Section title="其他" items={upcomingItems} />
          </>
        )}

        {!loading && filter === 'completed' && (
          <Section title="已完成" items={completedItems} />
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
            <DialogTitle>{editingId ? '编辑待办' : '新建待办'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="待办标题 *"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              autoFocus
            />
            <Textarea
              placeholder="描述（可选）"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">优先级</label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as Priority }))}>
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
                <label className="text-xs text-muted-foreground mb-1 block">截止日期</label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">标签</label>
              <div className="flex gap-2">
                <Input
                  placeholder="添加标签"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
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
              {saving ? '保存中...' : editingId ? '保存更改' : '创建待办'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
