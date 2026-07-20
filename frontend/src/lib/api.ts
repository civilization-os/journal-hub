import axios from 'axios'
import type { Journal, Todo, CalendarEvent, DayData, Stats } from '@/types'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

interface ApiResponse<T> {
  data: T
  total?: number
}

// Generic request helper
async function get<T>(url: string, params?: Record<string, unknown>) {
  const r = await api.get<ApiResponse<T>>(url, { params })
  return r.data
}

async function post<T>(url: string, data: Record<string, unknown>) {
  const r = await api.post<ApiResponse<T>>(url, data)
  return r.data
}

async function put<T>(url: string, data: Record<string, unknown>) {
  const r = await api.put<ApiResponse<T>>(url, data)
  return r.data
}

async function patch<T>(url: string, data: Record<string, unknown>) {
  const r = await api.patch<ApiResponse<T>>(url, data)
  return r.data
}

async function del<T>(url: string) {
  const r = await api.delete<ApiResponse<T>>(url)
  return r.data
}

// Journal API
export const journalApi = {
  list: (params?: Record<string, unknown>) => get<Journal[]>('/journals', params),
  get: (id: string) => get<Journal>(`/journals/${id}`),
  create: (data: Record<string, unknown>) => post<Journal>('/journals', data),
  update: (id: string, data: Record<string, unknown>) => put<Journal>(`/journals/${id}`, data),
  delete: (id: string) => del<void>(`/journals/${id}`),
  search: (q: string, limit = 20) => get<Journal[]>('/journals/search/full', { q, limit }),
}

// Todo API
export const todoApi = {
  list: (params?: Record<string, unknown>) => get<Todo[]>('/todos', params),
  get: (id: string) => get<Todo>(`/todos/${id}`),
  create: (data: Record<string, unknown>) => post<Todo>('/todos', data),
  update: (id: string, data: Record<string, unknown>) => put<Todo>(`/todos/${id}`, data),
  complete: (id: string) => patch<Todo>(`/todos/${id}/complete`, {}),
  delete: (id: string) => del<void>(`/todos/${id}`),
}

export interface CalendarListResponse {
  events: CalendarEvent[];
  journals: Journal[];
  todos: Todo[];
}

// Calendar API
export const calendarApi = {
  list: (params?: Record<string, unknown>) => get<CalendarListResponse>('/calendar', params),
  getDay: (date: string) => get<DayData>(`/calendar/day/${date}`),
  get: (id: string) => get<CalendarEvent>(`/calendar/${id}`),
  create: (data: Record<string, unknown>) => post<CalendarEvent>('/calendar', data),
  update: (id: string, data: Record<string, unknown>) => put<CalendarEvent>(`/calendar/${id}`, data),
  delete: (id: string) => del<void>(`/calendar/${id}`),
}

// Stats API
export const statsApi = {
  overview: () => get<Stats>('/stats'),
}

// Settings API
export const settingsApi = {
  get: (key: string) => get<string | null>(`/settings/${key}`),
}

export default api
