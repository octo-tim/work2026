/**
 * Report Page - 보고서 관리
 * KPI 실적 요약 + 업무별 팝업 내용(전월평가/금월계획/실행)을 기간별로 요약하는 보고서 자동 생성
 */

import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  FileText,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  User,
  Users,
  Target,
  TrendingUp,
  Download,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileCheck,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Presentation,
} from 'lucide-react';

// ===== 타입 정의 =====

// 개인 보고서 새 구조
interface TaskDetail {
  category: string;
  task: string;
  department: string;
  previousEvaluation: string;
  currentPlan: string;
  execution: string;
  indicators: Array<{
    name: string;
    unit: string;
    previousActual: number;
    monthlyTarget: number;
    monthlyTotal: number;
    achievementRate: number;
    weeklyRecords?: Array<{ week: number; value: number }>;
  }>;
}

interface KpiOverview {
  totalTasks: number;
  totalIndicators: number;
  indicatorsWithTarget: number;
  avgAchievementRate: number;
  achieved: number;
  nearTarget: number;
  belowTarget: number;
  categoryAchievements: Array<{ category: string; avgRate: number; count: number }>;
}

// 팀 보고서 새 구조
interface TeamKpiOverview extends KpiOverview {
  totalMembers: number;
  memberAchievements: Array<{ name: string; avgRate: number; taskCount: number; indicatorCount: number }>;
}

interface MemberDetail {
  name: string;
  taskDetails: TaskDetail[];
}

interface ReportContent {
  // 개인 보고서
  kpiOverview?: KpiOverview;
  taskDetails?: TaskDetail[];
  period?: string;
  // 팀 보고서
  teamName?: string;
  memberDetails?: MemberDetail[];
  generatedAt?: string;
  // 이전 형식 호환 (기존 보고서 표시용)
  taskSummary?: any;
  kpiSummary?: any;
  memberSummaries?: any[];
  memberCount?: number;
}

interface Report {
  id: number;
  type: string;
  scope: string;
  targetUserId: number | null;
  targetTeamId: number | null;
  targetDivisionId: number | null;
  year: number;
  month: number;
  week: number | null;
  title: string;
  content: string;
  summary: string | null;
  nextPlan: string | null;
  issues: string | null;
  generatedBy: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function ReportPage() {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // 생성 폼 상태
  const [genScope, setGenScope] = useState<'individual' | 'team'>('individual');
  const [genTargetUserId, setGenTargetUserId] = useState<number | null>(null);
  const [genTargetTeamId, setGenTargetTeamId] = useState<number | null>(null);
  const [genWeek, setGenWeek] = useState<number>(1);

  // 편집 상태
  const [editSummary, setEditSummary] = useState('');
  const [editNextPlan, setEditNextPlan] = useState('');
  const [editIssues, setEditIssues] = useState('');

  // 데이터 조회
  const { data: reports, isLoading, refetch } = trpc.report.list.useQuery({
    type: reportType,
    year,
    month,
  });

  const { data: availableUsers } = trpc.member.activeList.useQuery();
  const { data: availableTeams } = trpc.report.getAvailableTeams.useQuery();

  const generateIndividualMutation = trpc.report.generateIndividual.useMutation({
    onSuccess: (result) => {
      toast.success(`보고서가 생성되었습니다: ${result.title}`);
      refetch();
      setIsGenerateDialogOpen(false);
    },
    onError: (err) => {
      toast.error(`보고서 생성 실패: ${err.message}`);
    },
  });

  const generateTeamMutation = trpc.report.generateTeam.useMutation({
    onSuccess: (result) => {
      toast.success(`보고서가 생성되었습니다: ${result.title}`);
      refetch();
      setIsGenerateDialogOpen(false);
    },
    onError: (err) => {
      toast.error(`보고서 생성 실패: ${err.message}`);
    },
  });

  const updateMutation = trpc.report.update.useMutation({
    onSuccess: () => {
      toast.success('보고서가 수정되었습니다');
      refetch();
      setIsEditMode(false);
    },
    onError: (err) => {
      toast.error(`수정 실패: ${err.message}`);
    },
  });

  const deleteMutation = trpc.report.delete.useMutation({
    onSuccess: () => {
      toast.success('보고서가 삭제되었습니다');
      refetch();
      setIsDetailDialogOpen(false);
      setSelectedReport(null);
    },
    onError: (err) => {
      toast.error(`삭제 실패: ${err.message}`);
    },
  });

  // 월 이동
  const handlePrevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const handleNextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // 보고서 생성
  const handleGenerate = () => {
    if (genScope === 'individual' && genTargetUserId) {
      generateIndividualMutation.mutate({
        type: reportType,
        targetUserId: genTargetUserId,
        year,
        month,
        week: reportType === 'weekly' ? genWeek : undefined,
      });
    } else if (genScope === 'team' && genTargetTeamId) {
      generateTeamMutation.mutate({
        type: reportType,
        targetTeamId: genTargetTeamId,
        year,
        month,
        week: reportType === 'weekly' ? genWeek : undefined,
      });
    } else {
      toast.error('대상을 선택해주세요');
    }
  };

  // 보고서 상세 보기
  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setEditSummary(report.summary || '');
    setEditNextPlan(report.nextPlan || '');
    setEditIssues(report.issues || '');
    setIsEditMode(false);
    setIsDetailDialogOpen(true);
  };

  // 보고서 수정 저장
  const handleSaveEdit = () => {
    if (!selectedReport) return;
    updateMutation.mutate({
      id: selectedReport.id,
      summary: editSummary,
      nextPlan: editNextPlan,
      issues: editIssues,
    });
  };

  // 보고서 확정
  const handleFinalize = () => {
    if (!selectedReport) return;
    updateMutation.mutate({
      id: selectedReport.id,
      status: 'finalized',
    });
  };

  // 보고서 내용 파싱
  const parseContent = (contentStr: string): ReportContent => {
    try {
      return JSON.parse(contentStr);
    } catch {
      return {};
    }
  };

  // CSV 내보내기
  const handleExportCSV = (report: Report) => {
    const content = parseContent(report.content);
    let csv = '\uFEFF'; // BOM for Korean
    csv += `보고서: ${report.title}\n`;
    csv += `기간: ${content.period || ''}\n`;
    csv += `생성일: ${new Date(report.createdAt).toLocaleDateString('ko-KR')}\n`;
    csv += `상태: ${report.status === 'finalized' ? '확정' : '초안'}\n\n`;

    // KPI 실적 요약
    if (content.kpiOverview) {
      csv += '=== KPI 실적 요약 ===\n';
      csv += `업무 수,KPI 지표 수,목표 설정 지표,평균 달성률,달성,근접,미달\n`;
      csv += `${content.kpiOverview.totalTasks},${content.kpiOverview.totalIndicators},${content.kpiOverview.indicatorsWithTarget},${content.kpiOverview.avgAchievementRate}%,${content.kpiOverview.achieved},${content.kpiOverview.nearTarget},${content.kpiOverview.belowTarget}\n\n`;
    }

    // 업무별 상세 (개인 보고서)
    if (content.taskDetails && content.taskDetails.length > 0) {
      csv += '=== 업무별 상세 ===\n';
      csv += '카테고리,업무명,전월평가,금월계획,실행,지표명,단위,전월실적,목표,실적,달성률\n';
      content.taskDetails.forEach(task => {
        if (task.indicators.length > 0) {
          task.indicators.forEach(ind => {
            csv += `"${task.category}","${task.task}","${task.previousEvaluation}","${task.currentPlan}","${task.execution}","${ind.name}","${ind.unit}",${ind.previousActual},${ind.monthlyTarget},${ind.monthlyTotal},${ind.achievementRate}%\n`;
          });
        } else {
          csv += `"${task.category}","${task.task}","${task.previousEvaluation}","${task.currentPlan}","${task.execution}","","","","","",""\n`;
        }
      });
      csv += '\n';
    }

    // 팀원별 상세 (팀 보고서)
    if (content.memberDetails && content.memberDetails.length > 0) {
      csv += '=== 팀원별 업무 상세 ===\n';
      content.memberDetails.forEach(member => {
        csv += `\n[${member.name}]\n`;
        csv += '카테고리,업무명,전월평가,금월계획,실행,지표명,단위,목표,실적,달성률\n';
        member.taskDetails.forEach(task => {
          if (task.indicators.length > 0) {
            task.indicators.forEach(ind => {
              csv += `"${task.category}","${task.task}","${task.previousEvaluation}","${task.currentPlan}","${task.execution}","${ind.name}","${ind.unit}",${ind.monthlyTarget},${ind.monthlyTotal},${ind.achievementRate}%\n`;
            });
          } else {
            csv += `"${task.category}","${task.task}","${task.previousEvaluation}","${task.currentPlan}","${task.execution}","","","","",""\n`;
          }
        });
      });
      csv += '\n';
    }

    if (report.summary) csv += `\n=== 요약 ===\n${report.summary}\n`;
    if (report.nextPlan) csv += `\n=== 차기 계획 ===\n${report.nextPlan}\n`;
    if (report.issues) csv += `\n=== 이슈 ===\n${report.issues}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.replace(/[\[\]]/g, '')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // PPT 다운로드
  const [pptDownloading, setPptDownloading] = useState<number | null>(null);
  const handleDownloadPPT = async (report: Report) => {
    try {
      setPptDownloading(report.id);
      const response = await fetch(`/api/report/${report.id}/ppt`, {
        credentials: 'include',
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'PPT 생성 실패' }));
        throw new Error(err.error || 'PPT 생성 실패');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title.replace(/[\[\]\/:*?"<>|]/g, '_')}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PPT 파일이 다운로드되었습니다');
    } catch (err: any) {
      toast.error(err.message || 'PPT 다운로드 실패');
    } finally {
      setPptDownloading(null);
    }
  };

  // 보고서 목록을 범위별로 그룹핑
  const groupedReports = useMemo(() => {
    if (!reports) return { individual: [], team: [] };
    return {
      individual: reports.filter(r => r.scope === 'individual'),
      team: reports.filter(r => r.scope === 'team'),
    };
  }, [reports]);

  const isGenerating = generateIndividualMutation.isPending || generateTeamMutation.isPending;

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-6 h-6 text-primary" />
                  보고서 관리
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  KPI 실적 요약과 업무별 상세 내용을 기간별로 자동 생성합니다
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* 월 네비게이션 */}
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrevMonth}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-semibold min-w-[100px] text-center">
                    {year}년 {month}월
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNextMonth}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* 보고서 유형 선택 */}
                <div className="flex bg-muted/50 rounded-lg p-0.5">
                  <button
                    onClick={() => setReportType('weekly')}
                    className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                      reportType === 'weekly'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    주간
                  </button>
                  <button
                    onClick={() => setReportType('monthly')}
                    className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                      reportType === 'monthly'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    월간
                  </button>
                </div>

                {/* 보고서 생성 버튼 */}
                <Button onClick={() => setIsGenerateDialogOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  보고서 생성
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          {/* 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">전체 보고서</p>
                  <p className="text-xl font-bold">{reports?.length || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">개인 보고서</p>
                  <p className="text-xl font-bold">{groupedReports.individual.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">팀 보고서</p>
                  <p className="text-xl font-bold">{groupedReports.team.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">확정 보고서</p>
                  <p className="text-xl font-bold">
                    {reports?.filter(r => r.status === 'finalized').length || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 로딩 */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* 빈 상태 */}
          {!isLoading && (!reports || reports.length === 0) && (
            <Card className="py-16">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {reportType === 'weekly' ? '주간' : '월간'} 보고서가 없습니다
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {year}년 {month}월의 보고서를 생성해보세요
                </p>
                <Button onClick={() => setIsGenerateDialogOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  보고서 생성
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 개인 보고서 섹션 */}
          {groupedReports.individual.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                개인 보고서
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedReports.individual.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onClick={() => handleViewReport(report)}
                    onExport={() => handleExportCSV(report)}
                    onDownloadPPT={() => handleDownloadPPT(report)}
                    isPptDownloading={pptDownloading === report.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 팀 보고서 섹션 */}
          {groupedReports.team.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500" />
                팀 보고서
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedReports.team.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onClick={() => handleViewReport(report)}
                    onExport={() => handleExportCSV(report)}
                    onDownloadPPT={() => handleDownloadPPT(report)}
                    isPptDownloading={pptDownloading === report.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 보고서 생성 다이얼로그 */}
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                보고서 생성
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* 범위 선택 */}
              <div className="space-y-2">
                <Label>보고서 범위</Label>
                <Select value={genScope} onValueChange={(v) => setGenScope(v as 'individual' | 'team')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">개인 보고서</SelectItem>
                    <SelectItem value="team">팀 보고서</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 대상 선택 */}
              {genScope === 'individual' && (
                <div className="space-y-2">
                  <Label>대상 직원</Label>
                  <Select
                    value={genTargetUserId?.toString() || ''}
                    onValueChange={(v) => setGenTargetUserId(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="직원 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers?.map((u: any) => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.koreanName || u.name} {u.koreanName && u.name ? `(${u.name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {genScope === 'team' && (
                <div className="space-y-2">
                  <Label>대상 팀</Label>
                  <Select
                    value={genTargetTeamId?.toString() || ''}
                    onValueChange={(v) => setGenTargetTeamId(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="팀 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTeams?.map((t: any) => (
                        <SelectItem key={t.id} value={t.id.toString()}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 주차 선택 (주간 보고서일 때만) */}
              {reportType === 'weekly' && (
                <div className="space-y-2">
                  <Label>주차</Label>
                  <Select value={genWeek.toString()} onValueChange={(v) => setGenWeek(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(w => (
                        <SelectItem key={w} value={w.toString()}>{w}주차</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">자동 집계 항목:</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>KPI 실적 요약 (달성률, 달성/근접/미달 분류)</li>
                  <li>업무별 전월평가 / 금월계획 / 실행 내용</li>
                  <li>KPI 지표별 목표 대비 실적</li>
                  {genScope === 'team' && <li>팀원별 업무 상세 및 달성률</li>}
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2">
                {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                생성
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 보고서 상세 다이얼로그 */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            {selectedReport && (
              <ReportDetail
                report={selectedReport}
                content={parseContent(selectedReport.content)}
                isEditMode={isEditMode}
                editSummary={editSummary}
                editNextPlan={editNextPlan}
                editIssues={editIssues}
                onEditSummary={setEditSummary}
                onEditNextPlan={setEditNextPlan}
                onEditIssues={setEditIssues}
                onToggleEdit={() => setIsEditMode(!isEditMode)}
                onSave={handleSaveEdit}
                onFinalize={handleFinalize}
                onDelete={() => deleteMutation.mutate({ id: selectedReport.id })}
                onExport={() => handleExportCSV(selectedReport)}
                onDownloadPPT={() => handleDownloadPPT(selectedReport)}
                isPptDownloading={pptDownloading === selectedReport.id}
                isSaving={updateMutation.isPending}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

// ===== 보고서 카드 컴포넌트 =====
function ReportCard({ report, onClick, onExport, onDownloadPPT, isPptDownloading }: { report: Report; onClick: () => void; onExport: () => void; onDownloadPPT: () => void; isPptDownloading: boolean }) {
  const content = (() => {
    try { return JSON.parse(report.content); } catch { return {}; }
  })();

  const isFinalized = report.status === 'finalized';
  const periodLabel = report.week ? `${report.week}주차` : '월간';
  const kpiOverview = content.kpiOverview;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30 group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={isFinalized ? 'default' : 'secondary'} className="text-xs">
                {isFinalized ? '확정' : '초안'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {periodLabel}
              </Badge>
            </div>
            <h3 className="font-semibold text-sm text-foreground truncate mt-2">
              {report.title}
            </h3>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary hover:text-primary/80"
              title="PPT 다운로드"
              disabled={isPptDownloading}
              onClick={(e) => { e.stopPropagation(); onDownloadPPT(); }}
            >
              {isPptDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Presentation className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="CSV 다운로드"
              onClick={(e) => { e.stopPropagation(); onExport(); }}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* KPI 요약 */}
        {kpiOverview && (
          <div className="space-y-1.5 mb-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="w-3 h-3" />
              업무 {kpiOverview.totalTasks || 0}건 / KPI {kpiOverview.totalIndicators || 0}개
            </div>
            {kpiOverview.avgAchievementRate !== undefined && kpiOverview.indicatorsWithTarget > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <TrendingUp className="w-3 h-3 text-primary" />
                <span className={`font-medium ${
                  kpiOverview.avgAchievementRate >= 100 ? 'text-green-600' :
                  kpiOverview.avgAchievementRate >= 70 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  평균 달성률 {kpiOverview.avgAchievementRate}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* 팀 보고서: 팀원 수 */}
        {content.memberDetails && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Users className="w-3 h-3" />
            팀원 {kpiOverview?.totalMembers || content.memberDetails.length}명
          </div>
        )}

        <Separator className="my-2" />
        <p className="text-xs text-muted-foreground">
          {new Date(report.createdAt).toLocaleDateString('ko-KR', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </CardContent>
    </Card>
  );
}

// ===== 업무 상세 카드 (접이식) =====
function TaskDetailCard({ task, index }: { task: TaskDetail; index: number }) {
  const [isExpanded, setIsExpanded] = useState(index < 3); // 처음 3개는 펼침

  const hasContent = task.previousEvaluation || task.currentPlan || task.execution;
  const hasIndicators = task.indicators.length > 0;

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full text-left px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className="text-xs shrink-0">{task.category}</Badge>
          <span className="text-sm font-medium truncate">{task.task}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasIndicators && (
            <span className="text-xs text-muted-foreground">
              {task.indicators.length}개 지표
            </span>
          )}
          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {isExpanded && (
        <CardContent className="p-4 space-y-3">
          {/* 전월평가 / 금월계획 / 실행 */}
          {hasContent && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-xs font-semibold text-slate-600 mb-1.5">전월평가</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{task.previousEvaluation || '-'}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-xs font-semibold text-blue-600 mb-1.5">금월계획</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{task.currentPlan || '-'}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <p className="text-xs font-semibold text-green-600 mb-1.5">실행</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{task.execution || '-'}</p>
              </div>
            </div>
          )}

          {/* KPI 지표 테이블 */}
          {hasIndicators && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">지표</th>
                    <th className="text-right px-3 py-2 font-medium w-14">단위</th>
                    <th className="text-right px-3 py-2 font-medium w-16">전월</th>
                    <th className="text-right px-3 py-2 font-medium w-16">목표</th>
                    <th className="text-right px-3 py-2 font-medium w-16">실적</th>
                    <th className="text-right px-3 py-2 font-medium w-16">달성률</th>
                  </tr>
                </thead>
                <tbody>
                  {task.indicators.map((ind, j) => (
                    <tr key={j} className="border-t">
                      <td className="px-3 py-2 font-medium">{ind.name}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{ind.unit}</td>
                      <td className="px-3 py-2 text-right">{ind.previousActual?.toLocaleString() || '-'}</td>
                      <td className="px-3 py-2 text-right">{ind.monthlyTarget?.toLocaleString() || '-'}</td>
                      <td className="px-3 py-2 text-right font-medium">{ind.monthlyTotal?.toLocaleString() || '0'}</td>
                      <td className="px-3 py-2 text-right">
                        {ind.monthlyTarget > 0 ? (
                          <span className={`font-bold ${
                            ind.achievementRate >= 100 ? 'text-green-600' :
                            ind.achievementRate >= 70 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {ind.achievementRate}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ===== 보고서 상세 컴포넌트 =====
function ReportDetail({
  report,
  content,
  isEditMode,
  editSummary,
  editNextPlan,
  editIssues,
  onEditSummary,
  onEditNextPlan,
  onEditIssues,
  onToggleEdit,
  onSave,
  onFinalize,
  onDelete,
  onExport,
  onDownloadPPT,
  isPptDownloading,
  isSaving,
}: {
  report: Report;
  content: ReportContent;
  isEditMode: boolean;
  editSummary: string;
  editNextPlan: string;
  editIssues: string;
  onEditSummary: (v: string) => void;
  onEditNextPlan: (v: string) => void;
  onEditIssues: (v: string) => void;
  onToggleEdit: () => void;
  onSave: () => void;
  onFinalize: () => void;
  onDelete: () => void;
  onExport: () => void;
  onDownloadPPT: () => void;
  isPptDownloading: boolean;
  isSaving: boolean;
}) {
  const isFinalized = report.status === 'finalized';
  const isTeamReport = report.scope === 'team';

  return (
    <>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle className="text-lg">{report.title}</DialogTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isFinalized ? 'default' : 'secondary'}>
              {isFinalized ? '확정' : '초안'}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {content.period && <span className="mr-3">기간: {content.period}</span>}
          생성일: {new Date(report.createdAt).toLocaleDateString('ko-KR', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* ===== KPI 실적 요약 ===== */}
        {content.kpiOverview && (
          <section>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              KPI 실적 요약
            </h3>
            
            {/* 요약 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-3 text-center border border-indigo-200">
                <p className="text-2xl font-bold text-indigo-700">{content.kpiOverview.avgAchievementRate}%</p>
                <p className="text-xs text-indigo-600 font-medium">평균 달성률</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 text-center border border-green-200">
                <p className="text-2xl font-bold text-green-700">{content.kpiOverview.achieved}</p>
                <p className="text-xs text-green-600 font-medium">달성 (100%+)</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-3 text-center border border-amber-200">
                <p className="text-2xl font-bold text-amber-700">{content.kpiOverview.nearTarget}</p>
                <p className="text-xs text-amber-600 font-medium">근접 (70~99%)</p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 text-center border border-red-200">
                <p className="text-2xl font-bold text-red-700">{content.kpiOverview.belowTarget}</p>
                <p className="text-xs text-red-600 font-medium">미달 (70% 미만)</p>
              </div>
            </div>

            {/* 카테고리별 달성률 */}
            {content.kpiOverview.categoryAchievements && content.kpiOverview.categoryAchievements.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">카테고리별 달성률</p>
                <div className="space-y-2">
                  {content.kpiOverview.categoryAchievements.map((cat, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-foreground w-24 truncate font-medium">{cat.category}</span>
                      <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all flex items-center justify-end pr-2 ${
                            cat.avgRate >= 100 ? 'bg-green-500' :
                            cat.avgRate >= 70 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(cat.avgRate, 100)}%` }}
                        >
                          <span className="text-[10px] font-bold text-white">{cat.avgRate}%</span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">{cat.count}개</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 팀 보고서: 팀원별 달성률 */}
            {isTeamReport && (content.kpiOverview as TeamKpiOverview).memberAchievements && (content.kpiOverview as TeamKpiOverview).memberAchievements.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">팀원별 KPI 달성률</p>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">팀원</th>
                        <th className="text-center px-3 py-2 font-medium w-16">업무</th>
                        <th className="text-center px-3 py-2 font-medium w-16">지표</th>
                        <th className="text-right px-3 py-2 font-medium w-24">평균 달성률</th>
                        <th className="text-center px-3 py-2 font-medium w-32">달성 현황</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(content.kpiOverview as TeamKpiOverview).memberAchievements.map((member, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2 font-medium">{member.name}</td>
                          <td className="px-3 py-2 text-center text-muted-foreground">{member.taskCount}건</td>
                          <td className="px-3 py-2 text-center text-muted-foreground">{member.indicatorCount}개</td>
                          <td className="px-3 py-2 text-right">
                            <span className={`font-bold ${
                              member.avgRate >= 100 ? 'text-green-600' :
                              member.avgRate >= 70 ? 'text-amber-600' : 'text-red-600'
                            }`}>
                              {member.avgRate}%
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  member.avgRate >= 100 ? 'bg-green-500' :
                                  member.avgRate >= 70 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(member.avgRate, 100)}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 요약 수치 */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>업무: <strong className="text-foreground">{content.kpiOverview.totalTasks || 0}</strong>건</span>
              <span>KPI 지표: <strong className="text-foreground">{content.kpiOverview.totalIndicators || 0}</strong>개</span>
              <span>목표 설정: <strong className="text-foreground">{content.kpiOverview.indicatorsWithTarget || 0}</strong>개</span>
              {isTeamReport && (content.kpiOverview as TeamKpiOverview).totalMembers && (
                <span>팀원: <strong className="text-foreground">{(content.kpiOverview as TeamKpiOverview).totalMembers}</strong>명</span>
              )}
            </div>
          </section>
        )}

        <Separator />

        {/* ===== 개인 보고서: 업무별 상세 ===== */}
        {!isTeamReport && content.taskDetails && content.taskDetails.length > 0 && (
          <section>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              업무별 상세 ({content.taskDetails.length}건)
            </h3>
            <div className="space-y-3">
              {content.taskDetails.map((task, i) => (
                <TaskDetailCard key={i} task={task} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* ===== 팀 보고서: 팀원별 업무 상세 ===== */}
        {isTeamReport && content.memberDetails && content.memberDetails.length > 0 && (
          <section>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              팀원별 업무 상세
            </h3>
            <div className="space-y-6">
              {content.memberDetails.map((member, i) => (
                <div key={i}>
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                    <User className="w-4 h-4" />
                    {member.name}
                    <Badge variant="outline" className="text-xs ml-auto">{member.taskDetails.length}건</Badge>
                  </h4>
                  {member.taskDetails.length > 0 ? (
                    <div className="space-y-2 ml-2">
                      {member.taskDetails.map((task, j) => (
                        <TaskDetailCard key={j} task={task} index={j} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground ml-2 py-2">배정된 업무가 없습니다</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <Separator />

        {/* ===== 요약/계획/이슈 영역 ===== */}
        <section className="space-y-4">
          <div>
            <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              요약 코멘트
            </Label>
            {isEditMode ? (
              <Textarea
                value={editSummary}
                onChange={(e) => onEditSummary(e.target.value)}
                placeholder="보고서 요약을 입력하세요..."
                rows={3}
              />
            ) : (
              <div className="bg-muted/30 rounded-lg p-3 text-sm min-h-[60px]">
                {report.summary || <span className="text-muted-foreground italic">요약이 없습니다</span>}
              </div>
            )}
          </div>

          <div>
            <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              차기 계획
            </Label>
            {isEditMode ? (
              <Textarea
                value={editNextPlan}
                onChange={(e) => onEditNextPlan(e.target.value)}
                placeholder="차주/차월 계획을 입력하세요..."
                rows={3}
              />
            ) : (
              <div className="bg-muted/30 rounded-lg p-3 text-sm min-h-[60px]">
                {report.nextPlan || <span className="text-muted-foreground italic">계획이 없습니다</span>}
              </div>
            )}
          </div>

          <div>
            <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              이슈 및 건의사항
            </Label>
            {isEditMode ? (
              <Textarea
                value={editIssues}
                onChange={(e) => onEditIssues(e.target.value)}
                placeholder="이슈 및 건의사항을 입력하세요..."
                rows={3}
              />
            ) : (
              <div className="bg-muted/30 rounded-lg p-3 text-sm min-h-[60px]">
                {report.issues || <span className="text-muted-foreground italic">이슈가 없습니다</span>}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 하단 액션 버튼 */}
      <DialogFooter className="flex-row justify-between">
        <div className="flex gap-2">
          <Button variant="destructive" size="sm" onClick={onDelete} className="gap-1">
            <Trash2 className="w-3.5 h-3.5" />
            삭제
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadPPT}
            disabled={isPptDownloading}
            className="gap-1"
          >
            {isPptDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Presentation className="w-3.5 h-3.5" />}
            PPT
          </Button>
          <Button variant="outline" size="sm" onClick={onExport} className="gap-1">
            <Download className="w-3.5 h-3.5" />
            CSV
          </Button>
          {isEditMode ? (
            <>
              <Button variant="outline" size="sm" onClick={onToggleEdit}>취소</Button>
              <Button size="sm" onClick={onSave} disabled={isSaving} className="gap-1">
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                저장
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={onToggleEdit} className="gap-1">
                <Edit3 className="w-3.5 h-3.5" />
                편집
              </Button>
              {!isFinalized && (
                <Button size="sm" onClick={onFinalize} className="gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  확정
                </Button>
              )}
            </>
          )}
        </div>
      </DialogFooter>
    </>
  );
}
