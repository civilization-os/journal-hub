import axios from 'axios'
import type { AxiosError, AxiosRequestConfig } from 'axios'
import type { Journal, Todo, CalendarEvent, DayData, Stats } from '@/types'

const api = axios.create({
  baseURL: import.meta.env.PROD ? 'http://127.0.0.1:3001/api' : '/api',
  headers: { 'Content-Type': 'application/json' },
})

interface ApiResponse<T> {
  data: T
  total?: number
}

const STARTUP_RETRY_ATTEMPTS = 30
const STARTUP_RETRY_DELAY_MS = 250

function delay(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

function isRetryableStartupError(error: unknown) {
  const axiosError = error as AxiosError
  return axios.isAxiosError(error) && !axiosError.response
}

async function requestWithStartupRetry<T>(config: AxiosRequestConfig) {
  let lastError: unknown

  for (let attempt = 1; attempt <= STARTUP_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await api.request<ApiResponse<T>>(config)
    } catch (error) {
      lastError = error
      if (!isRetryableStartupError(error) || attempt === STARTUP_RETRY_ATTEMPTS) {
        throw error
      }
      await delay(STARTUP_RETRY_DELAY_MS)
    }
  }

  throw lastError
}

// Generic request helper
async function get<T>(url: string, params?: Record<string, unknown>) {
  const r = await requestWithStartupRetry<T>({ method: 'GET', url, params })
  return r.data
}

async function post<T>(url: string, data: Record<string, unknown>) {
  const r = await requestWithStartupRetry<T>({ method: 'POST', url, data })
  return r.data
}

async function put<T>(url: string, data: Record<string, unknown>) {
  const r = await requestWithStartupRetry<T>({ method: 'PUT', url, data })
  return r.data
}

async function patch<T>(url: string, data: Record<string, unknown>) {
  const r = await requestWithStartupRetry<T>({ method: 'PATCH', url, data })
  return r.data
}

async function del<T>(url: string) {
  const r = await requestWithStartupRetry<T>({ method: 'DELETE', url })
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
