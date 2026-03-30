/**
 * KPI 업무 상세 팝업 - Task Detail Dialog
 * 업무 클릭 시 전월평가 / 금월계획 / 실행 3가지 항목 입력
 * 담당자 배정 기능 포함
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Save,
  Target,
  ClipboardCheck,
  CalendarClock,
  Zap,
  User,
} from 'lucide-react';

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

interface KpiAssignee {
  id: number;
  name: string;
  department: string;
  isActive: boolean;
}

interface KpiTaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: KpiItem | null;
  year: number;
  month: number;
  canEdit: boolean;
  deptColor: string;
  assignees: KpiAssignee[];
}

export function KpiTaskDetailDialog({
  open,
  onOpenChange,
  item,
  year,
  month,
  canEdit,
  deptColor,
  assignees,
}: KpiTaskDetailDialogProps) {
  const [previousEvaluation, setPreviousEvaluation] = useState('');
  const [currentPlan, setCurrentPlan] = useState('');
  const [execution, setExecution] = useState('');
  const [selectedPerson, setSelectedPerson] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch existing detail - all hooks MUST be called before any conditional return
  const { data: detail, isLoading: detailLoading } = trpc.kpi.getItemDetail.useQuery(
    { kpiItemId: item?.id ?? 0, year, month },
    { enabled: open && item != null }
  );

  const saveDetailMutation = trpc.kpi.saveItemDetail.useMutation();
  const assignPersonMutation = trpc.kpi.assignPerson.useMutation();
  const utils = trpc.useUtils();

  // Also fetch active members for assignee options
  const { data: activeMembers } = trpc.member.activeList.useQuery();

  // Populate form when detail loads
  useEffect(() => {
    if (detail) {
      setPreviousEvaluation(detail.previousEvaluation ?? '');
      setCurrentPlan(detail.currentPlan ?? '');
      setExecution(detail.execution ?? '');
    } else if (open) {
      setPreviousEvaluation('');
      setCurrentPlan('');
      setExecution('');
    }
  }, [detail, open]);

  // Set selected person when item changes
  useEffect(() => {
    if (item) {
      setSelectedPerson(item.person);
    }
  }, [item]);

  // Filter assignees by department - memoize with stable deps
  const deptAssignees = useMemo(() => {
    if (!item) return [];
    return assignees.filter(a => a.department === item.department && a.isActive);
  }, [assignees, item]);

  // Combine: show KPI assignees first, then active members not already in assignees
  const allAssigneeOptions = useMemo(() => {
    const options: Array<{ id: string; name: string; source: string }> = deptAssignees.map(a => ({ id: `kpi-${a.id}`, name: a.name, source: 'kpi' }));
    const existingNames = new Set(options.map(o => o.name));
    if (activeMembers) {
      activeMembers.forEach(m => {
        const name = m.koreanName || m.name || '';
        if (name && !existingNames.has(name)) {
          options.push({ id: `member-${m.id}`, name, source: 'member' });
          existingNames.add(name);
        }
      });
    }
    return options;
  }, [deptAssignees, activeMembers]);

  const handleSave = useCallback(async () => {
    if (!item) return;
    setIsSaving(true);
    try {
      // Save detail
      await saveDetailMutation.mutateAsync({
        kpiItemId: item.id,
        year,
        month,
        previousEvaluation: previousEvaluation || null,
        currentPlan: currentPlan || null,
        execution: execution || null,
      });

      // Save person assignment if changed
      if (selectedPerson !== item.person && selectedPerson) {
        await assignPersonMutation.mutateAsync({
          kpiItemId: item.id,
          person: selectedPerson,
        });
        utils.kpi.getItems.invalidate();
      }

      utils.kpi.getItemDetail.invalidate({ kpiItemId: item.id, year, month });
      utils.kpi.getItemDetailsByMonth.invalidate({ year, month });
      toast.success('저장되었습니다.');
    } catch (err: any) {
      toast.error('저장 실패: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  }, [item, year, month, previousEvaluation, currentPlan, execution, selectedPerson, saveDetailMutation, assignPersonMutation, utils]);

  // Conditional return AFTER all hooks
  if (!item) return null;

  const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const prevMonthLabel = month > 1 ? MONTHS[month - 2] : `${year - 1}년 12월`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div
              className="w-2 h-8 rounded-full shrink-0"
              style={{ backgroundColor: deptColor }}
            />
            <div className="flex flex-col">
              <span className="text-base font-bold">{item.task}</span>
              <span className="text-xs text-muted-foreground font-normal">
                {item.department} · {item.category}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Item Info */}
        <div className="flex flex-wrap items-center gap-3 py-2">
          <Badge variant="outline" style={{ color: deptColor, borderColor: `${deptColor}40` }}>
            {item.department}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {item.category}
          </Badge>
          {item.goal && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Target className="w-3 h-3" />
              {item.goal}
            </div>
          )}
          <div className="text-xs text-muted-foreground ml-auto">
            {year}년 {MONTHS[month - 1]}
          </div>
        </div>

        {/* KPI Indicators */}
        {item.indicators.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2">
            {item.indicators.map(ind => (
              <Badge key={ind.id} variant="outline" className="text-[10px] bg-muted/30">
                {ind.name} {ind.unit ? `(${ind.unit})` : ''}
              </Badge>
            ))}
          </div>
        )}

        {/* Assignee Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-sm font-semibold">
            <User className="w-4 h-4 text-blue-500" />
            담당자 배정
          </Label>
          <Select
            value={selectedPerson}
            onValueChange={setSelectedPerson}
            disabled={!canEdit}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="담당자 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="미정">미정</SelectItem>
              {allAssigneeOptions.map(a => (
                <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
              ))}
              {/* Also show current person if not in options list */}
              {item.person && item.person !== '미정' && !allAssigneeOptions.some(a => a.name === item.person) && (
                <SelectItem value={item.person}>{item.person} (현재)</SelectItem>
              )}
            </SelectContent>
          </Select>
          {selectedPerson !== item.person && selectedPerson && (
            <p className="text-xs text-amber-600">
              담당자가 "{item.person}" → "{selectedPerson}"(으)로 변경됩니다.
            </p>
          )}
        </div>

        <Separator />

        {/* Loading */}
        {detailLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">데이터 로딩 중...</span>
          </div>
        )}

        {/* Form Fields */}
        {!detailLoading && (
          <div className="space-y-5">
            {/* 전월평가 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-semibold">
                <ClipboardCheck className="w-4 h-4 text-purple-500" />
                전월평가
                <span className="text-xs font-normal text-muted-foreground">({prevMonthLabel} 실적 평가)</span>
              </Label>
              <Textarea
                value={previousEvaluation}
                onChange={(e) => setPreviousEvaluation(e.target.value)}
                disabled={!canEdit}
                placeholder={`${prevMonthLabel} 업무 실적에 대한 평가를 입력하세요...`}
                className="min-h-[100px] resize-y"
              />
            </div>

            {/* 금월계획 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-semibold">
                <CalendarClock className="w-4 h-4 text-indigo-500" />
                금월계획
                <span className="text-xs font-normal text-muted-foreground">({MONTHS[month - 1]} 업무 계획)</span>
              </Label>
              <Textarea
                value={currentPlan}
                onChange={(e) => setCurrentPlan(e.target.value)}
                disabled={!canEdit}
                placeholder={`${MONTHS[month - 1]} 업무 계획을 입력하세요...`}
                className="min-h-[100px] resize-y"
              />
            </div>

            {/* 실행 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-semibold">
                <Zap className="w-4 h-4 text-amber-500" />
                실행
                <span className="text-xs font-normal text-muted-foreground">(실행 내용 및 진행 상황)</span>
              </Label>
              <Textarea
                value={execution}
                onChange={(e) => setExecution(e.target.value)}
                disabled={!canEdit}
                placeholder="실행 내용 및 진행 상황을 입력하세요..."
                className="min-h-[100px] resize-y"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        {canEdit && (
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-1.5">
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              저장
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
