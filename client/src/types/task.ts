// Task type matching the database schema (after superjson serialization)
export interface TaskProgressLog {
  id: number;
  taskId: string;
  logDate: Date | string;
  content: string;
  createdAt: Date | string;
}

export interface Task {
  id: string;
  userId: number;
  number: number;
  title: string;
  department: string | null;
  assignee: string | null;
  schedule: string | null;
  details: string | null;
  status: 'pending' | 'in-progress' | 'completed';
  startDate: Date | string | null;
  dueDate: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  progressLogs?: TaskProgressLog[];
}

export type TaskStatus = 'pending' | 'in-progress' | 'completed';

export interface TaskFilter {
  status: TaskStatus | 'all';
  department: string;
  searchQuery: string;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  'pending': '대기',
  'in-progress': '진행중',
  'completed': '완료'
};

export const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string; dot: string }> = {
  'pending': { 
    bg: 'bg-amber-50', 
    text: 'text-amber-700',
    dot: 'bg-amber-400'
  },
  'in-progress': { 
    bg: 'bg-blue-50', 
    text: 'text-blue-700',
    dot: 'bg-blue-400'
  },
  'completed': { 
    bg: 'bg-emerald-50', 
    text: 'text-emerald-700',
    dot: 'bg-emerald-400'
  }
};
