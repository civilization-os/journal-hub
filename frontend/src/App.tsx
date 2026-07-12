import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { ToasterProvider } from '@/components/ui/toaster'
import { DashboardPage } from '@/pages/DashboardPage'
import { JournalsPage } from '@/pages/JournalsPage'
import { TodosPage } from '@/pages/TodosPage'
import { CalendarPage } from '@/pages/CalendarPage'

function App() {
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
