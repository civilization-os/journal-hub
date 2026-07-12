import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { statsApi } from '@/lib/api'
import { PageLayout } from '@/components/layout/PageLayout'
import { Stats } from '@/types'
import { formatRelative, todayStr } from '@/lib/utils'
import { BookOpen, CheckSquare, Calendar, TrendingUp } from 'lucide-react'

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
    <PageLayout title="Journal Hub" description={formattedToday}>
      <div className="max-w-3xl space-y-8">
        {/* Stats Row */}
        {!loading && stats && (
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              icon={BookOpen}
              label="日志总数"
              value={stats.journals.total}
              sub={`今日 ${stats.journals.today} 篇`}
              to="/journals"
            />
            <StatCard
              icon={CheckSquare}
              label="待办事项"
              value={stats.todos.pending}
              sub={`已完成 ${stats.todos.completed} 项`}
              to="/todos"
            />
            <StatCard
              icon={Calendar}
              label="日历事件"
              value={stats.events.total}
              sub="全部事件"
              to="/calendar"
            />
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="border border-border rounded-lg p-5 animate-pulse">
                <div className="h-3 bg-muted rounded w-16 mb-4" />
                <div className="h-7 bg-muted rounded w-10 mb-2" />
                <div className="h-2.5 bg-muted rounded w-20" />
              </div>
            ))}
          </div>
        )}

        {/* Recent Journals */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">最近日志</h2>
            <Link to="/journals" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              查看全部 →
            </Link>
          </div>
          <div className="space-y-1">
            {stats?.recent_journals.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
                还没有日志，
                <Link to="/journals" className="underline underline-offset-2">开始写第一篇</Link>
              </p>
            )}
            {stats?.recent_journals.map(j => (
              <Link
                key={j.id}
                to={`/journals/${j.id}`}
                className="flex items-center justify-between group rounded-lg px-3 py-2.5 hover:bg-muted transition-colors"
              >
                <span className="text-sm font-medium truncate group-hover:text-foreground">
                  {j.title || '无标题'}
                </span>
                <span className="text-xs text-muted-foreground shrink-0 ml-4">
                  {j.created_at ? formatRelative(j.created_at) : ''}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Pending Todos */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">待处理事项</h2>
            <Link to="/todos" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              查看全部 →
            </Link>
          </div>
          <div className="space-y-1">
            {stats?.pending_todos.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
                没有待处理事项 🎉
              </p>
            )}
            {stats?.pending_todos.map(t => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted transition-colors"
              >
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  t.priority === 'high' ? 'bg-red-400' :
                  t.priority === 'medium' ? 'bg-amber-400' : 'bg-gray-300'
                }`} />
                <span className="text-sm truncate">{t.title}</span>
                {t.due_date && (
                  <span className={`text-xs shrink-0 ml-auto ${
                    t.due_date < today ? 'text-red-500' : 'text-muted-foreground'
                  }`}>
                    {t.due_date}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">快捷操作</h2>
          <div className="flex gap-2 flex-wrap">
            <Link
              to="/journals?new=1"
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              <BookOpen className="h-4 w-4" /> 写日志
            </Link>
            <Link
              to="/todos?new=1"
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              <CheckSquare className="h-4 w-4" /> 添加待办
            </Link>
            <Link
              to="/calendar"
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Calendar className="h-4 w-4" /> 查看日历
            </Link>
          </div>
        </section>
      </div>
    </PageLayout>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  to,
}: {
  icon: typeof BookOpen
  label: string
  value: number
  sub: string
  to: string
}) {
  return (
    <Link to={to} className="group border border-border rounded-lg p-5 hover:border-foreground/30 transition-colors block">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </Link>
  )
}
