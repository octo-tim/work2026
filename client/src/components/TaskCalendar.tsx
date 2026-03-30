/**
 * TaskCalendar Component
 * 업무를 캘린더 형태로 표시하는 컴포넌트
 * Mobile Responsive
 */

import { useState, useMemo } from 'react';
import { Task, STATUS_COLORS, STATUS_LABELS } from '@/types/task';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  addMonths, 
  subMonths,
  isSameMonth,
  isSameDay,
  parseISO,
  isValid
} from 'date-fns';
import { ko } from 'date-fns/locale';

interface TaskCalendarProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

export function TaskCalendar({ tasks, onTaskClick }: TaskCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { locale: ko });
  const calendarEnd = endOfWeek(monthEnd, { locale: ko });
  
  // 날짜별 업무 매핑
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    
    tasks.forEach(task => {
      // 시작일과 완료일 모두 확인
      const dates: Date[] = [];
      
      if (task.startDate) {
        const startDate = typeof task.startDate === 'string' ? parseISO(task.startDate) : task.startDate;
        if (isValid(startDate)) dates.push(startDate);
      }
      
      if (task.dueDate) {
        const dueDate = typeof task.dueDate === 'string' ? parseISO(task.dueDate) : task.dueDate;
        if (isValid(dueDate)) dates.push(dueDate);
      }
      
      dates.forEach(date => {
        const key = format(date, 'yyyy-MM-dd');
        if (!map.has(key)) {
          map.set(key, []);
        }
        // 중복 방지
        const existing = map.get(key)!;
        if (!existing.some(t => t.id === task.id)) {
          existing.push(task);
        }
      });
    });
    
    return map;
  }, [tasks]);
  
  // 캘린더 날짜 생성
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    let day = calendarStart;
    
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    
    return days;
  }, [calendarStart, calendarEnd]);
  
  const goToPrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());
  
  const today = new Date();
  
  // 선택된 날짜의 업무 목록
  const selectedDateTasks = selectedDate 
    ? tasksByDate.get(format(selectedDate, 'yyyy-MM-dd')) || []
    : [];
  
  return (
    <div className="bg-card border border-border rounded-sm">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border">
        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="outline" size="icon" onClick={goToPrevMonth} className="h-8 w-8 sm:h-9 sm:w-9">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextMonth} className="h-8 w-8 sm:h-9 sm:w-9">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-sm sm:text-lg font-semibold ml-1 sm:ml-2">
            {format(currentDate, 'yyyy년 M월', { locale: ko })}
          </h2>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday} className="h-8 text-xs sm:text-sm">
          오늘
        </Button>
      </div>
      
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b border-border">
        {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
          <div 
            key={day} 
            className={`p-1.5 sm:p-2 text-center text-xs sm:text-sm font-medium ${
              index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-muted-foreground'
            }`}
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* 캘린더 그리드 */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDate.get(dateKey) || [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, today);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const dayOfWeek = day.getDay();
          
          return (
            <div
              key={dateKey}
              onClick={() => setSelectedDate(day)}
              className={`min-h-[60px] sm:min-h-[100px] p-1 border-b border-r border-border cursor-pointer transition-colors ${
                !isCurrentMonth ? 'bg-muted/30' : ''
              } ${isToday ? 'bg-primary/5' : ''} ${isSelected ? 'bg-primary/10 ring-1 ring-primary' : ''} hover:bg-muted/50`}
            >
              <div className={`text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 ${
                !isCurrentMonth 
                  ? 'text-muted-foreground/50' 
                  : dayOfWeek === 0 
                  ? 'text-red-500' 
                  : dayOfWeek === 6 
                  ? 'text-blue-500' 
                  : 'text-foreground'
              } ${isToday ? 'bg-primary text-primary-foreground rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs' : ''}`}>
                {format(day, 'd')}
              </div>
              
              {/* 모바일: 업무 개수만 표시 */}
              <div className="sm:hidden">
                {dayTasks.length > 0 && (
                  <div className="flex flex-wrap gap-0.5">
                    {dayTasks.slice(0, 3).map(task => {
                      const statusStyle = STATUS_COLORS[task.status];
                      return (
                        <span 
                          key={task.id} 
                          className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}
                        />
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{dayTasks.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
              
              {/* 데스크톱: 업무 목록 표시 */}
              <div className="hidden sm:block space-y-0.5">
                {dayTasks.slice(0, 3).map(task => {
                  const statusStyle = STATUS_COLORS[task.status];
                  const isDueDate = task.dueDate && isSameDay(
                    typeof task.dueDate === 'string' ? parseISO(task.dueDate) : task.dueDate,
                    day
                  );
                  
                  return (
                    <div
                      key={task.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskClick?.(task);
                      }}
                      className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${
                        isDueDate 
                          ? `${statusStyle.bg} ${statusStyle.text}` 
                          : 'bg-muted text-muted-foreground'
                      }`}
                      title={`#${task.number} ${task.title}`}
                    >
                      #{task.number} {task.title}
                    </div>
                  );
                })}
                {dayTasks.length > 3 && (
                  <div className="text-xs text-muted-foreground px-1">
                    +{dayTasks.length - 3}개 더
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* 모바일: 선택된 날짜의 업무 목록 */}
      {selectedDate && (
        <div className="sm:hidden border-t border-border p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">
              {format(selectedDate, 'M월 d일 (E)', { locale: ko })}
            </h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedDate(null)}
              className="h-7 text-xs"
            >
              닫기
            </Button>
          </div>
          {selectedDateTasks.length > 0 ? (
            <div className="space-y-2">
              {selectedDateTasks.map(task => {
                const statusStyle = STATUS_COLORS[task.status];
                return (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick?.(task)}
                    className="p-2 bg-muted/30 rounded-lg border border-border cursor-pointer hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          #{task.number} {task.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {task.department || '미지정'} · {task.assignee || '미지정'}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded-full shrink-0 ${statusStyle.bg} ${statusStyle.text}`}>
                        {STATUS_LABELS[task.status]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              이 날짜에 업무가 없습니다
            </p>
          )}
        </div>
      )}
      
      {/* 범례 */}
      <div className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 border-t border-border text-xs flex-wrap">
        <span className="text-muted-foreground">상태:</span>
        {Object.entries(STATUS_LABELS).map(([key, label]) => {
          const style = STATUS_COLORS[key as keyof typeof STATUS_COLORS];
          return (
            <div key={key} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${style.dot}`} />
              <span className="text-muted-foreground">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
