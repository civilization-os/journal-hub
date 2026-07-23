import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { TitleBar } from '@/components/layout/TitleBar'
import { Sidebar } from '@/components/layout/Sidebar'
import { ToasterProvider } from '@/components/ui/toaster'
import { DashboardPage } from '@/pages/DashboardPage'
import { JournalsPage } from '@/pages/JournalsPage'
import { TodosPage } from '@/pages/TodosPage'
import { CalendarPage } from '@/pages/CalendarPage'

function App() {
  useEffect(() => {
    let sse: EventSource | null = null
    let disposed = false

    async function connectStream() {
      const streamUrl = import.meta.env.PROD && window.electronAPI?.getApiAuth
        ? await window.electronAPI.getApiAuth().then(auth => `${auth.baseURL}/stream?token=${encodeURIComponent(auth.token)}`)
        : '/api/stream'

      if (disposed) return
      sse = new EventSource(streamUrl)
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
        console.log('[SSE] Connection error/reconnecting...')
      }
    }

    connectStream().catch(console.error)
    return () => {
      disposed = true
      sse?.close()
    }
  }, [])

  return (
    <HashRouter>
      <ToasterProvider>
        <div className="flex h-screen w-full bg-[#f5f5f7] overflow-hidden text-zinc-900 relative">
          <TitleBar />
          
          {/* Sidebar Area */}
          <div className="w-64 shrink-0 flex flex-col z-10 pt-14">
            <Sidebar />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col p-2 pl-0 z-10">
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-auto p-6 pt-10">
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/journals" element={<JournalsPage />} />
                  <Route path="/journals/:id" element={<JournalsPage />} />
                  <Route path="/todos" element={<TodosPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                </Routes>
              </div>
            </div>
          </div>
        </div>
      </ToasterProvider>
    </HashRouter>
  )
}

export default App
