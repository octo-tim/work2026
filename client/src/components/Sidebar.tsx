/**
 * Sidebar Component
 * Design: Japanese Zen Minimalism
 * - 얇은 수직 네비게이션 바
 * - 상태별 필터링
 * - 통계 표시
 * - 사용자 프로필 및 로그아웃
 */

import { TaskStatus, STATUS_LABELS, STATUS_COLORS } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  LayoutList, 
  Circle, 
  Clock, 
  CheckCircle, 
  Search,
  Plus,
  ClipboardList,
  User,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';

interface TaskFilter {
  status: TaskStatus | 'all';
  department: string;
  searchQuery: string;
}

interface SidebarProps {
  filter: TaskFilter;
  onFilterChange: (filter: TaskFilter) => void;
  departments: string[];
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  onAddTask: () => void;
  user?: {
    name?: string | null;
    koreanName?: string | null;
    email?: string | null;
  } | null;
}

export function Sidebar({ 
  filter, 
  onFilterChange, 
  departments, 
  stats,
  onAddTask,
  user
}: SidebarProps) {
  const { logout } = useAuth();
  
  const statusFilters: { value: TaskStatus | 'all'; label: string; icon: React.ReactNode; count: number }[] = [
    { value: 'all', label: '전체', icon: <LayoutList className="h-4 w-4" />, count: stats.total },
    { value: 'pending', label: STATUS_LABELS.pending, icon: <Circle className="h-4 w-4" />, count: stats.pending },
    { value: 'in-progress', label: STATUS_LABELS['in-progress'], icon: <Clock className="h-4 w-4" />, count: stats.inProgress },
    { value: 'completed', label: STATUS_LABELS.completed, icon: <CheckCircle className="h-4 w-4" />, count: stats.completed },
  ];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0 flex flex-col">
      {/* Logo / Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-sidebar-foreground tracking-tight">
              업무관리
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Task Manager
            </p>
          </div>
        </div>
      </div>

      {/* Add Task Button */}
      <div className="p-4">
        <Button 
          onClick={onAddTask}
          className="w-full justify-center gap-2 h-10"
        >
          <Plus className="h-4 w-4" />
          새 업무 추가
        </Button>
      </div>

      {/* Search */}
      <div className="px-4 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="업무 검색..."
            value={filter.searchQuery}
            onChange={(e) => onFilterChange({ ...filter, searchQuery: e.target.value })}
            className="pl-9 h-9 bg-background"
          />
        </div>
      </div>

      {/* Status Filters */}
      <nav className="px-3 flex-1">
        <p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          상태별 보기
        </p>
        <ul className="space-y-1">
          {statusFilters.map((item) => {
            const isActive = filter.status === item.value;
            const statusColor = item.value !== 'all' ? STATUS_COLORS[item.value as TaskStatus] : null;
            
            return (
              <li key={item.value}>
                <button
                  onClick={() => onFilterChange({ ...filter, status: item.value })}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                    isActive 
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {statusColor ? (
                      <span className={`w-2 h-2 rounded-full ${statusColor.dot}`} />
                    ) : (
                      item.icon
                    )}
                    {item.label}
                  </span>
                  <span className={`text-xs font-mono ${isActive ? 'text-sidebar-accent-foreground' : 'text-muted-foreground'}`}>
                    {item.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Department Filter */}
        {departments.length > 0 && (
          <div className="mt-6">
            <p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              부서별 필터
            </p>
            <div className="px-3">
              <Select
                value={filter.department || 'all'}
                onValueChange={(value) => onFilterChange({ 
                  ...filter, 
                  department: value === 'all' ? '' : value 
                })}
              >
                <SelectTrigger className="h-9 bg-background">
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
          </div>
        )}
      </nav>

      {/* User Profile & Logout */}
      <div className="p-4 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-sidebar-accent/50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.koreanName || user?.name || '사용자'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || ''}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.koreanName || user?.name || '사용자'}</p>
              <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4" />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
