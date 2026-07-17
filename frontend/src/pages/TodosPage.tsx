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
import { Plus, Trash2, Edit2, List, CalendarDays, Eye, Search } from 'lucide-react'
import { todayStr, cn } from '@/lib/utils'
import { TodoGanttChart } from '@/components/todo/TodoGanttChart'
import { TodoKanbanBoard } from '@/components/todo/TodoKanbanBoard'
import { RichEditor } from '@/components/journal/RichEditor'
import { MarkdownViewer } from '@/components/journal/MarkdownViewer'
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

function TodoItem({
  todo,
  onToggle,
  onEdit,
  onDelete,
  onPreview,
}: {
  todo: Todo
  onToggle: (id: string) => void
  onEdit: (t: Todo) => void
  onDelete: (id: string) => void
  onPreview: (t: Todo) => void
}) {
  const priorityBadge = (p: Priority) => {
    if (p === 'high') return <Badge variant="priority-high">高</Badge>
    if (p === 'medium') return <Badge variant="priority-medium">中</Badge>
    return <Badge variant="priority-low">低</Badge>
  }

  const today = todayStr()
  const priorityBorder = todo.priority === 'high' ? 'border-l-2 border-l-rose-500' :
                          todo.priority === 'medium' ? 'border-l-2 border-l-amber-500' :
                          'border-l-2 border-l-zinc-600'

  return (
    <div className={`group flex items-stretch gap-3 rounded-xl px-4 py-4 border bg-card shadow-sm hover:shadow-md transition-all duration-300 ${priorityBorder} ${
      todo.completed ? 'opacity-50 grayscale' : ''
    } h-full relative`}>
      <div className="mt-1 shrink-0">
        <Checkbox
          checked={todo.completed}
          onCheckedChange={() => onToggle(todo.id)}
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div
          onClick={() => onToggle(todo.id)}
          className={`text-sm font-medium cursor-pointer transition-colors ${todo.completed ? 'line-through text-muted-foreground' : 'text-foreground hover:text-primary'}`}
        >
          {todo.title}
        </div>
        {todo.description && (
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">{todo.description}</p>
        )}
        <div className="flex items-center gap-2 mt-auto pt-3 flex-wrap">
          {priorityBadge(todo.priority)}
          {todo.due_date && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${todo.due_date < today && !todo.completed ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-secondary-foreground'}`}>
              {todo.due_date === today ? '今天截止' : todo.due_date < today ? `已逾期 ${todo.due_date}` : `截止 ${todo.due_date}`}
            </span>
          )}
          {todo.tags.map(tag => (
            <span key={tag} className="text-xs font-medium border rounded-md px-2 py-0.5 bg-secondary/50 text-secondary-foreground truncate max-w-[80px]">{tag}</span>
          ))}
        </div>
      </div>
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-card/80 backdrop-blur-sm rounded-md p-1 shadow-sm border border-border/50">
        <Button variant="ghost" size="icon-sm" onClick={() => onPreview(todo)} className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted">
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => onEdit(todo)} className="h-7 w-7">
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 w-7"
          onClick={() => onDelete(todo.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

function Section({ title, items, onToggle, onEdit, onDelete, onPreview }: {
  title: string
  items: Todo[]
  onToggle: (id: string) => void
  onEdit: (t: Todo) => void
  onDelete: (id: string) => void
  onPreview: (t: Todo) => void
}) {
  if (items.length === 0) return null
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">{title} ({items.length})</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
        {items.map(t => (
          <TodoItem key={t.id} todo={t} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} onPreview={onPreview} />
        ))}
      </div>
    </section>
  )
}

export function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending')
  const [viewMode, setViewMode] = useState<'list' | 'gantt' | 'kanban'>('list')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [previewTodo, setPreviewTodo] = useState<Todo | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
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
      setTodos(r.data)
    } catch {
      toast({ title: '加载待办事项失败', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [filter, toast])

  useEffect(() => { 
    loadTodos() 
    const handler = () => loadTodos()
    window.addEventListener('app_data_changed', handler)
    return () => window.removeEventListener('app_data_changed', handler)
  }, [loadTodos])

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

  const handleStatusChange = async (id: string, newStatus: 'todo' | 'in-progress' | 'done') => {
    try {
      await todoApi.update(id, { status: newStatus })
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

  const filteredTodos = todos.filter(t => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return t.title.toLowerCase().includes(q) || 
           (t.description && t.description.toLowerCase().includes(q)) || 
           t.tags.some(tag => tag.toLowerCase().includes(q))
  })

  const overdueItems = filteredTodos.filter(t => !t.completed && t.due_date && t.due_date < today)
  const todayItems = filteredTodos.filter(t => !t.completed && t.due_date === today)
  const upcomingItems = filteredTodos.filter(t => !t.completed && (!t.due_date || t.due_date > today))
  const completedItems = filteredTodos.filter(t => t.completed)

  return (
    <PageLayout
      title="待办事项"
      description={`有 ${todos.filter(t => !t.completed).length} 项任务待处理`}
      actions={
        <div className="flex items-center gap-4 flex-wrap justify-end">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索待办事项..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 w-[200px] h-9 bg-background"
            />
          </div>
          <div className="flex rounded-md border bg-muted p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 flex items-center gap-1.5 text-sm font-medium transition-all rounded-sm ${
                viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-4 w-4" /> 列表
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`px-3 py-1.5 flex items-center gap-1.5 text-sm font-medium transition-all rounded-sm ${
                viewMode === 'gantt' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CalendarDays className="h-4 w-4" /> 甘特图
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 flex items-center gap-1.5 text-sm font-medium transition-all rounded-sm ${
                viewMode === 'kanban' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-4 w-4 rotate-90" /> 看板
            </button>
          </div>

          <div className="flex rounded-md border bg-muted p-1">
            {(['pending', 'all', 'completed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 text-sm font-medium transition-all rounded-sm ${
                  filter === f ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
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
      {viewMode === 'gantt' ? (
        <div className="w-full">
          <TodoGanttChart todos={filteredTodos} onPreview={setPreviewTodo} />
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="w-full h-full">
          <TodoKanbanBoard 
            todos={filteredTodos} 
            onStatusChange={handleStatusChange} 
            onEdit={openEdit} 
            onDelete={handleDelete} 
            onPreview={setPreviewTodo} 
          />
        </div>
      ) : (
        <div className="w-full space-y-10">
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="flex gap-4 px-5 py-4 border rounded-xl bg-muted/20 animate-pulse">
                <div className="h-5 w-5 bg-muted rounded mt-0.5" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && todos.length === 0 && (
          <div className="text-center py-20 border border-dashed rounded-2xl bg-muted/10 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground mb-5">
              {filter === 'completed' ? '没有已完成的待办事项' : '所有任务已全部搞定！没有待办事项了 🌟'}
            </p>
            {filter !== 'completed' && (
              <Button size="sm" onClick={openNew}>
                <Plus className="h-4 w-4 mr-1.5" /> 创建第一个待办
              </Button>
            )}
          </div>
        )}

        {!loading && filter !== 'completed' && (
          <>
            <Section title="已逾期任务" items={overdueItems} onToggle={handleToggle} onEdit={openEdit} onDelete={handleDelete} onPreview={setPreviewTodo} />
            <Section title="今天截止" items={todayItems} onToggle={handleToggle} onEdit={openEdit} onDelete={handleDelete} onPreview={setPreviewTodo} />
            <Section title="计划中" items={upcomingItems} onToggle={handleToggle} onEdit={openEdit} onDelete={handleDelete} onPreview={setPreviewTodo} />
          </>
        )}

        {!loading && filter === 'completed' && (
          <Section title="已完成任务" items={completedItems} onToggle={handleToggle} onEdit={openEdit} onDelete={handleDelete} onPreview={setPreviewTodo} />
        )}

        {!loading && filter === 'all' && (
          <>
            <Section title="进行中" items={filteredTodos.filter(t => !t.completed)} onToggle={handleToggle} onEdit={openEdit} onDelete={handleDelete} onPreview={setPreviewTodo} />
            <Section title="已完成" items={completedItems} onToggle={handleToggle} onEdit={openEdit} onDelete={handleDelete} onPreview={setPreviewTodo} />
          </>
        )}
        </div>
      )}

      {/* Dialog for Edit/Create */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑待办任务' : '添加待办任务'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <Input
              placeholder="任务名称 *"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
            <RichEditor
              placeholder="任务详细描述（支持 Markdown，可选）"
              content={form.description || ''}
              onChange={val => setForm(f => ({ ...f, description: val }))}
              minHeight="240px"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">优先级</label>
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
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">截止日期</label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">任务标签</label>
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
              {saving ? '正在保存...' : editingId ? '保存任务' : '创建任务'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTodo} onOpenChange={(open) => !open && setPreviewTodo(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{previewTodo?.title}</DialogTitle>
          </DialogHeader>
          <div className="pt-4 pb-8">
            {previewTodo?.description ? (
              <MarkdownViewer content={previewTodo.description} />
            ) : (
              <div className="text-muted-foreground text-sm italic">无详细描述</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
