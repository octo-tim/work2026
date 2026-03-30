/**
 * Home Page - Task Manager
 * Design: Japanese Zen Minimalism (禅 미니멀리즘)
 */

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Task, TaskStatus, STATUS_LABELS } from '@/types/task';
import { Sidebar } from '@/components/Sidebar';
import { TaskCard } from '@/components/TaskCard';
import { TaskModal } from '@/components/TaskModal';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { AuthPage } from '@/components/AuthPage';
import { toast } from 'sonner';
import { Loader2, Users, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface TaskFormData {
  title: string;
  department: string;
  assignee: string;
  schedule: string;
  details: string;
  status: TaskStatus;
}

interface TaskFilter {
  status: TaskStatus | 'all';
  department: string;
  searchQuery: string;
}

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  
  // Task state
  const [filter, setFilter] = useState<TaskFilter>({
    status: 'all',
    department: '',
    searchQuery: ''
  });

  // Selected user for viewing tasks (팀장/사업부장/임원용)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  // tRPC queries
  // 접근 가능한 사용자 목록 조회
  const { data: accessibleUsersData, isLoading: accessibleUsersLoading } = trpc.task.accessibleUsers.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // 본인 업무 조회 (기본)
  const { data: myTasksData, isLoading: myTasksLoading, refetch: refetchMyTasks } = trpc.task.list.useQuery(
    undefined,
    { enabled: isAuthenticated && selectedUserId === null }
  );

  // 선택한 사용자의 업무 조회
  const { data: targetTasksData, isLoading: targetTasksLoading, refetch: refetchTargetTasks } = trpc.task.listByUser.useQuery(
    { targetUserId: selectedUserId! },
    { enabled: isAuthenticated && selectedUserId !== null }
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
    setEditingTask(task);
    setIsTaskModalOpen(true);
  }, []);

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
  }, []);

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated - show login page
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Tasks loading state
  if (tasksLoading || accessibleUsersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">업무 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const hasFilters = filter.status !== 'all' || filter.department || filter.searchQuery;
  const showEmptyState = tasks.length === 0;
  const emptyType = hasFilters ? 'no-results' : 'no-tasks';
  const canViewOthers = accessibleUsersData && accessibleUsersData.accessLevel !== 'self';
  const isViewingOther = selectedUserId !== null;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <Sidebar
        filter={filter}
        onFilterChange={setFilter}
        departments={departments}
        stats={stats}
        onAddTask={handleAddTask}
        user={user}
      />

      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-foreground tracking-tight">
                    {filter.status === 'all' ? '전체 업무' : STATUS_LABELS[filter.status as TaskStatus]}
                    {filter.department && <span className="text-muted-foreground font-normal"> · {filter.department}</span>}
                  </h2>
                  {isViewingOther && selectedUserInfo && (
                    <Badge variant="secondary" className="text-sm">
                      {selectedUserInfo.name}님의 업무
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="font-mono text-primary">{tasks.length}</span>개의 업무
                  {filter.searchQuery && <span className="ml-2 px-2 py-0.5 bg-muted rounded text-xs">검색: {filter.searchQuery}</span>}
                </p>
              </div>

              {/* 직원 선택 드롭다운 (팀장/사업부장/임원만 표시) */}
              {canViewOthers && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={selectedUserId === null ? 'me' : selectedUserId.toString()}
                    onValueChange={handleUserSelect}
                  >
                    <SelectTrigger className="w-[200px]">
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
                                <span>{u.name}</span>
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
                  <Badge variant="outline" className="text-xs">
                    {accessLevelLabel}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Task List */}
        <div className="p-8">
          {showEmptyState ? (
            <EmptyState 
              type={emptyType}
              onAddTask={isViewingOther ? undefined : handleAddTask}
              onClearFilter={hasFilters ? handleClearFilter : undefined}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  onEdit={isViewingOther ? undefined : handleEditTask}
                  onDelete={isViewingOther ? undefined : handleDeleteClick}
                  onStatusChange={isViewingOther ? undefined : handleStatusChange}
                  readOnly={isViewingOther}
                />
              ))}
            </div>
          )}
        </div>
      </main>

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
    </div>
  );
}
