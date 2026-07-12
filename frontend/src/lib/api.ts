import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Journal API
export const journalApi = {
  list: (params?: Record<string, unknown>) => api.get('/journals', { params }),
  get: (id: string) => api.get(`/journals/${id}`),
  create: (data: Record<string, unknown>) => api.post('/journals', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/journals/${id}`, data),
  delete: (id: string) => api.delete(`/journals/${id}`),
  search: (q: string, limit = 20) => api.get('/journals/search/full', { params: { q, limit } }),
}

// Todo API
export const todoApi = {
  list: (params?: Record<string, unknown>) => api.get('/todos', { params }),
  get: (id: string) => api.get(`/todos/${id}`),
  create: (data: Record<string, unknown>) => api.post('/todos', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/todos/${id}`, data),
  complete: (id: string) => api.patch(`/todos/${id}/complete`),
  delete: (id: string) => api.delete(`/todos/${id}`),
}

// Calendar API
export const calendarApi = {
  list: (params?: Record<string, unknown>) => api.get('/calendar', { params }),
  getDay: (date: string) => api.get(`/calendar/day/${date}`),
  get: (id: string) => api.get(`/calendar/${id}`),
  create: (data: Record<string, unknown>) => api.post('/calendar', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/calendar/${id}`, data),
  delete: (id: string) => api.delete(`/calendar/${id}`),
}

// Stats API
export const statsApi = {
  overview: () => api.get('/stats'),
}

export default api
