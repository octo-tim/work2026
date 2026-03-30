/**
 * TaskCard Component
 * Design: Japanese Zen Minimalism
 * Mobile Responsive
 */

import { Task, STATUS_LABELS, STATUS_COLORS, TaskStatus, TaskProgressLog } from '@/types/task';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit2, Trash2, CheckCircle, Clock, Circle, Eye, Calendar, AlertCircle, FileText } from 'lucide-react';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: TaskStatus) => void;
  index: number;
  readOnly?: boolean;
}

export function TaskCard({ task, onEdit, onDelete, onStatusChange, index, readOnly = false }: TaskCardProps) {
  const statusStyle = STATUS_COLORS[task.status];
  const department = task.department ?? '';
  const assignee = task.assignee ?? '';
  const details = task.details ?? '';
  const schedule = task.schedule ?? '';
  const progressLogs = task.progressLogs ?? [];
  const latestLog = progressLogs[0];
  
  // 마감일 계산
  const getDueDateInfo = () => {
    if (!task.dueDate) return null;
    const dueDate = typeof task.dueDate === 'string' ? parseISO(task.dueDate) : task.dueDate;
    if (!isValid(dueDate)) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateOnly = new Date(dueDate);
    dueDateOnly.setHours(0, 0, 0, 0);
    
    const daysLeft = differenceInDays(dueDateOnly, today);
    
    if (task.status === 'completed') {
      return { text: '완료', color: 'text-emerald-600', urgent: false };
    }
    if (daysLeft < 0) {
      return { text: `${Math.abs(daysLeft)}일 경과`, color: 'text-red-600', urgent: true };
    }
    if (daysLeft === 0) {
      return { text: '오늘 마감', color: 'text-red-600', urgent: true };
    }
    if (daysLeft <= 3) {
      return { text: `D-${daysLeft}`, color: 'text-orange-600', urgent: true };
    }
    if (daysLeft <= 7) {
      return { text: `D-${daysLeft}`, color: 'text-amber-600', urgent: false };
    }
    return { text: `D-${daysLeft}`, color: 'text-muted-foreground', urgent: false };
  };
  
  const dueDateInfo = getDueDateInfo();
  
  return (
    <div 
      className={`task-card bg-card border border-border p-3.5 sm:p-5 shadow-sm hover:shadow-md animate-fade-in-up opacity-0 rounded-sm ${readOnly ? 'opacity-90' : ''}`}
      style={{ animationDelay: `${index * 0.03}s`, animationFillMode: 'forwards' }}
    >
      {/* Header: Number, Title, Status, Actions */}
      <div className="flex items-start justify-between gap-2 sm:gap-4 mb-2 sm:mb-3">
        <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
          {/* Task Number */}
          <span className="font-mono text-[10px] sm:text-xs text-muted-foreground bg-muted px-1.5 sm:px-2 py-0.5 sm:py-1 shrink-0">
            #{task.number.toString().padStart(2, '0')}
          </span>
          
          {/* Title - 클릭 시 수정 화면으로 이동 */}
          <h3 
            className={`font-medium text-sm sm:text-base text-foreground leading-snug line-clamp-2 ${!readOnly ? 'cursor-pointer hover:text-primary hover:underline underline-offset-2 transition-colors' : ''}`}
            onClick={() => !readOnly && onEdit?.(task)}
            title={!readOnly ? '클릭하여 수정' : undefined}
          >
            {task.title}
          </h3>
        </div>
        
        {/* Actions - readOnly일 때는 보기 전용 아이콘만 표시 */}
        {readOnly ? (
          <div className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center text-muted-foreground">
            <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onEdit?.(task)} className="gap-2 text-sm">
                <Edit2 className="h-4 w-4" />
                수정
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onStatusChange?.(task.id, 'pending')}
                className="gap-2 text-sm"
                disabled={task.status === 'pending'}
              >
                <Circle className="h-4 w-4" />
                대기로 변경
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onStatusChange?.(task.id, 'in-progress')}
                className="gap-2 text-sm"
                disabled={task.status === 'in-progress'}
              >
                <Clock className="h-4 w-4" />
                진행중으로 변경
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onStatusChange?.(task.id, 'completed')}
                className="gap-2 text-sm"
                disabled={task.status === 'completed'}
              >
                <CheckCircle className="h-4 w-4" />
                완료로 변경
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete?.(task.id)}
                className="gap-2 text-sm text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      {/* Details */}
      {details && (
        <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 line-clamp-2 leading-relaxed">
          {details}
        </p>
      )}
      
      {/* 최근 진행 이력 */}
      {latestLog && (
        <div className="mb-2 sm:mb-3 p-1.5 sm:p-2 bg-muted/50 rounded-sm border-l-2 border-primary/30">
          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">
            <FileText className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            <span>최근 진행: {format(typeof latestLog.logDate === 'string' ? parseISO(latestLog.logDate) : latestLog.logDate, 'M/d', { locale: ko })}</span>
          </div>
          <p className="text-[10px] sm:text-xs text-foreground/80 line-clamp-1">
            {latestLog.content}
          </p>
        </div>
      )}
      
      {/* Footer: Meta info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2 pt-2 sm:pt-3 border-t border-border/50">
        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
          {/* Department & Assignee */}
          {(department || assignee) && (
            <span className="truncate max-w-[100px] sm:max-w-[120px]">
              {department}{department && assignee && ' · '}{assignee}
            </span>
          )}
          
          {/* 마감일 표시 */}
          {dueDateInfo && (
            <span className={`flex items-center gap-0.5 sm:gap-1 font-medium ${dueDateInfo.color}`}>
              {dueDateInfo.urgent && <AlertCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
              {dueDateInfo.text}
            </span>
          )}
        </div>
        
        {/* Status Badge */}
        <div className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium ${statusStyle.bg} ${statusStyle.text} self-start sm:self-auto`}>
          <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${statusStyle.dot}`} />
          {STATUS_LABELS[task.status]}
        </div>
      </div>
    </div>
  );
}
