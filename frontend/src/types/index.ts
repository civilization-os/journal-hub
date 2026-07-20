export interface Journal {
  id: string
  title: string
  content: string
  mood: string | null
  tags: string[]
  created_at: string
  updated_at: string
  date: string
}

export interface Todo {
  id: string
  title: string
  description: string
  completed: boolean
  status: 'todo' | 'in-progress' | 'done'
  priority: 'high' | 'medium' | 'low'
  progress: number
  due_date: string | null
  tags: string[]
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CalendarEvent {
  id: string
  title: string
  description: string
  start_date: string
  end_date: string | null
  all_day: boolean
  color: string
  linked_journal_id: string | null
  linked_todo_id: string | null
  created_at: string
  updated_at: string
}

export interface DayData {
  date: string
  journals: Journal[]
  todos: Todo[]
  events: CalendarEvent[]
}

export interface Stats {
  journals: { total: number; today: number }
  todos: { total: number; completed: number; pending: number; today: number }
  events: { total: number }
  recent_journals: Partial<Journal>[]
  pending_todos: Todo[]
}

export type Mood = 'happy' | 'excited' | 'neutral' | 'sad' | 'anxious' | 'grateful'
export type Priority = 'high' | 'medium' | 'low'
