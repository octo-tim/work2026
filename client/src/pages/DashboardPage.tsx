/**
 * Dashboard Page
 * 부서별 업무 현황과 통계를 시각적으로 확인할 수 있는 대시보드
 * Design: 매출관리와 동일한 디자인 언어 (그라데이션, 글래스모피즘, 사업부별 색상)
 * Mobile Responsive
 */

import { useAuth } from '@/_core/hooks/useAuth';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/lib/trpc';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend, Area, AreaChart
} from 'recharts';
import { 
  ClipboardList, Clock, CheckCircle2, AlertCircle, 
  TrendingUp, Users, Building2, Calendar, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Flame, Target
} from 'lucide-react';
import { STATUS_LABELS } from '@/types/task';

const COLORS = {
  pending: '#f59e0b',
  inProgress: '#6366f1',
  completed: '#10b981',
  primary: '#6366f1',
  secondary: '#8b5cf6',
};

const PIE_COLORS = ['#f59e0b', '#6366f1', '#10b981'];

const GRADIENT_CARDS = [
  { 
    gradient: 'from-indigo-500 to-violet-600',
    iconBg: 'bg-white/20',
    textColor: 'text-white',
    subtextColor: 'text-white/80',
  },
  { 
    gradient: 'from-amber-400 to-orange-500',
    iconBg: 'bg-white/20',
    textColor: 'text-white',
    subtextColor: 'text-white/80',
  },
  { 
    gradient: 'from-blue-500 to-cyan-500',
    iconBg: 'bg-white/20',
    textColor: 'text-white',
    subtextColor: 'text-white/80',
  },
  { 
    gradient: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-white/20',
    textColor: 'text-white',
    subtextColor: 'text-white/80',
  },
];

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  
  const { data: myStats, isLoading: myLoading } = trpc.dashboard.myStats.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  
  const { data: allStats, isLoading: allLoading } = trpc.dashboard.allStats.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === 'admin' }
  );

  const isAdmin = user?.role === 'admin';
  const stats = isAdmin ? allStats : myStats;
  const isLoading = isAdmin ? allLoading : myLoading;

  if (!isAuthenticated) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">로그인이 필요합니다.</p>
        </div>
      </MainLayout>
    );
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse text-muted-foreground">로딩 중...</div>
        </div>
      </MainLayout>
    );
  }

  const statusData = [
    { name: STATUS_LABELS.pending, value: stats?.pendingTasks || 0, color: COLORS.pending },
    { name: STATUS_LABELS['in-progress'], value: stats?.inProgressTasks || 0, color: COLORS.inProgress },
    { name: STATUS_LABELS.completed, value: stats?.completedTasks || 0, color: COLORS.completed },
  ];

  const departmentData = stats?.departmentStats?.slice(0, 8).map(dept => ({
    name: dept.department.length > 6 ? dept.department.slice(0, 6) + '...' : dept.department,
    fullName: dept.department,
    대기: dept.pending,
    진행중: dept.inProgress,
    완료: dept.completed,
    total: dept.total,
  })) || [];

  const assigneeData = stats?.assigneeStats?.slice(0, 6).map(a => ({
    name: a.assignee.length > 4 ? a.assignee.slice(0, 4) + '...' : a.assignee,
    fullName: a.assignee,
    대기: a.pending,
    진행중: a.inProgress,
    완료: a.completed,
    total: a.total,
  })) || [];

  const weeklyData = stats?.weeklyTrend || [];

  const completionRate = stats?.totalTasks 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
    : 0;

  const summaryCards: Array<{
    label: string;
    value: number;
    icon: typeof ClipboardList;
    extra?: string;
    gradient: string;
    iconBg: string;
    textColor: string;
    subtextColor: string;
  }> = [
    {
      label: '전체 업무',
      value: stats?.totalTasks || 0,
      icon: ClipboardList,
      ...GRADIENT_CARDS[0],
    },
    {
      label: '대기',
      value: stats?.pendingTasks || 0,
      icon: AlertCircle,
      ...GRADIENT_CARDS[1],
    },
    {
      label: '진행중',
      value: stats?.inProgressTasks || 0,
      icon: Clock,
      ...GRADIENT_CARDS[2],
    },
    {
      label: '완료',
      value: stats?.completedTasks || 0,
      icon: CheckCircle2,
      extra: `완료율 ${completionRate}%`,
      ...GRADIENT_CARDS[3],
    },
  ];

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-5 md:space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              대시보드
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">
              {isAdmin ? '전체 업무 현황을 한눈에 확인하세요' : '내 업무 현황을 한눈에 확인하세요'}
            </p>
          </div>
          <div className="text-xs md:text-sm text-muted-foreground flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
            <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* 요약 카드 - 그라데이션 스타일 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-4 md:p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5`}
              >
                {/* 장식 원 */}
                <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
                <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />
                
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className={`text-xs md:text-sm ${card.subtextColor} font-medium`}>{card.label}</p>
                    <p className={`text-2xl md:text-3xl font-bold ${card.textColor} mt-1`}>{card.value}</p>
                    {card.extra && (
                      <p className={`text-xs ${card.subtextColor} mt-1`}>{card.extra}</p>
                    )}
                  </div>
                  <div className={`p-2.5 md:p-3 ${card.iconBg} rounded-xl backdrop-blur-sm`}>
                    <Icon className={`w-5 h-5 md:w-6 md:h-6 ${card.textColor}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 완료율 프로그레스 바 */}
        <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-semibold text-foreground">전체 업무 완료율</span>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              {completionRate}%
            </span>
          </div>
          <Progress 
            value={completionRate} 
            className="h-3 [&>div]:bg-gradient-to-r [&>div]:from-indigo-500 [&>div]:to-violet-600 [&>div]:transition-all [&>div]:duration-700"
          />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>완료 {stats?.completedTasks || 0}건</span>
            <span>전체 {stats?.totalTasks || 0}건</span>
          </div>
        </div>

        {/* 차트 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
          {/* 상태별 분포 (도넛 차트) */}
          <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
            <div className="p-4 md:p-5 border-b border-border/40">
              <h3 className="text-sm md:text-base font-semibold flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                </div>
                상태별 업무 분포
              </h3>
            </div>
            <div className="p-4 md:p-5">
              <div className="h-[220px] md:h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value}건`, '']}
                      contentStyle={{ 
                        backgroundColor: 'var(--card)', 
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 md:gap-6 mt-3 flex-wrap">
                {statusData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-full">
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: PIE_COLORS[index] }}
                    />
                    <span className="text-xs md:text-sm text-muted-foreground font-medium">{item.name}</span>
                    <span className="text-xs font-bold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 주간 트렌드 (에리어 차트) */}
          <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
            <div className="p-4 md:p-5 border-b border-border/40">
              <h3 className="text-sm md:text-base font-semibold flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                주간 업무 트렌드
              </h3>
            </div>
            <div className="p-4 md:p-5">
              <div className="h-[220px] md:h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData}>
                    <defs>
                      <linearGradient id="gradientCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gradientCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                    <XAxis 
                      dataKey="week" 
                      tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--card)', 
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area 
                      type="monotone" 
                      dataKey="created" 
                      name="생성" 
                      stroke="#6366f1" 
                      fill="url(#gradientCreated)"
                      strokeWidth={2.5}
                      dot={{ fill: '#6366f1', r: 3, strokeWidth: 0 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="completed" 
                      name="완료" 
                      stroke="#10b981" 
                      fill="url(#gradientCompleted)"
                      strokeWidth={2.5}
                      dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* 부서별 & 담당자별 통계 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
          {/* 부서별 업무 현황 */}
          <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
            <div className="p-4 md:p-5 border-b border-border/40">
              <h3 className="text-sm md:text-base font-semibold flex items-center gap-2">
                <div className="p-1.5 bg-violet-100 dark:bg-violet-900/50 rounded-lg">
                  <Building2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                </div>
                부서별 업무 현황
              </h3>
            </div>
            <div className="p-4 md:p-5">
              {departmentData.length > 0 ? (
                <div className="h-[250px] md:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentData} layout="vertical" barGap={0}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} horizontal={false} />
                      <XAxis 
                        type="number"
                        tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={50}
                        tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => [value, name]}
                        labelFormatter={(label) => {
                          const item = departmentData.find(d => d.name === label);
                          return item?.fullName || label;
                        }}
                        contentStyle={{ 
                          backgroundColor: 'var(--card)', 
                          border: '1px solid var(--border)',
                          borderRadius: '12px',
                          fontSize: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="대기" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="진행중" stackId="a" fill="#6366f1" />
                      <Bar dataKey="완료" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] md:h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                  데이터가 없습니다
                </div>
              )}
            </div>
          </div>

          {/* 담당자별 업무 현황 */}
          <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
            <div className="p-4 md:p-5 border-b border-border/40">
              <h3 className="text-sm md:text-base font-semibold flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                  <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                담당자별 업무 현황
              </h3>
            </div>
            <div className="p-4 md:p-5">
              {assigneeData.length > 0 ? (
                <div className="h-[250px] md:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={assigneeData} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                      <XAxis 
                        dataKey="name"
                        tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                        axisLine={false}
                        tickLine={false}
                        width={30}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => [value, name]}
                        labelFormatter={(label) => {
                          const item = assigneeData.find(a => a.name === label);
                          return item?.fullName || label;
                        }}
                        contentStyle={{ 
                          backgroundColor: 'var(--card)', 
                          border: '1px solid var(--border)',
                          borderRadius: '12px',
                          fontSize: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="대기" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="진행중" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="완료" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] md:h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                  데이터가 없습니다
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 마감일 임박 업무 */}
        {stats?.urgentTasks && stats.urgentTasks.length > 0 && (
          <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
            <div className="p-4 md:p-5 border-b border-border/40 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30">
              <h3 className="text-sm md:text-base font-semibold flex items-center gap-2 text-red-700 dark:text-red-400">
                <div className="p-1.5 bg-red-100 dark:bg-red-900/50 rounded-lg">
                  <Flame className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                </div>
                마감일 임박 업무
                <span className="ml-1 px-2.5 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-xs font-bold rounded-full">
                  {stats.urgentTasks.length}건
                </span>
              </h3>
            </div>
            <div className="p-4 md:p-5">
              <div className="divide-y divide-border/60">
                {stats.urgentTasks.map((task) => (
                  <div key={task.id} className="py-3 md:py-3.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm font-medium text-foreground truncate">
                        <span className="text-muted-foreground font-mono">#{task.number}</span> {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {task.department || '미지정'} · {task.assignee || '미지정'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span 
                        className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                          task.daysLeft < 0 
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' 
                            : task.daysLeft === 0
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                            : task.daysLeft <= 3
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                        }`}
                      >
                        {task.daysLeft < 0 
                          ? `${Math.abs(task.daysLeft)}일 경과` 
                          : task.daysLeft === 0 
                          ? '오늘 마감' 
                          : `D-${task.daysLeft}`}
                      </span>
                      <span 
                        className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          task.status === 'in-progress'
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                        }`}
                      >
                        {STATUS_LABELS[task.status as keyof typeof STATUS_LABELS]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 최근 업무 목록 */}
        <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="p-4 md:p-5 border-b border-border/40">
            <h3 className="text-sm md:text-base font-semibold flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <ClipboardList className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              최근 업무
            </h3>
          </div>
          <div className="p-4 md:p-5">
            {stats?.recentTasks && stats.recentTasks.length > 0 ? (
              <div className="divide-y divide-border/60">
                {stats.recentTasks.map((task) => (
                  <div key={task.id} className="py-3 md:py-3.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm font-medium text-foreground truncate">
                        <span className="text-muted-foreground font-mono">#{task.number}</span> {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {task.department || '미지정'} · {task.assignee || '미지정'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.schedule && (
                        <span className="text-xs text-muted-foreground hidden sm:inline bg-muted/50 px-2 py-0.5 rounded">{task.schedule}</span>
                      )}
                      <span 
                        className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          task.status === 'completed' 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' 
                            : task.status === 'in-progress'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                        }`}
                      >
                        {STATUS_LABELS[task.status as keyof typeof STATUS_LABELS]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 md:py-12 text-center text-muted-foreground text-sm">
                최근 업무가 없습니다
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
