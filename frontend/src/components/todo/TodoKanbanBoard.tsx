import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { Todo } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Edit2, Eye, Trash2, GripVertical, CheckCircle2, Circle, Clock } from 'lucide-react'

// --- Kanban Item (Sortable) ---

function KanbanItem({
  todo,
  onEdit,
  onDelete,
  onPreview
}: {
  todo: Todo
  onEdit: (t: Todo) => void
  onDelete: (id: string) => void
  onPreview: (t: Todo) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: todo.id, data: { type: 'Todo', todo } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1
  }

  const priorityBadge = (p: string) => {
    if (p === 'high') return <Badge variant="priority-high">高</Badge>
    if (p === 'medium') return <Badge variant="priority-medium">中</Badge>
    return <Badge variant="priority-low">低</Badge>
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing mb-3 flex flex-col gap-2 relative ${todo.status === 'done' ? 'opacity-70' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between">
        <div className="font-medium text-sm leading-tight text-foreground line-clamp-2 pr-6">
          {todo.title}
        </div>
        <div className="shrink-0 flex gap-1 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); onPreview(todo) }}>
            <Eye className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); onEdit(todo) }}>
            <Edit2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-2 mt-1">
        {priorityBadge(todo.priority)}
        {todo.due_date && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 border px-1.5 rounded bg-muted/50">
            {todo.due_date}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
          <span>进度</span>
          <span>{todo.progress ?? 0}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={todo.status === 'done' ? 'h-full rounded-full bg-emerald-500' : 'h-full rounded-full bg-blue-500'}
            style={{ width: `${todo.progress ?? 0}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// --- Kanban Column ---

function KanbanColumn({
  id,
  title,
  icon,
  todos,
  onEdit,
  onDelete,
  onPreview
}: {
  id: string
  title: string
  icon: React.ReactNode
  todos: Todo[]
  onEdit: (t: Todo) => void
  onDelete: (id: string) => void
  onPreview: (t: Todo) => void
}) {
  const { setNodeRef } = useDroppable({ id })

  return (
    <div 
      ref={setNodeRef}
      className="flex flex-col bg-muted/30 rounded-xl w-full max-w-sm h-full flex-shrink-0"
    >
      <div className="p-3 font-semibold text-sm flex items-center justify-between text-muted-foreground border-b border-border/50">
        <div className="flex items-center gap-2">
          {icon}
          {title}
        </div>
        <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground px-2">{todos.length}</Badge>
      </div>
      
      <div className="p-3 flex-1 overflow-y-auto min-h-[10rem]">
        <SortableContext items={todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {todos.map(todo => (
            <KanbanItem
              key={todo.id}
              todo={todo}
              onEdit={onEdit}
              onDelete={onDelete}
              onPreview={onPreview}
            />
          ))}
        </SortableContext>
        {todos.length === 0 && (
          <div className="h-24 border-2 border-dashed rounded-lg border-muted flex items-center justify-center text-muted-foreground text-xs font-medium mt-2 pointer-events-none">
            拖拽到此处
          </div>
        )}
      </div>
    </div>
  )
}

// --- Main Kanban Board ---

export function TodoKanbanBoard({
  todos,
  onStatusChange,
  onEdit,
  onDelete,
  onPreview
}: {
  todos: Todo[]
  onStatusChange: (id: string, newStatus: 'todo' | 'in-progress' | 'done') => void
  onEdit: (t: Todo) => void
  onDelete: (id: string) => void
  onPreview: (t: Todo) => void
}) {
  const [activeTodo, setActiveTodo] = useState<Todo | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const columns = [
    { id: 'todo', title: '待处理', icon: <Circle className="w-4 h-4 text-slate-400" /> },
    { id: 'in-progress', title: '进行中', icon: <Clock className="w-4 h-4 text-amber-500" /> },
    { id: 'done', title: '已完成', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
  ]

  const getTodosByStatus = (status: string) => todos.filter(t => t.status === status)

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveTodo(active.data.current?.todo as Todo)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTodo(null)
    const { active, over } = event
    
    if (!over) return

    const activeId = active.id
    const overId = over.id
    
    let newStatus = overId as string
    
    const overTodo = todos.find(t => t.id === overId)
    if (overTodo) {
      newStatus = overTodo.status
    }

    const activeTodoObj = todos.find(t => t.id === activeId)
    if (activeTodoObj && activeTodoObj.status !== newStatus && ['todo', 'in-progress', 'done'].includes(newStatus)) {
      onStatusChange(activeId as string, newStatus as 'todo' | 'in-progress' | 'done')
    }
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-14rem)] overflow-x-auto pb-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {columns.map(col => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            icon={col.icon}
            todos={getTodosByStatus(col.id)}
            onEdit={onEdit}
            onDelete={onDelete}
            onPreview={onPreview}
          />
        ))}

        <DragOverlay>
          {activeTodo ? (
            <div className="opacity-80 rotate-3 scale-105 transition-transform cursor-grabbing">
              <KanbanItem
                todo={activeTodo}
                onEdit={() => {}}
                onDelete={() => {}}
                onPreview={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
