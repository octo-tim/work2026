/**
 * Meeting Minutes Page - 회의록
 * 회의록 목록 및 관리 페이지
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Plus, ArrowRight, Trash2 } from 'lucide-react';
import { useLocation } from 'wouter';
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

// Types
interface MeetingMinute {
  id: string;
  userId: number;
  meetingDate: Date;
  title: string;
  location: string | null;
  attendees: string | null;
  content: string | null;
  decisions: string | null;
  actionItems: string | null;
  nextMeetingDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function MeetingMinutesPage() {
  const [, setLocation] = useLocation();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // tRPC queries
  const { data: minutes, isLoading, refetch } = trpc.meetingMinutes.list.useQuery();

  // Mutations
  const deleteMutation = trpc.meetingMinutes.delete.useMutation({
    onSuccess: () => {
      toast.success('회의록이 삭제되었습니다.');
      refetch();
      setSelectedIds([]);
    },
    onError: (err) => toast.error('삭제 실패: ' + err.message),
  });

  // Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked && minutes) {
      setSelectedIds(minutes.map(m => m.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(i => i !== id));
    }
  };

  const handleDeleteSelected = async () => {
    for (const id of selectedIds) {
      await deleteMutation.mutateAsync({ id });
    }
    setDeleteDialogOpen(false);
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const parseAttendees = (attendees: string | null): string[] => {
    if (!attendees) return [];
    try {
      return JSON.parse(attendees);
    } catch {
      return attendees.split(',').map(a => a.trim());
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">회의록</h1>
          <Button onClick={() => setLocation('/meetings/new')}>
            <Plus className="w-4 h-4 mr-2" />
            회의록 작성
          </Button>
        </div>

        {/* Content */}
        <div className="bg-card rounded-lg border border-border">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">회의 목록</span>
              <Badge variant="secondary">{minutes?.length || 0}</Badge>
            </div>
            {selectedIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                선택 삭제 ({selectedIds.length})
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !minutes || minutes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <p>등록된 회의록이 없습니다.</p>
              <Button
                variant="link"
                onClick={() => setLocation('/meetings/new')}
                className="mt-2"
              >
                첫 회의록 작성하기
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length === minutes.length && minutes.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-32">날짜</TableHead>
                  <TableHead>주제</TableHead>
                  <TableHead className="w-40">장소</TableHead>
                  <TableHead className="w-40">참석자</TableHead>
                  <TableHead className="w-24">작성자</TableHead>
                  <TableHead className="w-20 text-right">상세</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {minutes.map((minute) => {
                  const attendees = parseAttendees(minute.attendees);
                  return (
                    <TableRow key={minute.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(minute.id)}
                          onCheckedChange={(checked) => handleSelectOne(minute.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatDate(minute.meetingDate)}
                      </TableCell>
                      <TableCell className="font-medium">{minute.title}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {minute.location || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {attendees.length > 0 ? attendees.join(', ') : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">작성자</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => setLocation(`/meetings/${minute.id}`)}
                          className="text-primary"
                        >
                          View
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>회의록 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                선택한 {selectedIds.length}개의 회의록을 삭제하시겠습니까?
                이 작업은 되돌릴 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSelected}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
