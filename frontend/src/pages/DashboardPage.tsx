import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { statsApi } from '@/lib/api'
import { PageLayout } from '@/components/layout/PageLayout'
import { Stats } from '@/types'
import { formatRelative, todayStr } from '@/lib/utils'
import { BookOpen, CheckSquare, Calendar, Plus, ArrowRight, TrendingUp } from 'lucide-react'

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
    <PageLayout title="控制台" description={formattedToday}>
      <div className="space-y-8 w-full">
        {/* Welcome Hero Area - fully responsive layout */}
        <div className="relative overflow-hidden rounded-xl border border-zinc-850 bg-gradient-to-r from-zinc-900/80 via-zinc-950 to-zinc-900/50 p-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-zinc-700/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-sm sm:text-base font-bold text-zinc-100 tracking-tight">你好，今天也是值得记录的一天。</h1>
              <p className="text-[11px] sm:text-xs text-zinc-400 max-w-lg leading-relaxed">
                Journal Hub 已经为您准备就绪。您今天有 {stats?.todos.pending || 0} 项待办任务需要跟进，目前已记录了 {stats?.journals.total || 0} 篇日记。
              </p>
            </div>
            <Link
              to="/journals?new=1"
              className="inline-flex items-center gap-1.5 shrink-0 rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-zinc-950 shadow-md hover:bg-zinc-200 active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> 开启今日日志
            </Link>
          </div>
        </div>

        {/* Core Layout Grid - split on xl screens, stack on lg and below */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full">
          {/* Left Column - Stats and Journals */}
          <div className="xl:col-span-8 space-y-6 w-full min-w-0">
            {/* Stats Row - responsive from 1 to 3 columns */}
            {!loading && stats && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  icon={BookOpen}
                  label="日志总数"
                  value={stats.journals.total}
                  sub={`今日写入 ${stats.journals.today} 篇`}
                  to="/journals"
                  color="border-t-emerald-500/80"
                  badge={`${stats.journals.today > 0 ? '已记录' : '待执笔'}`}
                  badgeColor={stats.journals.today > 0 ? 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30' : 'text-zinc-400 bg-zinc-900 border-zinc-800'}
                />
                <StatCard
                  icon={CheckSquare}
                  label="待处理待办"
                  value={stats.todos.pending}
                  sub={`已完成 ${stats.todos.completed} 项`}
                  to="/todos"
                  color="border-t-blue-500/80"
                  badge={`${stats.todos.pending > 0 ? '进行中' : '全搞定'}`}
                  badgeColor={stats.todos.pending > 0 ? 'text-blue-400 bg-blue-950/20 border-blue-900/30' : 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30'}
                />
                <StatCard
                  icon={Calendar}
                  label="日程事件"
                  value={stats.events.total}
                  sub="全部已记录行程"
                  to="/calendar"
                  color="border-t-purple-500/80"
                  badge="日历"
                  badgeColor="text-purple-400 bg-purple-950/20 border-purple-900/30"
                />
              </div>
            )}

            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className="border border-zinc-850 bg-card rounded-xl p-5 shadow-sm animate-pulse">
                    <div className="h-4 bg-zinc-800 rounded w-16 mb-4" />
                    <div className="h-8 bg-zinc-800 rounded w-12 mb-2" />
                    <div className="h-3 bg-zinc-800 rounded w-24" />
                  </div>
                ))}
              </div>
            )}

            {/* Recent Journals */}
            <section className="bg-card border border-zinc-850 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    最近日志
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">捕捉生活瞬间，沉淀思维碎片</p>
                </div>
                <Link to="/journals" className="group flex items-center gap-1 text-xs font-bold text-zinc-400 hover:text-white transition-colors">
                  查看全部 <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {stats?.recent_journals.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/10">
                    <div className="w-10 h-10 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-400 mb-3">
                      <BookOpen className="h-4.5 w-4.5" />
                    </div>
                    <h3 className="text-xs font-bold text-zinc-200">未记录任何日志</h3>
                    <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
                      写日记能让你理清头绪并记录美好回忆。现在就开启第一篇日记吧。
                    </p>
                    <Link
                      to="/journals?new=1"
                      className="inline-flex items-center gap-1.5 mt-4 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-800 transition-all duration-200 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> 记录新的一天
                    </Link>
                  </div>
                )}
                {stats?.recent_journals.map(j => (
                  <Link
                    key={j.id}
                    to={`/journals/${j.id}`}
                    className="flex flex-col gap-2 group rounded-xl p-4 border border-zinc-850 hover:border-zinc-700 bg-zinc-950/20 hover:bg-zinc-900/30 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-100 group-hover:text-white truncate">
                        {j.title || '无标题日志'}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-bold shrink-0 ml-4">
                        {j.created_at ? formatRelative(j.created_at) : ''}
                      </span>
                    </div>
                    {j.content && (
                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {j.content.replace(/<[^>]*>/g, '')}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {j.mood && (
                        <span className="text-[10px] bg-zinc-900/80 border border-zinc-800 text-zinc-300 rounded-md px-1.5 py-0.5 font-bold">
                          心情 {j.mood}
                        </span>
                      )}
                      {(j.tags || []).slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] text-zinc-500 border border-zinc-850/80 px-1.5 py-0.5 rounded-md bg-zinc-900/40">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column - Actions & Todos */}
          <div className="xl:col-span-4 space-y-6 w-full min-w-0">
            {/* Quick Actions */}
            <section className="bg-card border border-zinc-850 rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-zinc-100 mb-4">快捷入口</h2>
              <div className="grid grid-cols-1 gap-2.5">
                <QuickActionButton
                  to="/journals?new=1"
                  icon={BookOpen}
                  label="写日志"
                  desc="记录今天的点滴与感受"
                  color="hover:border-l-emerald-500/80"
                />
                <QuickActionButton
                  to="/todos?new=1"
                  icon={CheckSquare}
                  label="新建待办"
                  desc="加入你的任务追踪列表"
                  color="hover:border-l-blue-500/80"
                />
                <QuickActionButton
                  to="/calendar"
                  icon={Calendar}
                  label="查看日程"
                  desc="快速检索日历及会议"
                  color="hover:border-l-purple-500/80"
                />
              </div>
            </section>

            {/* Pending Todos */}
            <section className="bg-card border border-zinc-850 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-zinc-100">今日任务清单</h2>
                  <p className="text-xs text-zinc-400 mt-1">需在今日落实的待办</p>
                </div>
                <Link to="/todos" className="group flex items-center gap-1 text-xs font-bold text-zinc-400 hover:text-white transition-colors">
                  全部 <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              <div className="space-y-2">
                {stats?.pending_todos.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center border border-dashed border-zinc-800 rounded-lg bg-zinc-900/10">
                    <div className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-900/40 flex items-center justify-center text-zinc-400 mb-2">
                      <CheckSquare className="h-3.5 w-3.5" />
                    </div>
                    <h3 className="text-xs font-bold text-zinc-200">今日暂无安排</h3>
                    <p className="text-[10px] text-zinc-500 mt-1 max-w-xs leading-relaxed">
                      今天非常惬意，没有待处理待办任务。
                    </p>
                    <Link
                      to="/todos?new=1"
                      className="inline-flex items-center gap-1 mt-3 rounded-lg border border-zinc-850 bg-zinc-900/60 px-3 py-1.5 text-[10px] font-bold text-zinc-300 hover:bg-zinc-800 transition-all duration-200 cursor-pointer"
                    >
                      新增任务
                    </Link>
                  </div>
                )}
                {stats?.pending_todos.map(t => (
                  <div
                    key={t.id}
                    className={`flex items-center gap-3 rounded-lg border border-zinc-850 p-3 hover:border-zinc-700 bg-zinc-950/20 hover:bg-zinc-900/20 transition-all duration-200 ${
                      t.priority === 'high' ? 'border-l-2 border-l-rose-500' :
                      t.priority === 'medium' ? 'border-l-2 border-l-amber-500' : 'border-l-2 border-l-zinc-650'
                    }`}
                  >
                    <span className="text-xs text-zinc-200 font-bold truncate">{t.title}</span>
                    {t.due_date && (
                      <span className={`text-[9px] shrink-0 ml-auto font-bold px-1.5 py-0.5 rounded border ${
                        t.due_date < today ? 'bg-rose-950/20 text-rose-400 border-rose-900/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
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
  badge: string
  badgeColor: string
}

function StatCard({ icon: Icon, label, value, sub, to, color, badge, badgeColor }: StatCardProps) {
  return (
    <Link
      to={to}
      className={`group bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 border border-zinc-850 border-t-2 ${color} rounded-xl p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-700 block`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{label}</span>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 border rounded-md ${badgeColor}`}>
          {badge}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold text-zinc-100 tracking-tight tabular-nums">{value}</div>
        <TrendingUp className="h-3 w-3 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
      </div>
      <div className="text-[10px] text-zinc-450 mt-2 font-bold">{sub}</div>
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
      className={`group flex items-center gap-4 rounded-lg border border-zinc-850 bg-card p-3.5 hover:bg-zinc-900/40 hover:shadow-sm transition-all duration-250 text-left border-l-2 ${color}`}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-zinc-800 bg-zinc-900 text-zinc-400 shrink-0 transition-all group-hover:border-zinc-700">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-bold text-zinc-200 transition-colors group-hover:text-white">{label}</div>
        <div className="text-[11px] text-zinc-450 mt-0.5 truncate">{desc}</div>
      </div>
    </Link>
  )
}
