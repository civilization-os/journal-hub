import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { ToasterProvider } from '@/components/ui/toaster'
import { DashboardPage } from '@/pages/DashboardPage'
import { JournalsPage } from '@/pages/JournalsPage'
import { TodosPage } from '@/pages/TodosPage'
import { CalendarPage } from '@/pages/CalendarPage'

function App() {
  useEffect(() => {
    // Connect to SSE stream
    const sse = new EventSource('/api/stream')
    sse.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'refresh') {
          console.log('[SSE] Received refresh signal for:', data.path)
          window.dispatchEvent(new CustomEvent('app_data_changed', { detail: data }))
        }
      } catch (err) {
        console.error('[SSE] Error parsing message:', err)
      }
    }
    sse.onerror = () => {
      // EventSource automatically reconnects, but we can log errors
      console.log('[SSE] Connection error/reconnecting...')
    }
    return () => sse.close()
  }, [])

  return (
    <BrowserRouter>
      <ToasterProvider>
        <div className="flex min-h-screen w-full bg-background">
          <Sidebar />
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/journals" element={<JournalsPage />} />
            <Route path="/journals/:id" element={<JournalsPage />} />
            <Route path="/todos" element={<TodosPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
          </Routes>
        </div>
      </ToasterProvider>
    </BrowserRouter>
  )
}

export default App
