/**
 * KPI 담당자 관리 다이얼로그
 * 멤버관리의 등록된 멤버를 기반으로 KPI 담당자를 추가/삭제
 */

import { useState, useCallback, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Loader2,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';

interface KpiAssignee {
  id: number;
  name: string;
  department: string;
  isActive: boolean;
  sortOrder: number;
}

interface KpiAssigneeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: string[];
}

const DEPT_COLORS: Record<string, string> = {
  '마케팅팀': '#06D6A0',
  '고객영업팀': '#FFD166',
  '채널영업팀': '#EF476F',
  '관리팀': '#118AB2',
  '생산팀': '#8338EC',
  '구매': '#FF6B6B',
};

export function KpiAssigneeDialog({
  open,
  onOpenChange,
  departments,
}: KpiAssigneeDialogProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<KpiAssignee | null>(null);
  const [filterDept, setFilterDept] = useState('전체');

  const { data: assignees, isLoading } = trpc.kpi.getAssignees.useQuery(undefined, { enabled: open });
  const { data: activeMembers } = trpc.member.activeList.useQuery(undefined, { enabled: open });
  const createMutation = trpc.kpi.createAssignee.useMutation();
  const deleteMutation = trpc.kpi.deleteAssignee.useMutation();
  const utils = trpc.useUtils();

  // 이미 등록된 담당자 이름 목록
  const existingNames = useMemo(() => {
    return new Set(assignees?.map((a: KpiAssignee) => a.name) ?? []);
  }, [assignees]);

  // 아직 등록되지 않은 멤버 목록
  const availableMembers = useMemo(() => {
    if (!activeMembers) return [];
    return activeMembers.filter(m => {
      const name = m.koreanName || m.name || '';
      return name && !existingNames.has(name);
    });
  }, [activeMembers, existingNames]);

  const handleAdd = useCallback(async () => {
    if (!selectedMemberId) {
      toast.error('멤버를 선택해주세요.');
      return;
    }

    const member = activeMembers?.find(m => String(m.id) === selectedMemberId);
    if (!member) {
      toast.error('선택한 멤버를 찾을 수 없습니다.');
      return;
    }

    const memberName = member.koreanName || member.name || '';
    const memberDept = member.teamName || '미배정';

    try {
      await createMutation.mutateAsync({ name: memberName, department: memberDept });
      utils.kpi.getAssignees.invalidate();
      utils.kpi.getAllAssignees.invalidate();
      setSelectedMemberId('');
      toast.success(`${memberName} 담당자가 추가되었습니다.`);
    } catch (err: any) {
      toast.error('추가 실패: ' + err.message);
    }
  }, [selectedMemberId, activeMembers, createMutation, utils]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteTarget.id });
      utils.kpi.getAssignees.invalidate();
      utils.kpi.getAllAssignees.invalidate();
      toast.success(`${deleteTarget.name} 담당자가 삭제되었습니다.`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error('삭제 실패: ' + err.message);
    }
  }, [deleteTarget, deleteMutation, utils]);

  const filteredAssignees = assignees?.filter((a: KpiAssignee) =>
    filterDept === '전체' || a.department === filterDept
  ) ?? [];

  // 필터에 사용할 부서 목록 (기존 departments + 멤버 기반 팀명)
  const allDepartments = useMemo(() => {
    const deptSet = new Set(departments);
    assignees?.forEach((a: KpiAssignee) => deptSet.add(a.department));
    return Array.from(deptSet);
  }, [departments, assignees]);

  // Group by department
  const grouped: Record<string, KpiAssignee[]> = {};
  filteredAssignees.forEach((a: KpiAssignee) => {
    if (!grouped[a.department]) grouped[a.department] = [];
    grouped[a.department].push(a);
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              담당자 관리
            </DialogTitle>
          </DialogHeader>

          {/* Add New Assignee from Members */}
          <div className="space-y-3 py-2">
            <Label className="flex items-center gap-1.5 text-sm font-semibold">
              <UserPlus className="w-4 h-4 text-emerald-500" />
              멤버에서 담당자 추가
            </Label>
            <div className="flex gap-2">
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="멤버 선택" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      추가 가능한 멤버가 없습니다
                    </div>
                  ) : (
                    availableMembers.map(m => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.koreanName || m.name}
                        {m.teamName && <span className="text-muted-foreground ml-1">({m.teamName})</span>}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAdd}
                disabled={createMutation.isPending || !selectedMemberId}
                size="icon"
                className="shrink-0"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              멤버관리에 등록된 멤버 중 프로필이 완성된 멤버를 선택할 수 있습니다
            </p>
          </div>

          <Separator />

          {/* Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">필터:</span>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="전체">전체 부서</SelectItem>
                {allDepartments.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground ml-auto">
              총 {filteredAssignees.length}명
            </span>
          </div>

          {/* Assignee List */}
          <ScrollArea className="flex-1 min-h-0 max-h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : Object.keys(grouped).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">등록된 담당자가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(grouped).map(([dept, members]) => {
                  const col = DEPT_COLORS[dept] || '#6B7280';
                  return (
                    <div key={dept} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col }} />
                        <span className="text-sm font-semibold">{dept}</span>
                        <Badge variant="secondary" className="text-[10px]">{members.length}명</Badge>
                      </div>
                      <div className="space-y-1 pl-4">
                        {members.map(a => (
                          <div
                            key={a.id}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 group transition-colors"
                          >
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 border"
                              style={{
                                backgroundColor: `${col}15`,
                                borderColor: `${col}40`,
                                color: col,
                              }}
                            >
                              {a.name[0]}
                            </div>
                            <span className="text-sm font-medium flex-1">{a.name}</span>
                            {!a.isActive && (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">비활성</Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(a)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>담당자 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" ({deleteTarget?.department}) 담당자를 삭제하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
