import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { statsApi } from '@/lib/api'
import { PageLayout } from '@/components/layout/PageLayout'
import { Stats } from '@/types'
import { formatRelative, todayStr } from '@/lib/utils'
import { BookOpen, CheckSquare, Calendar, Plus, ArrowRight } from 'lucide-react'

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    statsApi.overview().then(r => {
      setStats(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const today = todayStr()
  const formattedToday = new Date(today).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })

  return (
    <PageLayout title="概览" description={formattedToday}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        {/* Left Column - Stats and Journals */}
        <div className="lg:col-span-8 space-y-6">
          {/* Stats Row */}
          {!loading && stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                icon={BookOpen}
                label="日志总数"
                value={stats.journals.total}
                sub={`今日已写 ${stats.journals.today} 篇`}
                to="/journals"
                color="border-t-emerald-500"
              />
              <StatCard
                icon={CheckSquare}
                label="待处理待办"
                value={stats.todos.pending}
                sub={`已完成 ${stats.todos.completed} 项`}
                to="/todos"
                color="border-t-blue-500"
              />
              <StatCard
                icon={Calendar}
                label="日历事件"
                value={stats.events.total}
                sub="全部已记录日程"
                to="/calendar"
                color="border-t-purple-500"
              />
            </div>
          )}

          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map(i => (
                <div key={i} className="border border-zinc-200 bg-white rounded-lg p-6 shadow-xs animate-pulse">
                  <div className="h-4 bg-zinc-100 rounded w-16 mb-4" />
                  <div className="h-8 bg-zinc-100 rounded w-12 mb-2" />
                  <div className="h-3 bg-zinc-100 rounded w-24" />
                </div>
              ))}
            </div>
          )}

          {/* Recent Journals */}
          <section className="bg-white border border-zinc-200 rounded-lg p-6 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-bold text-zinc-900">最近日志</h2>
                <p className="text-xs text-zinc-500 mt-1">记录生活与日常灵感的最新篇章</p>
              </div>
              <Link to="/journals" className="group flex items-center gap-1 text-xs font-bold text-zinc-950 hover:underline">
                查看全部 <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="space-y-2">
              {stats?.recent_journals.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-zinc-200 rounded-lg bg-zinc-50/50">
                  <div className="w-10 h-10 rounded-full border border-zinc-200 bg-white flex items-center justify-center text-zinc-500 mb-3">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <h3 className="text-xs font-bold text-zinc-900">还没有写过日志</h3>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                    今天有什么值得记录的？现在开始写下第一篇日志吧。
                  </p>
                  <Link
                    to="/journals?new=1"
                    className="inline-flex items-center gap-1.5 mt-4 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-zinc-900 active:scale-[0.98] transition-all duration-200"
                  >
                    <Plus className="h-3.5 w-3.5" /> 开始写第一篇
                  </Link>
                </div>
              )}
              {stats?.recent_journals.map(j => (
                <Link
                  key={j.id}
                  to={`/journals/${j.id}`}
                  className="flex items-center justify-between group rounded-lg px-4 py-3 border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50/30 transition-all duration-200"
                >
                  <span className="text-xs font-semibold text-zinc-900 group-hover:text-zinc-950 truncate">
                    {j.title || '无标题日志'}
                  </span>
                  <span className="text-xs text-zinc-400 shrink-0 ml-4 font-medium">
                    {j.created_at ? formatRelative(j.created_at) : ''}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column - Actions & Todos */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Actions */}
          <section className="bg-white border border-zinc-200 rounded-lg p-6 shadow-xs">
            <h2 className="text-sm font-bold text-zinc-900 mb-4">快捷操作</h2>
            <div className="grid grid-cols-1 gap-2.5">
              <QuickActionButton
                to="/journals?new=1"
                icon={BookOpen}
                label="记录今日日志"
                desc="随笔、情绪、日常记录"
                color="hover:border-l-emerald-500"
              />
              <QuickActionButton
                to="/todos?new=1"
                icon={CheckSquare}
                label="新增待办事项"
                desc="规划接下来的任务"
                color="hover:border-l-blue-500"
              />
              <QuickActionButton
                to="/calendar"
                icon={Calendar}
                label="查看我的日程"
                desc="日历与事件一览"
                color="hover:border-l-purple-500"
              />
            </div>
          </section>

          {/* Pending Todos */}
          <section className="bg-white border border-zinc-200 rounded-lg p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-zinc-900">待处理事项</h2>
                <p className="text-xs text-zinc-500 mt-1">今天需要完成的工作</p>
              </div>
              <Link to="/todos" className="group flex items-center gap-1 text-xs font-bold text-zinc-950 hover:underline">
                全部 <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="space-y-2">
              {stats?.pending_todos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center border border-dashed border-zinc-200 rounded-lg bg-zinc-50/50">
                  <div className="w-8 h-8 rounded-full border border-zinc-200 bg-white flex items-center justify-center text-zinc-500 mb-2">
                    <CheckSquare className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-xs font-bold text-zinc-900">暂无待办事项</h3>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    今天非常轻松，没有任何待办。
                  </p>
                  <Link
                    to="/todos?new=1"
                    className="inline-flex items-center gap-1 mt-3 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-bold text-zinc-950 hover:bg-zinc-50 transition-all duration-200"
                  >
                    添加待办
                  </Link>
                </div>
              )}
              {stats?.pending_todos.map(t => (
                <div
                  key={t.id}
                  className={`flex items-center gap-3 rounded-lg border border-zinc-150 p-3 hover:border-zinc-200 hover:bg-zinc-50/20 transition-all duration-200 ${
                    t.priority === 'high' ? 'border-l-2 border-l-rose-500' :
                    t.priority === 'medium' ? 'border-l-2 border-l-amber-500' : 'border-l-2 border-l-zinc-300'
                  }`}
                >
                  <span className="text-xs text-zinc-900 font-semibold truncate">{t.title}</span>
                  {t.due_date && (
                    <span className={`text-[10px] shrink-0 ml-auto font-bold px-2 py-0.5 rounded ${
                      t.due_date < today ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                    }`}>
                      {t.due_date}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </PageLayout>
  )
}

interface StatCardProps {
  icon: typeof BookOpen
  label: string
  value: number
  sub: string
  to: string
  color: string
}

function StatCard({ icon: Icon, label, value, sub, to, color }: StatCardProps) {
  return (
    <Link
      to={to}
      className={`group bg-white border border-zinc-200 border-t-2 ${color} rounded-lg p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm block`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{label}</span>
        <Icon className="h-4.5 w-4.5 text-zinc-400 group-hover:text-zinc-900 transition-colors" />
      </div>
      <div className="text-2xl font-bold text-zinc-950 tracking-tight tabular-nums">{value}</div>
      <div className="text-xs text-zinc-500 mt-1 font-medium">{sub}</div>
    </Link>
  )
}

interface QuickActionButtonProps {
  to: string
  icon: typeof BookOpen
  label: string
  desc: string
  color: string
}

function QuickActionButton({ to, icon: Icon, label, desc, color }: QuickActionButtonProps) {
  return (
    <Link
      to={to}
      className={`group flex items-center gap-4 rounded-lg border border-zinc-200 bg-white p-3 hover:bg-zinc-50/50 hover:shadow-xs transition-all duration-150 text-left border-l-2 ${color}`}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-zinc-100 bg-zinc-50 text-zinc-600 shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-bold text-zinc-900 transition-colors group-hover:text-zinc-950">{label}</div>
        <div className="text-[11px] text-zinc-500 mt-0.5 truncate">{desc}</div>
      </div>
    </Link>
  )
}
