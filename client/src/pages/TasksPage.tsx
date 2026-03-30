/**
 * Tasks Page - Task Manager
 * Design: Japanese Zen Minimalism (禅 미니멀리즘)
 * Mobile Responsive
 */

import { useState, useCallback, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Task, TaskStatus, STATUS_LABELS, STATUS_COLORS } from '@/types/task';
import { TaskCard } from '@/components/TaskCard';
import { TaskModal } from '@/components/TaskModal';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Plus, Search, LayoutList, Circle, Clock, CheckCircle, Users, Calendar, Grid3X3, Archive, X, CheckSquare, Square, Filter, SlidersHorizontal } from 'lucide-react';
import { TaskCalendar } from '@/components/TaskCalendar';
import { Link } from 'wouter';

interface TaskFormData {
  title: string;
  department: string;
  assignee: string;
  schedule: string;
  details: string;
  status: TaskStatus;
  startDate: Date | null;
  dueDate: Date | null;
}

interface TaskFilter {
  status: TaskStatus | 'all';
  department: string;
  searchQuery: string;
}

export default function TasksPage() {
  // Task state
  const [filter, setFilter] = useState<TaskFilter>({
    status: 'all',
    department: '',
    searchQuery: ''
  });

  // Selected user for viewing tasks (팀장/사업부장/임원용)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  
  // View mode: 'card' or 'calendar'
  const [viewMode, setViewMode] = useState<'card' | 'calendar'>('card');

  // Selection mode for archiving
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // Archive dialog
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');

  // Modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  // Mobile filter sheet
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // tRPC queries
  // 접근 가능한 사용자 목록 조회
  const { data: accessibleUsersData, isLoading: accessibleUsersLoading } = trpc.task.accessibleUsers.useQuery();

  // 본인 업무 조회 (기본)
  const { data: myTasksData, isLoading: myTasksLoading, refetch: refetchMyTasks } = trpc.task.list.useQuery(
    undefined,
    { enabled: selectedUserId === null }
  );

  // 선택한 사용자의 업무 조회
  const { data: targetTasksData, isLoading: targetTasksLoading, refetch: refetchTargetTasks } = trpc.task.listByUser.useQuery(
    { targetUserId: selectedUserId! },
    { enabled: selectedUserId !== null }
  );

  const refetchTasks = useCallback(() => {
    if (selectedUserId === null) {
      refetchMyTasks();
    } else {
      refetchTargetTasks();
    }
  }, [selectedUserId, refetchMyTasks, refetchTargetTasks]);

  const createTaskMutation = trpc.task.create.useMutation({
    onSuccess: () => {
      refetchTasks();
      toast.success('새 업무가 추가되었습니다.');
    },
    onError: () => {
      toast.error('업무 추가에 실패했습니다.');
    }
  });

  const updateTaskMutation = trpc.task.update.useMutation({
    onSuccess: () => {
      refetchTasks();
      toast.success('업무가 수정되었습니다.');
    },
    onError: () => {
      toast.error('업무 수정에 실패했습니다.');
    }
  });

  const deleteTaskMutation = trpc.task.delete.useMutation({
    onSuccess: () => {
      refetchTasks();
      toast.success('업무가 삭제되었습니다.');
    },
    onError: () => {
      toast.error('업무 삭제에 실패했습니다.');
    }
  });

  const updateStatusMutation = trpc.task.updateStatus.useMutation({
    onSuccess: () => {
      refetchTasks();
    },
    onError: () => {
      toast.error('상태 변경에 실패했습니다.');
    }
  });

  // Archive mutation
  const archiveMutation = trpc.task.archive.useMutation({
    onSuccess: (result) => {
      refetchTasks();
      toast.success(`${result.archivedCount}개의 업무가 아카이브되었습니다.`);
      setSelectedTaskIds(new Set());
      setIsSelectionMode(false);
      setIsArchiveDialogOpen(false);
      setArchiveReason('');
    },
    onError: () => {
      toast.error('아카이브에 실패했습니다.');
    }
  });

  // Process tasks data
  const tasksData = selectedUserId === null ? myTasksData : targetTasksData;
  const tasksLoading = selectedUserId === null ? myTasksLoading : targetTasksLoading;
  const allTasks: Task[] = tasksData ?? [];
  
  // Get unique departments (filter out null values)
  const departments = Array.from(
    new Set(allTasks.map(t => t.department).filter((d): d is string => d !== null && d !== ''))
  ).sort();

  // Filter tasks
  const tasks = allTasks.filter(task => {
    if (filter.status !== 'all' && task.status !== filter.status) return false;
    if (filter.department && task.department !== filter.department) return false;
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      return (
        task.title.toLowerCase().includes(query) ||
        (task.details ?? '').toLowerCase().includes(query) ||
        (task.assignee ?? '').toLowerCase().includes(query) ||
        (task.department ?? '').toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Stats
  const stats = {
    total: allTasks.length,
    pending: allTasks.filter(t => t.status === 'pending').length,
    inProgress: allTasks.filter(t => t.status === 'in-progress').length,
    completed: allTasks.filter(t => t.status === 'completed').length
  };

  const statusFilters: { value: TaskStatus | 'all'; label: string; icon: React.ReactNode; count: number }[] = [
    { value: 'all', label: '전체', icon: <LayoutList className="h-4 w-4" />, count: stats.total },
    { value: 'pending', label: STATUS_LABELS.pending, icon: <Circle className="h-4 w-4" />, count: stats.pending },
    { value: 'in-progress', label: STATUS_LABELS['in-progress'], icon: <Clock className="h-4 w-4" />, count: stats.inProgress },
    { value: 'completed', label: STATUS_LABELS.completed, icon: <CheckCircle className="h-4 w-4" />, count: stats.completed },
  ];

  // 접근 레벨에 따른 라벨
  const accessLevelLabel = useMemo(() => {
    if (!accessibleUsersData) return '';
    switch (accessibleUsersData.accessLevel) {
      case 'all': return '전체 직원';
      case 'division': return '사업부 직원';
      case 'team': return '팀 직원';
      default: return '';
    }
  }, [accessibleUsersData]);

  // 선택된 사용자 정보
  const selectedUserInfo = useMemo(() => {
    if (selectedUserId === null) return null;
    return accessibleUsersData?.users.find(u => u.id === selectedUserId);
  }, [selectedUserId, accessibleUsersData]);

  // 사용자 목록을 그룹화 (사업부 > 팀)
  const groupedUsers = useMemo(() => {
    if (!accessibleUsersData?.users) return [];
    
    const groups: { [key: string]: typeof accessibleUsersData.users } = {};
    
    accessibleUsersData.users.forEach(u => {
      const groupKey = u.divisionName || '미배정';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(u);
    });
    
    return Object.entries(groups).map(([divisionName, users]) => ({
      divisionName,
      users: users.sort((a, b) => (a.teamName || '').localeCompare(b.teamName || ''))
    }));
  }, [accessibleUsersData]);

  // Handlers
  const handleAddTask = useCallback(() => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  }, []);

  const handleEditTask = useCallback((task: Task) => {
    if (isSelectionMode) return; // 선택 모드에서는 편집 비활성화
    setEditingTask(task);
    setIsTaskModalOpen(true);
  }, [isSelectionMode]);

  const handleDeleteClick = useCallback((id: string) => {
    const task = allTasks.find(t => t.id === id);
    if (task) {
      setDeletingTask(task);
      setIsDeleteDialogOpen(true);
    }
  }, [allTasks]);

  const handleDeleteConfirm = useCallback(() => {
    if (deletingTask) {
      deleteTaskMutation.mutate({ id: deletingTask.id });
      setDeletingTask(null);
      setIsDeleteDialogOpen(false);
    }
  }, [deletingTask, deleteTaskMutation]);

  const handleStatusChange = useCallback((id: string, status: TaskStatus) => {
    updateStatusMutation.mutate({ id, status });
    toast.success(`상태가 "${STATUS_LABELS[status]}"(으)로 변경되었습니다.`);
  }, [updateStatusMutation]);

  const handleTaskSubmit = useCallback((data: TaskFormData) => {
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, ...data });
    } else {
      createTaskMutation.mutate(data);
    }
    setIsTaskModalOpen(false);
  }, [editingTask, updateTaskMutation, createTaskMutation]);

  const handleClearFilter = useCallback(() => {
    setFilter({
      status: 'all',
      department: '',
      searchQuery: ''
    });
  }, []);

  const handleUserSelect = useCallback((value: string) => {
    if (value === 'me') {
      setSelectedUserId(null);
    } else {
      setSelectedUserId(parseInt(value, 10));
    }
    // 필터 초기화
    setFilter({
      status: 'all',
      department: '',
      searchQuery: ''
    });
    // 선택 모드 해제
    setIsSelectionMode(false);
    setSelectedTaskIds(new Set());
  }, []);

  // Selection handlers
  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedTaskIds(new Set());
  }, [isSelectionMode]);

  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  const selectAllTasks = useCallback(() => {
    if (selectedTaskIds.size === tasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(tasks.map(t => t.id)));
    }
  }, [tasks, selectedTaskIds.size]);

  const handleArchiveClick = useCallback(() => {
    if (selectedTaskIds.size === 0) {
      toast.error('아카이브할 업무를 선택해주세요.');
      return;
    }
    setIsArchiveDialogOpen(true);
  }, [selectedTaskIds.size]);

  const handleArchiveConfirm = useCallback(() => {
    archiveMutation.mutate({
      taskIds: Array.from(selectedTaskIds),
      reason: archiveReason || undefined,
    });
  }, [archiveMutation, selectedTaskIds, archiveReason]);

  const hasFilters = filter.status !== 'all' || filter.department || filter.searchQuery;
  const showEmptyState = tasks.length === 0;
  const emptyType = hasFilters ? 'no-results' : 'no-tasks';
  const canViewOthers = accessibleUsersData && accessibleUsersData.accessLevel !== 'self';
  const isViewingOther = selectedUserId !== null;

  // Filter sidebar content (shared between desktop and mobile)
  const FilterContent = () => (
    <div className="space-y-6">
      {/* Add Task Button - 본인 업무일 때만 표시 */}
      {!isViewingOther && (
        <Button onClick={() => { handleAddTask(); setIsMobileFilterOpen(false); }} className="w-full justify-center gap-2">
          <Plus className="h-4 w-4" />
          새 업무 추가
        </Button>
      )}

      {/* 직원 선택 (팀장/사업부장/임원만 표시) */}
      {canViewOthers && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            직원 업무 조회
          </p>
          <Select
            value={selectedUserId === null ? 'me' : selectedUserId.toString()}
            onValueChange={handleUserSelect}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="직원 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="me">
                <span className="font-medium">내 업무</span>
              </SelectItem>
              {groupedUsers.map(group => (
                <div key={group.divisionName}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                    {group.divisionName}
                  </div>
                  {group.users.map(u => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span>{u.koreanName || u.name}</span>
                        {u.teamName && (
                          <span className="text-xs text-muted-foreground">({u.teamName})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="mt-2 text-xs w-full justify-center">
            {accessLevelLabel} 조회 가능
          </Badge>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="업무 검색..."
          value={filter.searchQuery}
          onChange={(e) => setFilter({ ...filter, searchQuery: e.target.value })}
          className="pl-9 h-9"
        />
      </div>

      {/* Status Filters */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          상태별 보기
        </p>
        <ul className="space-y-1">
          {statusFilters.map((item) => {
            const isActive = filter.status === item.value;
            const statusColor = item.value !== 'all' ? STATUS_COLORS[item.value as TaskStatus] : null;
            
            return (
              <li key={item.value}>
                <button
                  onClick={() => setFilter({ ...filter, status: item.value })}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-md transition-colors ${
                    isActive 
                      ? 'bg-primary text-primary-foreground font-medium' 
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {statusColor ? (
                      <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-primary-foreground' : statusColor.dot}`} />
                    ) : (
                      item.icon
                    )}
                    {item.label}
                  </span>
                  <span className={`text-xs font-mono ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                    {item.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Department Filter */}
      {departments.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            부서별 필터
          </p>
          <Select
            value={filter.department || 'all'}
            onValueChange={(value) => setFilter({ 
              ...filter, 
              department: value === 'all' ? '' : value 
            })}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="부서 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 부서</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Archive Section - 본인 업무일 때만 표시 */}
      {!isViewingOther && (
        <div className="pt-4 border-t border-border">
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            아카이브
          </p>
          <Link href="/tasks/archive" onClick={() => setIsMobileFilterOpen(false)}>
            <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
              <Archive className="h-4 w-4" />
              아카이브 보기
            </Button>
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <MainLayout>
      <div className="flex min-h-[calc(100vh-56px)]">
        {/* Left Sidebar - Filters (Desktop Only) */}
        <aside className="hidden md:block w-64 bg-card border-r border-border p-4 shrink-0">
          <FilterContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Header */}
          <header className="sticky top-14 z-10 bg-background/80 backdrop-blur-md border-b border-border">
            <div className="px-4 md:px-8 py-3 md:py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                {/* Title and Info */}
                <div className="flex items-center justify-between md:justify-start gap-3">
                  <div>
                    <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                      <h2 className="text-base md:text-lg font-semibold text-foreground">
                        {filter.status === 'all' ? '전체 업무' : STATUS_LABELS[filter.status as TaskStatus]}
                        {filter.department && <span className="text-muted-foreground font-normal"> · {filter.department}</span>}
                      </h2>
                      {isViewingOther && selectedUserInfo && (
                        <Badge variant="secondary" className="text-xs md:text-sm">
                          {selectedUserInfo.koreanName || selectedUserInfo.name}님
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      <span className="font-mono text-primary">{tasks.length}</span>개의 업무
                      {filter.searchQuery && <span className="ml-2 px-1.5 py-0.5 bg-muted rounded text-xs hidden sm:inline">검색: {filter.searchQuery}</span>}
                    </p>
                  </div>
                  
                  {/* Mobile Filter Button */}
                  <Sheet open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="md:hidden gap-1.5">
                        <SlidersHorizontal className="h-4 w-4" />
                        필터
                        {hasFilters && (
                          <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                            !
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80 p-0">
                      <SheetHeader className="p-4 border-b border-border">
                        <SheetTitle>필터 및 검색</SheetTitle>
                      </SheetHeader>
                      <div className="p-4 overflow-y-auto max-h-[calc(100vh-80px)]">
                        <FilterContent />
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-1 md:pb-0">
                  {/* Selection Mode Controls */}
                  {!isViewingOther && viewMode === 'card' && (
                    <>
                      {isSelectionMode ? (
                        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={selectAllTasks}
                            className="gap-1 text-xs md:text-sm h-8 md:h-9 px-2 md:px-3"
                          >
                            {selectedTaskIds.size === tasks.length ? (
                              <CheckSquare className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            ) : (
                              <Square className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            )}
                            <span className="hidden sm:inline">{selectedTaskIds.size === tasks.length ? '전체 해제' : '전체 선택'}</span>
                          </Button>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {selectedTaskIds.size}개
                          </Badge>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleArchiveClick}
                            disabled={selectedTaskIds.size === 0}
                            className="gap-1 text-xs md:text-sm h-8 md:h-9 px-2 md:px-3"
                          >
                            <Archive className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            <span className="hidden sm:inline">아카이브</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleSelectionMode}
                            className="h-8 md:h-9 w-8 md:w-9 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={toggleSelectionMode}
                          className="gap-1.5 text-xs md:text-sm h-8 md:h-9 shrink-0"
                        >
                          <CheckSquare className="h-3.5 w-3.5 md:h-4 md:w-4" />
                          <span className="hidden sm:inline">선택</span>
                        </Button>
                      )}
                    </>
                  )}
                  
                  {/* Mobile Add Button */}
                  {!isViewingOther && !isSelectionMode && (
                    <Button
                      size="sm"
                      onClick={handleAddTask}
                      className="md:hidden gap-1.5 h-8 shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                      추가
                    </Button>
                  )}
                  
                  {/* 뷰 모드 토글 */}
                  <div className="flex items-center gap-0.5 md:gap-1 bg-muted rounded-lg p-0.5 md:p-1 shrink-0">
                    <Button
                      variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('card')}
                      className="gap-1 text-xs md:text-sm h-7 md:h-8 px-2 md:px-3"
                    >
                      <Grid3X3 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">카드</span>
                    </Button>
                    <Button
                      variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('calendar')}
                      className="gap-1 text-xs md:text-sm h-7 md:h-8 px-2 md:px-3"
                    >
                      <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">캘린더</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Task List */}
          <div className="p-4 md:p-8">
            {(tasksLoading || accessibleUsersLoading) ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : viewMode === 'calendar' ? (
              <TaskCalendar 
                tasks={tasks} 
                onTaskClick={isViewingOther ? undefined : handleEditTask}
              />
            ) : showEmptyState ? (
              <EmptyState 
                type={emptyType}
                onAddTask={isViewingOther ? undefined : handleAddTask}
                onClearFilter={hasFilters ? handleClearFilter : undefined}
              />
            ) : (
              <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                {tasks.map((task, index) => (
                  <div key={task.id} className="relative">
                    {/* Selection Checkbox */}
                    {isSelectionMode && !isViewingOther && (
                      <div 
                        className="absolute top-3 left-3 z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskSelection(task.id);
                        }}
                      >
                        <Checkbox
                          checked={selectedTaskIds.has(task.id)}
                          className="h-5 w-5 bg-background border-2"
                        />
                      </div>
                    )}
                    <div 
                      className={`${isSelectionMode ? 'cursor-pointer' : ''} ${selectedTaskIds.has(task.id) ? 'ring-2 ring-primary rounded-lg' : ''}`}
                      onClick={() => isSelectionMode && toggleTaskSelection(task.id)}
                    >
                      <TaskCard
                        task={task}
                        index={index}
                        onEdit={isViewingOther || isSelectionMode ? undefined : handleEditTask}
                        onDelete={isViewingOther || isSelectionMode ? undefined : handleDeleteClick}
                        onStatusChange={isViewingOther || isSelectionMode ? undefined : handleStatusChange}
                        readOnly={isViewingOther || isSelectionMode}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modals - 본인 업무일 때만 표시 */}
      {!isViewingOther && (
        <>
          <TaskModal
            open={isTaskModalOpen}
            onOpenChange={setIsTaskModalOpen}
            task={editingTask}
            onSubmit={handleTaskSubmit}
          />

          <DeleteConfirmDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onConfirm={handleDeleteConfirm}
            taskTitle={deletingTask?.title}
          />
        </>
      )}

      {/* Archive Confirmation Dialog */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>업무 아카이브</DialogTitle>
            <DialogDescription>
              선택한 {selectedTaskIds.size}개의 업무를 아카이브합니다.
              아카이브된 업무는 '아카이브 보기'에서 확인하고 복원할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">아카이브 사유 (선택)</label>
            <Textarea
              placeholder="아카이브 사유를 입력하세요 (선택사항)"
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsArchiveDialogOpen(false)} className="w-full sm:w-auto">
              취소
            </Button>
            <Button onClick={handleArchiveConfirm} disabled={archiveMutation.isPending} className="w-full sm:w-auto">
              {archiveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  아카이브
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
