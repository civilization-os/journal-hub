import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { statsApi } from '@/lib/api'
import { PageLayout } from '@/components/layout/PageLayout'
import { useToast } from '@/components/ui/toaster'
import { Stats } from '@/types'
import { formatRelative, todayStr, stripHtml } from '@/lib/utils'
import { BookOpen, CheckSquare, Calendar, Plus, ArrowRight, TrendingUp, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const loadStats = useCallback(() => {
    statsApi.overview().then(r => {
      setStats(r.data)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
      toast({ title: '加载统计数据失败', variant: 'error' })
    })
  }, [toast])

  useEffect(() => {
    loadStats()
    const handler = () => loadStats()
    window.addEventListener('app_data_changed', handler)
    return () => window.removeEventListener('app_data_changed', handler)
  }, [loadStats])

  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const today = todayStr()
  const formattedToday = time.toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })
  
  const formattedTime = time.toLocaleTimeString('zh-CN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })

  const headerTitle = (
    <div className="flex items-center gap-3">
      <Calendar className="h-6 w-6 text-primary" />
      <span>{formattedToday}</span>
      <div className="flex items-center gap-1.5 ml-3 px-3 py-1 bg-secondary/80 text-secondary-foreground rounded-lg font-mono text-base border">
        <Clock className="h-4 w-4" />
        {formattedTime}
      </div>
    </div>
  )

  return (
    <PageLayout title={headerTitle}>
      <div className="space-y-8 w-full">
        {/* Welcome Hero Area */}
        <Card className="relative overflow-hidden bg-primary text-primary-foreground border-none shadow-md">
          <CardContent className="p-8 md:p-10 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-8">
            <div className="space-y-4">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                你好，今天也是值得记录的一天。
              </h1>
              <p className="text-base text-primary-foreground/80 max-w-xl leading-relaxed font-medium">
                Journal Hub 已经为您准备就绪。您今天有 <strong className="text-primary-foreground font-bold text-lg">{loading ? '...' : stats?.todos.pending || 0}</strong> 项待办任务需要跟进，目前已记录了 <strong className="text-primary-foreground font-bold text-lg">{loading ? '...' : stats?.journals.total || 0}</strong> 篇日记。
              </p>
            </div>
            <Link to="/journals?new=1">
              <Button size="lg" variant="secondary" className="font-bold px-6">
                <Plus className="h-5 w-5 mr-2" /> 开启今日日志
              </Button>
            </Link>
          </CardContent>
        </Card>

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
                  badgeColor="emerald"
                />
                <StatCard
                  icon={CheckSquare}
                  label="待处理待办"
                  value={stats.todos.pending}
                  sub={`已完成 ${stats.todos.completed} 项`}
                  to="/todos"
                  color="border-t-blue-500/80"
                  badge={`${stats.todos.pending > 0 ? '进行中' : '全搞定'}`}
                  badgeColor={stats.todos.pending > 0 ? 'blue' : 'emerald'}
                />
                <StatCard
                  icon={Calendar}
                  label="日程事件"
                  value={stats.events.total}
                  sub="全部已记录行程"
                  to="/calendar"
                  color="border-t-purple-500/80"
                  badge="日历"
                  badgeColor="purple"
                />
              </div>
            )}

            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className="border border-zinc-800 bg-card rounded-xl p-5 shadow-sm animate-pulse">
                    <div className="h-4 bg-zinc-800 rounded w-16 mb-4" />
                    <div className="h-8 bg-zinc-800 rounded w-12 mb-2" />
                    <div className="h-3 bg-zinc-800 rounded w-24" />
                  </div>
                ))}
              </div>
            )}

            {/* Recent Journals */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-lg">最近日志</CardTitle>
                  <CardDescription>捕捉生活瞬间，沉淀思维碎片</CardDescription>
                </div>
                <Link to="/journals">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    查看全部 <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                {loading && (
                  <>
                    {[0, 1].map(i => (
                      <div key={i} className="flex flex-col gap-3 rounded-xl p-5 border bg-muted/20 animate-pulse">
                        <div className="flex justify-between"><div className="h-5 bg-muted rounded w-40" /><div className="h-4 bg-muted rounded w-20" /></div>
                        <div className="h-4 bg-muted rounded w-full mt-2" />
                        <div className="h-4 bg-muted rounded w-2/3" />
                      </div>
                    ))}
                  </>
                )}
                {!loading && stats?.recent_journals.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed rounded-xl bg-muted/10">
                    <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground mb-5">
                      <BookOpen className="h-8 w-8" />
                    </div>
                    <h3 className="text-base font-bold">未记录任何日志</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
                      写日记能让你理清头绪并记录美好回忆。现在就开启第一篇日记吧。
                    </p>
                    <Link to="/journals?new=1" className="mt-6">
                      <Button variant="outline">
                        <Plus className="h-4 w-4 mr-2" /> 记录新的一天
                      </Button>
                    </Link>
                  </div>
                )}
                {stats?.recent_journals.map(j => (
                  <Link
                    key={j.id}
                    to={`/journals/${j.id}`}
                    className="flex flex-col gap-3 group rounded-xl p-5 bg-card hover:bg-secondary/50 transition-all duration-200 border"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold group-hover:text-foreground truncate transition-colors">
                        {j.title || '无标题日志'}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium shrink-0 ml-4 transition-colors">
                        {j.created_at ? formatRelative(j.created_at) : ''}
                      </span>
                    </div>
                    {j.content && (
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed transition-colors">
                        {stripHtml(j.content)}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {j.mood && (
                        <Badge variant="secondary">
                          {j.mood}
                        </Badge>
                      )}
                      {(j.tags || []).slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-muted-foreground">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Actions & Todos */}
          <div className="xl:col-span-4 space-y-6 w-full min-w-0">
            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">快捷入口</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3">
                <QuickActionButton
                  to="/journals?new=1"
                  icon={BookOpen}
                  label="写日志"
                  desc="记录今天的点滴与感受"
                  iconColor="text-emerald-500 bg-emerald-100"
                />
                <QuickActionButton
                  to="/todos?new=1"
                  icon={CheckSquare}
                  label="新建待办"
                  desc="加入你的任务追踪列表"
                  iconColor="text-blue-500 bg-blue-100"
                />
                <QuickActionButton
                  to="/calendar"
                  icon={Calendar}
                  label="查看日程"
                  desc="快速检索日历及会议"
                  iconColor="text-purple-500 bg-purple-100"
                />
              </CardContent>
            </Card>

            {/* Pending Todos */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-lg">今日任务清单</CardTitle>
                  <CardDescription>需在今日落实的待办</CardDescription>
                </div>
                <Link to="/todos">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    全部 <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>

              <CardContent className="space-y-3">
                {loading && (
                  <>
                    {[0, 1, 2].map(i => (
                      <div key={i} className="flex items-center gap-4 rounded-xl bg-muted/20 p-4 animate-pulse">
                        <div className="h-5 bg-muted rounded w-40" />
                        <div className="h-4 bg-muted rounded w-16 ml-auto" />
                      </div>
                    ))}
                  </>
                )}
                {!loading && stats?.pending_todos.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed rounded-xl bg-muted/10">
                    <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground mb-4">
                      <CheckSquare className="h-7 w-7" />
                    </div>
                    <h3 className="text-base font-bold">今日暂无安排</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
                      今天非常惬意，没有待处理的任务。
                    </p>
                    <Link to="/todos?new=1" className="mt-5">
                      <Button variant="outline">
                        新增任务
                      </Button>
                    </Link>
                  </div>
                )}
                {stats?.pending_todos.map(t => (
                  <div
                    key={t.id}
                    className="flex items-center gap-4 rounded-xl p-4 bg-card hover:bg-secondary/50 transition-all duration-200 border"
                  >
                    <span className="text-sm font-medium truncate">{t.title}</span>
                    {t.due_date && (
                      <Badge 
                        variant={t.due_date < today ? 'priority-high' : 'outline'} 
                        className="ml-auto shrink-0"
                      >
                        {t.due_date}
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
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
    <Link to={to} className="block">
      <Card className="group transition-all duration-200 hover:border-primary/50 relative overflow-hidden h-full">
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${color}`} />
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
            <Badge variant="secondary" className="bg-secondary/50">
              {badge}
            </Badge>
          </div>
          <div className="flex items-baseline gap-3">
            <div className="text-4xl font-black tracking-tight tabular-nums">{value}</div>
            <TrendingUp className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="text-sm text-muted-foreground mt-4 font-medium">{sub}</div>
        </CardContent>
      </Card>
    </Link>
  )
}

interface QuickActionButtonProps {
  to: string
  icon: typeof BookOpen
  label: string
  desc: string
  iconColor?: string
}

function QuickActionButton({ to, icon: Icon, label, desc, iconColor }: QuickActionButtonProps) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-xl border bg-card hover:bg-secondary/30 p-4 transition-colors text-left"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-bold transition-colors group-hover:text-primary">{label}</div>
        <div className="text-xs text-muted-foreground mt-1 truncate">{desc}</div>
      </div>
    </Link>
  )
}
