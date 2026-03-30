/**
 * KPI 실적관리 페이지
 * 주간 입력 / 월간 요약 탭
 * 부서별 아코디언 + 주간 입력 테이블 + 월간 요약 테이블
 * 전월실적 / 금월목표 입력 지원
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { KpiTaskDetailDialog } from '@/components/KpiTaskDetailDialog';
import { KpiAssigneeDialog } from '@/components/KpiAssigneeDialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BarChart3,
  ClipboardEdit,
  Download,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Cell, Legend,
} from 'recharts';

// Types
interface KpiIndicator {
  id: number;
  kpiItemId: number;
  name: string;
  unit: string | null;
  sortOrder: number;
}

interface KpiItem {
  id: number;
  division: string;
  department: string;
  person: string;
  category: string;
  task: string;
  goal: string | null;
  isActive: boolean;
  sortOrder: number;
  indicators: KpiIndicator[];
}

interface KpiRecord {
  id: number;
  kpiIndicatorId: number;
  year: number;
  month: number;
  week: number;
  value: string | null;
}

interface KpiTarget {
  id: number;
  kpiIndicatorId: number;
  year: number;
  month: number;
  monthlyTarget: string | null;
  previousActual: string | null;
}

// Constants
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const WEEKS = ['1주차', '2주차', '3주차', '4주차', '5주차'];

const DEPT_COLORS: Record<string, string> = {
  '마케팅팀': '#06D6A0',
  '고객영업팀': '#FFD166',
  '채널영업팀': '#EF476F',
  '관리팀': '#118AB2',
  '생산팀': '#8338EC',
  '구매': '#FF6B6B',
};

// Helpers
const fmt = (n: number | null | undefined) => {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString();
};

const getDelta = (cur: number | null, prev: number | null) => {
  if (prev == null || prev === 0) {
    if (cur != null && cur > 0) return { val: '+∞', cls: 'up' as const };
    return { val: '—', cls: 'flat' as const };
  }
  if (cur == null) return { val: '—', cls: 'flat' as const };
  const r = ((cur - prev) / prev) * 100;
  if (r > 0) return { val: `+${r.toFixed(1)}%`, cls: 'up' as const };
  if (r < 0) return { val: `${r.toFixed(1)}%`, cls: 'down' as const };
  return { val: '0%', cls: 'flat' as const };
};

function DeltaBadge({ cur, prev }: { cur: number | null; prev: number | null }) {
  const d = getDelta(cur, prev);
  if (d.cls === 'flat') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground">—</span>;
  }
  if (d.cls === 'up') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
        <TrendingUp className="w-3 h-3" />
        {d.val}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200">
      <TrendingDown className="w-3 h-3" />
      {d.val}
    </span>
  );
}

// Debounced input component for weekly values
function WeeklyInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLocalValue(v);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onChange(v);
    }, 500);
  };

  return (
    <Input
      type="number"
      value={localValue}
      onChange={handleChange}
      disabled={disabled}
      placeholder="—"
      className="w-[72px] h-8 text-right text-sm px-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}

// Debounced input component for target/previous actual values
function TargetInput({
  value,
  onChange,
  disabled,
  placeholder,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLocalValue(v);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onChange(v);
    }, 500);
  };

  return (
    <Input
      type="number"
      value={localValue}
      onChange={handleChange}
      disabled={disabled}
      placeholder={placeholder || "—"}
      className={`w-[80px] h-8 text-right text-sm px-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${className || ''}`}
    />
  );
}

export default function KpiPage() {
  const { user, loading: authLoading } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-based
  const [tab, setTab] = useState<'input' | 'summary'>('input');
  const [selDiv, setSelDiv] = useState('전체');
  const [selDept, setSelDept] = useState('전체');
  const [selPerson, setSelPerson] = useState('전체');
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<KpiItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);

  // Data queries
  const { data: kpiItems, isLoading: itemsLoading } = trpc.kpi.getItems.useQuery();
  const { data: currentRecords, isLoading: recordsLoading } = trpc.kpi.getRecords.useQuery({ year, month });
  const prevMonth = month > 1 ? month - 1 : 12;
  const prevYear = month > 1 ? year : year - 1;
  const { data: prevRecords } = trpc.kpi.getRecords.useQuery({ year: prevYear, month: prevMonth });

  // Targets query
  const { data: currentTargets } = trpc.kpi.getTargets.useQuery({ year, month });

  // Assignees query
  const { data: assigneesData } = trpc.kpi.getAssignees.useQuery();
  const assignees = useMemo(() => assigneesData ?? [], [assigneesData]);

  const saveRecordMutation = trpc.kpi.saveRecord.useMutation({
    onError: (err) => {
      toast.error('저장 실패: ' + err.message);
    },
  });

  const saveTargetMutation = trpc.kpi.saveTarget.useMutation({
    onError: (err) => {
      toast.error('목표 저장 실패: ' + err.message);
    },
  });

  const utils = trpc.useUtils();

  // Build record lookup map: indicatorId -> week -> value
  const recordMap = useMemo(() => {
    const map: Record<string, string> = {};
    currentRecords?.forEach((r: KpiRecord) => {
      if (r.value != null) map[`${r.kpiIndicatorId}|${r.week}`] = r.value;
    });
    return map;
  }, [currentRecords]);

  const prevRecordMap = useMemo(() => {
    const map: Record<string, string> = {};
    prevRecords?.forEach((r: KpiRecord) => {
      if (r.value != null) map[`${r.kpiIndicatorId}|${r.week}`] = r.value;
    });
    return map;
  }, [prevRecords]);

  // Build target lookup map: indicatorId -> { monthlyTarget, previousActual }
  const targetMap = useMemo(() => {
    const map: Record<number, { monthlyTarget: string | null; previousActual: string | null }> = {};
    currentTargets?.forEach((t: KpiTarget) => {
      map[t.kpiIndicatorId] = {
        monthlyTarget: t.monthlyTarget,
        previousActual: t.previousActual,
      };
    });
    return map;
  }, [currentTargets]);

  // Get week value
  const getWeekVal = useCallback((indicatorId: number, week: number): number | null => {
    const v = recordMap[`${indicatorId}|${week}`];
    if (v == null || v === '') return null;
    return parseFloat(v);
  }, [recordMap]);

  // Get month total for an indicator
  const getMonthTotal = useCallback((indicatorId: number, isCurrentMonth: boolean): number | null => {
    const map = isCurrentMonth ? recordMap : prevRecordMap;
    let sum = 0;
    let has = false;
    for (let w = 1; w <= 5; w++) {
      const v = map[`${indicatorId}|${w}`];
      if (v != null && v !== '') {
        sum += parseFloat(v);
        has = true;
      }
    }
    return has ? sum : null;
  }, [recordMap, prevRecordMap]);

  // Get target values for an indicator
  const getTarget = useCallback((indicatorId: number): { monthlyTarget: number | null; previousActual: number | null } => {
    const t = targetMap[indicatorId];
    if (!t) return { monthlyTarget: null, previousActual: null };
    return {
      monthlyTarget: t.monthlyTarget != null && t.monthlyTarget !== '0' ? parseFloat(t.monthlyTarget) : null,
      previousActual: t.previousActual != null && t.previousActual !== '0' ? parseFloat(t.previousActual) : null,
    };
  }, [targetMap]);

  // Get achievement rate
  const getAchievementRate = useCallback((indicatorId: number): number | null => {
    const cur = getMonthTotal(indicatorId, true);
    const { monthlyTarget } = getTarget(indicatorId);
    if (cur == null || monthlyTarget == null || monthlyTarget === 0) return null;
    return (cur / monthlyTarget) * 100;
  }, [getMonthTotal, getTarget]);

  // Handle value change
  const handleValueChange = useCallback((indicatorId: number, week: number, val: string) => {
    const numVal = val === '' ? '0' : val;
    saveRecordMutation.mutate(
      { kpiIndicatorId: indicatorId, year, month, week, value: numVal },
      {
        onSuccess: () => {
          utils.kpi.getRecords.invalidate({ year, month });
        },
      }
    );
  }, [year, month, saveRecordMutation, utils]);

  // Handle target change
  const handleTargetChange = useCallback((indicatorId: number, field: 'monthlyTarget' | 'previousActual', val: string) => {
    const numVal = val === '' ? '0' : val;
    saveTargetMutation.mutate(
      { kpiIndicatorId: indicatorId, year, month, [field]: numVal },
      {
        onSuccess: () => {
          utils.kpi.getTargets.invalidate({ year, month });
        },
      }
    );
  }, [year, month, saveTargetMutation, utils]);

  // Filtering
  const items = useMemo(() => kpiItems || [], [kpiItems]);

  const divisions = useMemo(() => Array.from(new Set(items.map((d: KpiItem) => d.division))), [items]);
  const departments = useMemo(() => {
    const base = selDiv === '전체' ? items : items.filter((d: KpiItem) => d.division === selDiv);
    return Array.from(new Set(base.map((d: KpiItem) => d.department)));
  }, [items, selDiv]);
  const persons = useMemo(() => {
    let base = items as KpiItem[];
    if (selDiv !== '전체') base = base.filter(d => d.division === selDiv);
    if (selDept !== '전체') base = base.filter(d => d.department === selDept);
    return Array.from(new Set(base.map(d => d.person))).filter(p => p !== '미정').sort();
  }, [items, selDiv, selDept]);

  const filtered = useMemo(() => {
    let data = items as KpiItem[];
    if (selDiv !== '전체') data = data.filter(d => d.division === selDiv);
    if (selDept !== '전체') data = data.filter(d => d.department === selDept);
    if (selPerson !== '전체') data = data.filter(d => d.person === selPerson);
    return data;
  }, [items, selDiv, selDept, selPerson]);

  // Group by department
  const grouped = useMemo(() => {
    const map: Record<string, KpiItem[]> = {};
    filtered.forEach(d => {
      if (!map[d.department]) map[d.department] = [];
      map[d.department].push(d);
    });
    return map;
  }, [filtered]);

  // Auto-expand all departments on first load
  useEffect(() => {
    if (items.length > 0 && expandedDepts.size === 0) {
      const allDepts = new Set(items.map((d: KpiItem) => d.department));
      setExpandedDepts(allDepts);
    }
  }, [items]);

  // Summary stats
  const summaryStats = useMemo(() => {
    let totalKpis = 0;
    let filledCur = 0;
    let totalCur = 0;
    let totalPrev = 0;
    let totalTarget = 0;
    let targetCount = 0;

    filtered.forEach((item: KpiItem) => {
      item.indicators.forEach((ind: KpiIndicator) => {
        totalKpis++;
        const cur = getMonthTotal(ind.id, true);
        const prev = getMonthTotal(ind.id, false);
        const { monthlyTarget } = getTarget(ind.id);
        if (cur != null) { filledCur++; totalCur += cur; }
        if (prev != null) totalPrev += prev;
        if (monthlyTarget != null) { totalTarget += monthlyTarget; targetCount++; }
      });
    });

    return {
      totalKpis,
      filledCur,
      totalCur,
      totalPrev,
      totalTarget,
      targetCount,
      inputRate: totalKpis > 0 ? Math.round((filledCur / totalKpis) * 100) : 0,
      overallAchievement: totalTarget > 0 ? Math.round((totalCur / totalTarget) * 100) : null,
    };
  }, [filtered, getMonthTotal, getTarget]);

  // Summary rows for monthly tab
  const summaryRows = useMemo(() => {
    const rows: Array<{ item: KpiItem; indicator: KpiIndicator; cur: number | null; prev: number | null; target: number | null; prevActual: number | null; achievement: number | null }> = [];
    filtered.forEach((item: KpiItem) => {
      item.indicators.forEach((ind: KpiIndicator) => {
        const cur = getMonthTotal(ind.id, true);
        const prev = getMonthTotal(ind.id, false);
        const { monthlyTarget, previousActual } = getTarget(ind.id);
        const achievement = getAchievementRate(ind.id);
        rows.push({ item, indicator: ind, cur, prev, target: monthlyTarget, prevActual: previousActual, achievement });
      });
    });
    rows.sort((a, b) => {
      if (a.cur == null && b.cur == null) return 0;
      if (a.cur == null) return 1;
      if (b.cur == null) return -1;
      return b.cur - a.cur;
    });
    return rows;
  }, [filtered, getMonthTotal, getTarget, getAchievementRate]);

  const toggleDept = (dept: string) => {
    setExpandedDepts(prev => {
      const n = new Set(prev);
      if (n.has(dept)) n.delete(dept);
      else n.add(dept);
      return n;
    });
  };

  // Month navigation
  const goNextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };
  const goPrevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };

  // Export CSV
  const exportCSV = useCallback(() => {
    const header = ['사업부', '부서', '담당자', '카테고리', '업무', 'KPI 지표', '전월실적', '금월목표', '1주차', '2주차', '3주차', '4주차', '5주차', '월 누계', '달성률(%)', '전월 대비(%)'];
    const rows: string[][] = [];
    filtered.forEach((item: KpiItem) => {
      item.indicators.forEach((ind: KpiIndicator) => {
        const wkVals = [1, 2, 3, 4, 5].map(w => {
          const v = getWeekVal(ind.id, w);
          return v != null ? String(v) : '';
        });
        const cur = getMonthTotal(ind.id, true);
        const prev = getMonthTotal(ind.id, false);
        const { monthlyTarget, previousActual } = getTarget(ind.id);
        const achievement = getAchievementRate(ind.id);
        const delta = cur != null && prev != null && prev !== 0
          ? ((cur - prev) / prev * 100).toFixed(1) + '%'
          : '';
        rows.push([
          item.division, item.department, item.person, item.category, item.task, ind.name,
          previousActual != null ? String(previousActual) : '',
          monthlyTarget != null ? String(monthlyTarget) : '',
          ...wkVals,
          cur != null ? String(cur) : '',
          achievement != null ? achievement.toFixed(1) + '%' : '',
          delta,
        ]);
      });
    });
    const bom = '\uFEFF';
    const csv = bom + [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KPI_실적_${year}년_${MONTHS[month - 1]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV 파일이 다운로드되었습니다.');
  }, [filtered, year, month, getWeekVal, getMonthTotal, getTarget, getAchievementRate]);

  // Handle task click
  const handleTaskClick = useCallback((item: KpiItem) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  }, []);

  // Can edit
  const canEdit = user?.role === 'admin' || user?.canEditSales;

  // Loading
  if (authLoading || itemsLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-5 pb-12">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Target className="w-6 h-6 text-primary" />
              KPI 실적관리
            </h1>
            <p className="text-sm text-muted-foreground mt-1">주간 입력 · 전월실적 / 금월목표 · 달성률 분석</p>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={goPrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-base font-semibold min-w-[120px] text-center">
              {year}년 {MONTHS[month - 1]}
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={goNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters + Tab + Export */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selDiv} onValueChange={(v) => { setSelDiv(v); setSelDept('전체'); setSelPerson('전체'); }}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="전체">전체 사업부</SelectItem>
              {divisions.map((d: string) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selDept} onValueChange={(v) => { setSelDept(v); setSelPerson('전체'); }}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="전체">전체 부서</SelectItem>
              {departments.map((d: string) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selPerson} onValueChange={setSelPerson}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="전체">전체 담당자</SelectItem>
              {persons.map((p: string) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1" />

          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setIsAssigneeOpen(true)} className="gap-1.5">
              <Users className="w-3.5 h-3.5" />
              담당자 관리
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
            <Download className="w-3.5 h-3.5" />
            CSV
          </Button>

          {/* Tab Toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setTab('input')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                tab === 'input'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <ClipboardEdit className="w-3.5 h-3.5" />
              주간 입력
            </button>
            <button
              onClick={() => setTab('summary')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                tab === 'summary'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              월간 요약
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-blue-500/5" />
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">KPI 지표 수</div>
            <div className="text-2xl font-bold text-blue-600">{summaryStats.totalKpis}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-emerald-500/5" />
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">입력률</div>
            <div className="text-2xl font-bold text-emerald-600">{summaryStats.inputRate}%</div>
            <Progress value={summaryStats.inputRate} className="h-1.5 mt-2" />
          </div>
          <div className="rounded-xl border border-border bg-card p-4 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-amber-500/5" />
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">이번 달 누계</div>
            <div className="text-2xl font-bold text-amber-600">{fmt(summaryStats.totalCur)}</div>
            {summaryStats.totalPrev > 0 && (
              <div className="mt-1">
                <DeltaBadge cur={summaryStats.totalCur} prev={summaryStats.totalPrev} />
              </div>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card p-4 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-indigo-500/5" />
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">금월 목표 합계</div>
            <div className="text-2xl font-bold text-indigo-600">{summaryStats.totalTarget > 0 ? fmt(summaryStats.totalTarget) : '—'}</div>
            {summaryStats.targetCount > 0 && (
              <div className="text-[10px] text-muted-foreground mt-1">{summaryStats.targetCount}개 지표 설정</div>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card p-4 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-purple-500/5" />
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">전체 달성률</div>
            <div className={`text-2xl font-bold ${
              summaryStats.overallAchievement != null
                ? summaryStats.overallAchievement >= 100 ? 'text-emerald-600' : summaryStats.overallAchievement >= 70 ? 'text-amber-600' : 'text-rose-600'
                : 'text-muted-foreground/30'
            }`}>
              {summaryStats.overallAchievement != null ? `${summaryStats.overallAchievement}%` : '—'}
            </div>
            {summaryStats.overallAchievement != null && (
              <Progress value={Math.min(summaryStats.overallAchievement, 100)} className="h-1.5 mt-2" />
            )}
          </div>
        </div>

        {/* ═══ PERSON ACHIEVEMENT VISUALIZATION ═══ */}
        {!recordsLoading && filtered.length > 0 && (() => {
          // Compute per-person stats
          const personMap: Record<string, { name: string; dept: string; totalCur: number; totalTarget: number; kpiCount: number; filledCount: number; indicators: Array<{ name: string; achievement: number | null }> }> = {};
          filtered.forEach((item: KpiItem) => {
            const pKey = item.person;
            if (pKey === '미정') return;
            if (!personMap[pKey]) {
              personMap[pKey] = { name: pKey, dept: item.department, totalCur: 0, totalTarget: 0, kpiCount: 0, filledCount: 0, indicators: [] };
            }
            const pm = personMap[pKey];
            item.indicators.forEach((ind: KpiIndicator) => {
              pm.kpiCount++;
              const cur = getMonthTotal(ind.id, true);
              const { monthlyTarget } = getTarget(ind.id);
              if (cur != null) { pm.totalCur += cur; pm.filledCount++; }
              if (monthlyTarget != null) pm.totalTarget += monthlyTarget;
              const ach = (cur != null && monthlyTarget != null && monthlyTarget > 0) ? Math.round((cur / monthlyTarget) * 100) : null;
              pm.indicators.push({ name: ind.name, achievement: ach });
            });
          });
          const personData = Object.values(personMap)
            .map(p => ({
              ...p,
              achievement: p.totalTarget > 0 ? Math.round((p.totalCur / p.totalTarget) * 100) : null,
              inputRate: p.kpiCount > 0 ? Math.round((p.filledCount / p.kpiCount) * 100) : 0,
            }))
            .sort((a, b) => (b.achievement ?? -1) - (a.achievement ?? -1));

          if (personData.length === 0) return null;

          const PERSON_COLORS = ['#06D6A0', '#FFD166', '#EF476F', '#118AB2', '#8338EC', '#FF6B6B', '#26547C', '#F77F00', '#6A4C93', '#1B998B'];

          // Bar chart data
          const barData = personData.map((p, i) => ({
            name: p.name,
            달성률: p.achievement ?? 0,
            입력률: p.inputRate,
            fill: PERSON_COLORS[i % PERSON_COLORS.length],
          }));

          // Radar chart data - top 5 persons with most indicators
          const radarPersons = personData.filter(p => p.achievement != null).slice(0, 5);
          const allIndicatorNames = Array.from(new Set(radarPersons.flatMap(p => p.indicators.filter(ind => ind.achievement != null).map(ind => ind.name)))).slice(0, 8);
          const radarData = allIndicatorNames.map(indName => {
            const entry: Record<string, string | number> = { indicator: indName.length > 8 ? indName.slice(0, 8) + '…' : indName };
            radarPersons.forEach(p => {
              const found = p.indicators.find(ind => ind.name === indName);
              entry[p.name] = found?.achievement ?? 0;
            });
            return entry;
          });

          return (
            <div className="space-y-4">
              {/* Section Title */}
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold">개인별 달성률</h2>
                <span className="text-xs text-muted-foreground">({personData.length}명)</span>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* Bar Chart - Achievement Rate */}
                <div className="xl:col-span-2 rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">달성률 비교</h3>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> 100% 이상</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> 70~99%</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> 70% 미만</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={Math.max(240, personData.length * 44)}>
                    <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" domain={[0, (max: number) => Math.max(max * 1.1, 100)]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                      <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 12, fontWeight: 600 }} />
                      <Tooltip
                        formatter={(value: number, name: string) => [`${value}%`, name]}
                        contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px' }}
                      />
                      <Bar dataKey="달성률" radius={[0, 6, 6, 0]} barSize={24}>
                        {barData.map((entry, idx) => (
                          <Cell
                            key={idx}
                            fill={entry.달성률 >= 100 ? '#06D6A0' : entry.달성률 >= 70 ? '#FFD166' : '#EF476F'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Person Cards - Ranking */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4">달성률 순위</h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {personData.map((p, i) => {
                      const col = DEPT_COLORS[p.dept] || '#6B7280';
                      const ach = p.achievement;
                      return (
                        <div key={p.name} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            i === 0 ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300' :
                            i === 1 ? 'bg-slate-100 text-slate-600 ring-2 ring-slate-300' :
                            i === 2 ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-300' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold truncate">{p.name}</span>
                              <Badge variant="outline" className="text-[9px] shrink-0" style={{ color: col, borderColor: `${col}40`, backgroundColor: `${col}08` }}>
                                {p.dept}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${Math.min(ach ?? 0, 100)}%`,
                                    backgroundColor: ach != null ? (ach >= 100 ? '#06D6A0' : ach >= 70 ? '#FFD166' : '#EF476F') : '#e5e7eb',
                                  }}
                                />
                              </div>
                              <span className={`text-xs font-bold min-w-[40px] text-right ${
                                ach != null ? (ach >= 100 ? 'text-emerald-600' : ach >= 70 ? 'text-amber-600' : 'text-rose-600') : 'text-muted-foreground'
                              }`}>
                                {ach != null ? `${ach}%` : '—'}
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-1">
                              KPI {p.kpiCount}개 · 입력 {p.filledCount}개 · 목표 {p.totalTarget > 0 ? fmt(p.totalTarget) : '미설정'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Radar Chart - Top Performers */}
              {radarData.length > 2 && radarPersons.length >= 2 && (
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4">상위 담당자 KPI 지표별 달성률 비교</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="indicator" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                      {radarPersons.map((p, i) => (
                        <Radar
                          key={p.name}
                          name={p.name}
                          dataKey={p.name}
                          stroke={PERSON_COLORS[i % PERSON_COLORS.length]}
                          fill={PERSON_COLORS[i % PERSON_COLORS.length]}
                          fillOpacity={0.15}
                          strokeWidth={2}
                        />
                      ))}
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Tooltip
                        formatter={(value: number, name: string) => [`${value}%`, name]}
                        contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          );
        })()}

        {/* Loading indicator for records */}
        {recordsLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">데이터 로딩 중...</span>
          </div>
        )}

        {/* ═══ TAB: WEEKLY INPUT ═══ */}
        {tab === 'input' && Object.entries(grouped).map(([dept, deptItems]) => {
          const isOpen = expandedDepts.has(dept);
          const col = DEPT_COLORS[dept] || '#6B7280';
          const totalKpis = deptItems.reduce((a, b) => a + b.indicators.length, 0);

          return (
            <div key={dept} className="space-y-2">
              {/* Department Header */}
              <button
                onClick={() => toggleDept(dept)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors hover:bg-muted/50"
                style={{
                  borderColor: isOpen ? `${col}40` : undefined,
                  backgroundColor: isOpen ? `${col}08` : undefined,
                }}
              >
                {isOpen ? <ChevronDown className="w-4 h-4" style={{ color: col }} /> : <ChevronUp className="w-4 h-4 rotate-180" style={{ color: col }} />}
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col }} />
                <span className="font-semibold text-sm">{dept}</span>
                <span className="text-xs text-muted-foreground">{deptItems.length}개 업무</span>
                <Badge variant="outline" className="ml-auto text-xs" style={{ color: col, borderColor: `${col}40` }}>
                  KPI {totalKpis}개
                </Badge>
              </button>

              {/* Department Table */}
              {isOpen && (
                <div className="rounded-xl border border-border overflow-hidden bg-card animate-in fade-in-0 slide-in-from-top-1 duration-200">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="w-[100px] whitespace-nowrap">담당자</TableHead>
                          <TableHead className="w-[180px] whitespace-nowrap">카테고리 / 업무</TableHead>
                          <TableHead className="w-[120px] whitespace-nowrap">KPI 지표</TableHead>
                          <TableHead className="text-center w-[85px] whitespace-nowrap text-purple-600 font-semibold">전월실적</TableHead>
                          <TableHead className="text-center w-[85px] whitespace-nowrap text-indigo-600 font-semibold">금월목표</TableHead>
                          {WEEKS.map(w => (
                            <TableHead key={w} className="text-center w-[80px] whitespace-nowrap">{w}</TableHead>
                          ))}
                          <TableHead className="text-center w-[90px] whitespace-nowrap font-semibold text-amber-600">월 누계</TableHead>
                          <TableHead className="text-center w-[85px] whitespace-nowrap text-emerald-600 font-semibold">달성률</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deptItems.map((item) =>
                          item.indicators.map((ind, ki) => {
                            const cur = getMonthTotal(ind.id, true);
                            const { monthlyTarget, previousActual } = getTarget(ind.id);
                            const achievement = getAchievementRate(ind.id);
                            return (
                              <TableRow key={`${item.id}-${ind.id}`} className="hover:bg-muted/20">
                                {ki === 0 && (
                                  <TableCell rowSpan={item.indicators.length} className="align-top">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 border"
                                        style={{
                                          backgroundColor: item.person === '미정' ? undefined : `${col}15`,
                                          borderColor: item.person === '미정' ? undefined : `${col}40`,
                                          color: item.person === '미정' ? undefined : col,
                                        }}
                                      >
                                        {item.person === '미정' ? '?' : item.person[0]}
                                      </div>
                                      <span className={`text-sm ${item.person === '미정' ? 'text-muted-foreground' : ''}`}>
                                        {item.person}
                                      </span>
                                    </div>
                                  </TableCell>
                                )}
                                {ki === 0 && (
                                  <TableCell rowSpan={item.indicators.length} className="align-top">
                                    <button
                                      onClick={() => handleTaskClick(item)}
                                      className="text-left w-full group/task hover:bg-primary/5 rounded-md p-1 -m-1 transition-colors cursor-pointer"
                                    >
                                      <div className="text-xs font-semibold" style={{ color: col }}>{item.category}</div>
                                      <div className="text-sm font-medium mt-0.5 group-hover/task:text-primary transition-colors">{item.task}</div>
                                      {item.goal && (
                                        <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                                          <Target className="w-2.5 h-2.5" />
                                          {item.goal}
                                        </div>
                                      )}
                                    </button>
                                  </TableCell>
                                )}
                                <TableCell>
                                  <span className="text-xs text-muted-foreground">{ind.name}</span>
                                </TableCell>
                                {/* 전월실적 */}
                                <TableCell className="text-center p-1.5">
                                  <TargetInput
                                    value={previousActual != null ? String(previousActual) : ''}
                                    onChange={(val) => handleTargetChange(ind.id, 'previousActual', val)}
                                    disabled={!canEdit}
                                    placeholder="전월"
                                    className="border-purple-200/50"
                                  />
                                </TableCell>
                                {/* 금월목표 */}
                                <TableCell className="text-center p-1.5">
                                  <TargetInput
                                    value={monthlyTarget != null ? String(monthlyTarget) : ''}
                                    onChange={(val) => handleTargetChange(ind.id, 'monthlyTarget', val)}
                                    disabled={!canEdit}
                                    placeholder="목표"
                                    className="border-indigo-200/50"
                                  />
                                </TableCell>
                                {/* 주간 입력 */}
                                {[1, 2, 3, 4, 5].map(w => (
                                  <TableCell key={w} className="text-center p-1.5">
                                    <WeeklyInput
                                      value={getWeekVal(ind.id, w)?.toString() ?? ''}
                                      onChange={(val) => handleValueChange(ind.id, w, val)}
                                      disabled={!canEdit}
                                    />
                                  </TableCell>
                                ))}
                                {/* 월 누계 */}
                                <TableCell className="text-center">
                                  <span className={`text-sm font-bold ${cur != null ? 'text-amber-600' : 'text-muted-foreground/30'}`}>
                                    {fmt(cur)}
                                  </span>
                                </TableCell>
                                {/* 달성률 */}
                                <TableCell className="text-center">
                                  {achievement != null ? (
                                    <span className={`text-sm font-bold ${
                                      achievement >= 100 ? 'text-emerald-600' : achievement >= 70 ? 'text-amber-600' : 'text-rose-600'
                                    }`}>
                                      {achievement.toFixed(1)}%
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground/30">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* ═══ TAB: MONTHLY SUMMARY ═══ */}
        {tab === 'summary' && (
          <div className="space-y-6 animate-in fade-in-0 duration-200">
            {/* Summary Table */}
            <div className="rounded-xl border border-border overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[40px]">#</TableHead>
                      <TableHead className="w-[100px]">부서</TableHead>
                      <TableHead className="w-[80px]">담당자</TableHead>
                      <TableHead className="w-[160px]">업무</TableHead>
                      <TableHead className="w-[120px]">KPI 지표</TableHead>
                      <TableHead className="text-right w-[80px] text-purple-600 font-semibold">전월실적</TableHead>
                      <TableHead className="text-right w-[80px] text-indigo-600 font-semibold">금월목표</TableHead>
                      <TableHead className="text-right w-[90px]">이번 달</TableHead>
                      <TableHead className="text-center w-[80px] text-emerald-600 font-semibold">달성률</TableHead>
                      <TableHead className="text-center w-[90px]">전월 대비</TableHead>
                      <TableHead className="w-[120px]">추이</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryRows.map((row, i) => {
                      const col = DEPT_COLORS[row.item.department] || '#6B7280';
                      const maxVal = Math.max(...summaryRows.filter(r => r.cur != null).map(r => r.cur!), 1);
                      const barW = row.cur != null ? Math.max(4, (row.cur / maxVal) * 100) : 0;
                      const prevBarW = row.prev != null ? Math.max(4, (row.prev / maxVal) * 100) : 0;

                      return (
                        <TableRow key={i} className="hover:bg-muted/20">
                          <TableCell className="text-muted-foreground text-xs font-semibold">{i + 1}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]" style={{ color: col, borderColor: `${col}30`, backgroundColor: `${col}08` }}>
                              {row.item.department}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium">{row.item.person}</TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleTaskClick(row.item)}
                              className="text-left group/task hover:bg-primary/5 rounded-md p-1 -m-1 transition-colors cursor-pointer"
                            >
                              <div className="text-sm font-medium group-hover/task:text-primary transition-colors">{row.item.task}</div>
                              <div className="text-[10px] text-muted-foreground">{row.item.category}</div>
                            </button>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">{row.indicator.name}</span>
                          </TableCell>
                          <TableCell className="text-right text-sm text-purple-600 font-medium">
                            {fmt(row.prevActual)}
                          </TableCell>
                          <TableCell className="text-right text-sm text-indigo-600 font-medium">
                            {fmt(row.target)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`text-sm font-bold ${row.cur != null ? 'text-amber-600' : 'text-muted-foreground/30'}`}>
                              {fmt(row.cur)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {row.achievement != null ? (
                              <span className={`text-sm font-bold ${
                                row.achievement >= 100 ? 'text-emerald-600' : row.achievement >= 70 ? 'text-amber-600' : 'text-rose-600'
                              }`}>
                                {row.achievement.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {row.cur != null && row.prev != null ? (
                              <DeltaBadge cur={row.cur} prev={row.prev} />
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="relative h-4">
                              <div
                                className="absolute bottom-1 left-0 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${prevBarW}%`, backgroundColor: `${col}20` }}
                              />
                              <div
                                className="absolute bottom-1 left-0 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${barW}%`, backgroundColor: `${col}60` }}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Department Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Object.entries(grouped).map(([dept, deptItems]) => {
                const col = DEPT_COLORS[dept] || '#6B7280';
                let curT = 0, prevT = 0, targetT = 0, kc = 0;
                deptItems.forEach(it => it.indicators.forEach(ind => {
                  kc++;
                  const c = getMonthTotal(ind.id, true);
                  const p = getMonthTotal(ind.id, false);
                  const { monthlyTarget } = getTarget(ind.id);
                  if (c != null) curT += c;
                  if (p != null) prevT += p;
                  if (monthlyTarget != null) targetT += monthlyTarget;
                }));
                const d = getDelta(curT, prevT);
                const deptAchievement = targetT > 0 ? Math.round((curT / targetT) * 100) : null;

                return (
                  <div
                    key={dept}
                    className="rounded-xl border bg-card p-5"
                    style={{ borderLeftWidth: 3, borderLeftColor: col }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col }} />
                      <span className="text-sm font-bold">{dept}</span>
                      <Badge variant="secondary" className="ml-auto text-[10px]">KPI {kc}개</Badge>
                    </div>
                    <div className="flex items-end gap-4 flex-wrap">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">이번 달</div>
                        <div className="text-xl font-bold" style={{ color: col }}>{fmt(curT)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">목표</div>
                        <div className="text-base font-semibold text-indigo-600">{targetT > 0 ? fmt(targetT) : '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">달성률</div>
                        <div className={`text-base font-bold ${
                          deptAchievement != null
                            ? deptAchievement >= 100 ? 'text-emerald-600' : deptAchievement >= 70 ? 'text-amber-600' : 'text-rose-600'
                            : 'text-muted-foreground/30'
                        }`}>
                          {deptAchievement != null ? `${deptAchievement}%` : '—'}
                        </div>
                      </div>
                      <div className="ml-auto">
                        {d.cls === 'up' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <TrendingUp className="w-3.5 h-3.5" /> {d.val}
                          </span>
                        )}
                        {d.cls === 'down' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-bold bg-rose-50 text-rose-600 border border-rose-200">
                            <TrendingDown className="w-3.5 h-3.5" /> {d.val}
                          </span>
                        )}
                        {d.cls === 'flat' && (
                          <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold bg-muted text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && !recordsLoading && (
          <div className="text-center py-20 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">해당 조건의 KPI 데이터가 없습니다</p>
            <p className="text-sm mt-1">필터를 변경하거나 관리자에게 문의하세요</p>
          </div>
        )}
      </div>

      {/* Task Detail Dialog */}
      <KpiTaskDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        item={selectedItem}
        year={year}
        month={month}
        canEdit={!!canEdit}
        deptColor={selectedItem ? (DEPT_COLORS[selectedItem.department] || '#6B7280') : '#6B7280'}
        assignees={assignees}
      />

      {/* Assignee Management Dialog */}
      <KpiAssigneeDialog
        open={isAssigneeOpen}
        onOpenChange={setIsAssigneeOpen}
        departments={departments as string[]}
      />
    </MainLayout>
  );
}
