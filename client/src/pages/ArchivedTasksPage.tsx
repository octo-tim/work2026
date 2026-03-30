/**
 * Archived Tasks Page - Task Manager
 * 아카이브된 업무 목록 조회 및 복원/삭제 기능
 */

import { useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Archive, 
  RotateCcw, 
  Trash2, 
  Search, 
  ArrowLeft,
  Calendar,
  User,
  FileText,
  Clock
} from 'lucide-react';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const STATUS_LABELS: Record<string, string> = {
  'pending': '대기',
  'in-progress': '진행중',
  'completed': '완료'
};

const STATUS_COLORS: Record<string, string> = {
  'pending': 'bg-amber-100 text-amber-800',
  'in-progress': 'bg-blue-100 text-blue-800',
  'completed': 'bg-emerald-100 text-emerald-800'
};

export default function ArchivedTasksPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Queries
  const { data: archivedTasks, isLoading, refetch } = isAdmin
    ? trpc.task.listAllArchived.useQuery()
    : trpc.task.listArchived.useQuery();

  const { data: progressLogs, isLoading: logsLoading } = trpc.task.getArchivedProgressLogs.useQuery(
    { archivedTaskId: selectedTaskId! },
    { enabled: !!selectedTaskId && isDetailDialogOpen }
  );

  // Mutations
  const restoreMutation = trpc.task.restore.useMutation({
    onSuccess: () => {
      toast.success('업무가 복원되었습니다.');
      refetch();
      setIsRestoreDialogOpen(false);
      setSelectedTaskId(null);
    },
    onError: () => {
      toast.error('업무 복원에 실패했습니다.');
    }
  });

  const deleteMutation = trpc.task.deleteArchived.useMutation({
    onSuccess: () => {
      toast.success('업무가 영구 삭제되었습니다.');
      refetch();
      setIsDeleteDialogOpen(false);
      setSelectedTaskId(null);
    },
    onError: () => {
      toast.error('업무 삭제에 실패했습니다.');
    }
  });

  // Filter tasks
  const filteredTasks = (archivedTasks ?? []).filter(task => {
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        task.title.toLowerCase().includes(query) ||
        (task.details ?? '').toLowerCase().includes(query) ||
        (task.assignee ?? '').toLowerCase().includes(query) ||
        (task.department ?? '').toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Handlers
  const handleRestoreClick = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setIsRestoreDialogOpen(true);
  }, []);

  const handleDeleteClick = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDetailClick = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setIsDetailDialogOpen(true);
  }, []);

  const handleRestoreConfirm = useCallback(() => {
    if (selectedTaskId) {
      restoreMutation.mutate({ archivedTaskId: selectedTaskId });
    }
  }, [selectedTaskId, restoreMutation]);

  const handleDeleteConfirm = useCallback(() => {
    if (selectedTaskId) {
      deleteMutation.mutate({ archivedTaskId: selectedTaskId });
    }
  }, [selectedTaskId, deleteMutation]);

  const selectedTask = archivedTasks?.find(t => t.id === selectedTaskId);

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-56px)] bg-background">
        {/* Header */}
        <header className="sticky top-14 z-10 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="container py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/tasks">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    업무 목록
                  </Button>
                </Link>
                <div>
                  <h1 className="text-xl font-semibold flex items-center gap-2">
                    <Archive className="h-5 w-5" />
                    아카이브
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {isAdmin ? '전체 아카이브된 업무' : '내 아카이브된 업무'} · {filteredTasks.length}개
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="container py-4 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="업무 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="pending">대기</SelectItem>
                <SelectItem value="in-progress">진행중</SelectItem>
                <SelectItem value="completed">완료</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        <div className="container py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-20">
              <Archive className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">아카이브된 업무가 없습니다</h3>
              <p className="text-sm text-muted-foreground mt-1">
                업무 목록에서 업무를 선택하여 아카이브할 수 있습니다.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredTasks.map((task) => (
                <Card key={task.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{task.title}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          {task.department && (
                            <span className="text-xs">{task.department}</span>
                          )}
                          {task.assignee && (
                            <>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-xs">{task.assignee}</span>
                            </>
                          )}
                        </CardDescription>
                      </div>
                      <Badge className={STATUS_COLORS[task.status]}>
                        {STATUS_LABELS[task.status]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Archive Info */}
                    <div className="text-xs text-muted-foreground space-y-1 mb-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          아카이브: {format(new Date(task.archivedAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                        </span>
                      </div>
                      {task.archiveReason && (
                        <div className="flex items-start gap-1.5">
                          <FileText className="h-3.5 w-3.5 mt-0.5" />
                          <span className="line-clamp-2">{task.archiveReason}</span>
                        </div>
                      )}
                      {isAdmin && 'userName' in task && (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          <span>{(task as any).koreanName || (task as any).userName || '알 수 없음'}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDetailClick(task.id)}
                      >
                        상세보기
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreClick(task.id)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(task.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
            <DialogDescription>
              아카이브된 업무 상세 정보
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">상태:</span>
                  <Badge className={`ml-2 ${STATUS_COLORS[selectedTask.status]}`}>
                    {STATUS_LABELS[selectedTask.status]}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">부서:</span>
                  <span className="ml-2">{selectedTask.department || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">담당자:</span>
                  <span className="ml-2">{selectedTask.assignee || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">일정:</span>
                  <span className="ml-2">{selectedTask.schedule || '-'}</span>
                </div>
                {selectedTask.startDate && (
                  <div>
                    <span className="text-muted-foreground">시작일:</span>
                    <span className="ml-2">
                      {format(new Date(selectedTask.startDate), 'yyyy.MM.dd', { locale: ko })}
                    </span>
                  </div>
                )}
                {selectedTask.dueDate && (
                  <div>
                    <span className="text-muted-foreground">완료일:</span>
                    <span className="ml-2">
                      {format(new Date(selectedTask.dueDate), 'yyyy.MM.dd', { locale: ko })}
                    </span>
                  </div>
                )}
              </div>

              {/* Details */}
              {selectedTask.details && (
                <div>
                  <h4 className="text-sm font-medium mb-2">상세 내용</h4>
                  <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap">
                    {selectedTask.details}
                  </div>
                </div>
              )}

              {/* Archive Info */}
              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 text-sm">
                <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">아카이브 정보</h4>
                <div className="space-y-1 text-amber-700 dark:text-amber-300">
                  <p>아카이브 일시: {format(new Date(selectedTask.archivedAt), 'yyyy.MM.dd HH:mm', { locale: ko })}</p>
                  {selectedTask.archiveReason && (
                    <p>사유: {selectedTask.archiveReason}</p>
                  )}
                  <p>원본 생성일: {format(new Date(selectedTask.originalCreatedAt), 'yyyy.MM.dd HH:mm', { locale: ko })}</p>
                </div>
              </div>

              {/* Progress Logs */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  진행 이력
                </h4>
                {logsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : progressLogs && progressLogs.length > 0 ? (
                  <div className="space-y-2">
                    {progressLogs.map((log) => (
                      <div key={log.id} className="bg-muted/50 rounded-lg p-3 text-sm">
                        <div className="text-xs text-muted-foreground mb-1">
                          {format(new Date(log.logDate), 'yyyy.MM.dd', { locale: ko })}
                        </div>
                        <p>{log.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">진행 이력이 없습니다.</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              닫기
            </Button>
            <Button onClick={() => {
              setIsDetailDialogOpen(false);
              handleRestoreClick(selectedTask!.id);
            }}>
              <RotateCcw className="h-4 w-4 mr-2" />
              복원
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>업무 복원</DialogTitle>
            <DialogDescription>
              "{selectedTask?.title}" 업무를 복원하시겠습니까?
              복원된 업무는 업무 목록에서 다시 확인할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRestoreDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleRestoreConfirm} disabled={restoreMutation.isPending}>
              {restoreMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  복원
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>업무 영구 삭제</DialogTitle>
            <DialogDescription className="text-destructive">
              "{selectedTask?.title}" 업무를 영구적으로 삭제하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  영구 삭제
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
