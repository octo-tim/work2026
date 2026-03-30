/**
 * SalesCalendar Component
 * 매출관리 페이지의 주요 일정 캘린더
 * 레이아웃: 왼쪽 50% 캘린더, 오른쪽 50% 일정 리스트
 * 드래그 앤 드롭으로 일정 날짜 변경 가능
 * 기간 일정 지원 및 캘린더에 일정 제목 표시
 */

import { useState, useMemo, useCallback, DragEvent } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Clock,
  Tag,
  Trash2,
  Edit2,
  Loader2,
  List,
  GripVertical,
  CalendarRange,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isValid, isAfter, isBefore, startOfDay, isWithinInterval, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from 'sonner';

// 일정 유형별 색상 및 라벨
const EVENT_TYPES = {
  meeting: { label: '회의', color: '#3b82f6', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  deadline: { label: '마감일', color: '#ef4444', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  promotion: { label: '프로모션', color: '#f59e0b', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  holiday: { label: '휴일', color: '#10b981', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  payment: { label: '결제/입금', color: '#8b5cf6', bgColor: 'bg-violet-100 dark:bg-violet-900/30' },
  launch: { label: '출시/런칭', color: '#ec4899', bgColor: 'bg-pink-100 dark:bg-pink-900/30' },
  other: { label: '기타', color: '#6b7280', bgColor: 'bg-gray-100 dark:bg-gray-800/30' },
} as const;

type EventType = keyof typeof EVENT_TYPES;

interface SalesEvent {
  id: string;
  title: string;
  description: string | null;
  eventDate: Date;
  endDate: Date | null;
  isAllDay: boolean;
  eventType: EventType;
  color: string | null;
  division: string | null;
  reminderDays: number | null;
}

interface SalesCalendarProps {
  year: number;
  month: number;
  onMonthChange?: (year: number, month: number) => void;
  canEdit?: boolean;
}

export function SalesCalendar({ year, month, onMonthChange, canEdit = false }: SalesCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SalesEvent | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  
  // Drag and drop state
  const [draggedEvent, setDraggedEvent] = useState<SalesEvent | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formEventDate, setFormEventDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formIsRange, setFormIsRange] = useState(false);
  const [formEventType, setFormEventType] = useState<EventType>('other');
  const [formColor, setFormColor] = useState('#3b82f6');

  // tRPC queries
  const { data: events, isLoading, refetch } = trpc.salesEvent.list.useQuery({
    year,
    month,
  });

  // Mutations
  const createMutation = trpc.salesEvent.create.useMutation({
    onSuccess: () => {
      toast.success('일정이 추가되었습니다.');
      refetch();
      closeModal();
    },
    onError: (err) => toast.error('일정 추가 실패: ' + err.message),
  });

  const updateMutation = trpc.salesEvent.update.useMutation({
    onSuccess: () => {
      toast.success('일정이 수정되었습니다.');
      refetch();
      closeModal();
    },
    onError: (err) => toast.error('일정 수정 실패: ' + err.message),
  });

  // Mutation for drag and drop date change
  const updateDateMutation = trpc.salesEvent.update.useMutation({
    onSuccess: () => {
      toast.success('일정 날짜가 변경되었습니다.');
      refetch();
    },
    onError: (err) => toast.error('날짜 변경 실패: ' + err.message),
  });

  const deleteMutation = trpc.salesEvent.delete.useMutation({
    onSuccess: () => {
      toast.success('일정이 삭제되었습니다.');
      refetch();
      setIsDeleteConfirmOpen(false);
      setDeletingEventId(null);
    },
    onError: (err) => toast.error('일정 삭제 실패: ' + err.message),
  });

  // Calendar days calculation
  const currentDate = useMemo(() => new Date(year, month - 1, 1), [year, month]);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    // 시작 요일 맞추기 (일요일 = 0)
    const startDay = monthStart.getDay();
    const paddingDays = Array(startDay).fill(null);
    return [...paddingDays, ...days];
  }, [monthStart, monthEnd]);

  // Events by date (including range events)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, SalesEvent[]>();
    events?.forEach((event) => {
      const eventDate = typeof event.eventDate === 'string' 
        ? parseISO(event.eventDate) 
        : event.eventDate;
      const endDate = event.endDate 
        ? (typeof event.endDate === 'string' ? parseISO(event.endDate) : event.endDate)
        : null;
      
      if (!isValid(eventDate)) return;
      
      // 기간 일정인 경우 해당 기간의 모든 날짜에 추가
      if (endDate && isValid(endDate) && isAfter(endDate, eventDate)) {
        const rangeDays = eachDayOfInterval({ start: eventDate, end: endDate });
        rangeDays.forEach((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const existing = map.get(dateKey) || [];
          // 중복 방지
          if (!existing.find(e => e.id === event.id)) {
            map.set(dateKey, [...existing, { ...event, eventDate, endDate } as SalesEvent]);
          }
        });
      } else {
        // 단일 날짜 일정
        const dateKey = format(eventDate, 'yyyy-MM-dd');
        const existing = map.get(dateKey) || [];
        map.set(dateKey, [...existing, { ...event, eventDate } as SalesEvent]);
      }
    });
    return map;
  }, [events]);

  // 이번 달 전체 일정 리스트 (날짜순 정렬)
  const monthlyEventsList = useMemo(() => {
    if (!events) return [];
    
    return events
      .map((event) => {
        const eventDate = typeof event.eventDate === 'string' 
          ? parseISO(event.eventDate) 
          : event.eventDate;
        const endDate = event.endDate 
          ? (typeof event.endDate === 'string' ? parseISO(event.endDate) : event.endDate)
          : null;
        return { ...event, eventDate, endDate } as SalesEvent;
      })
      .filter((event) => isValid(event.eventDate))
      .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
  }, [events]);

  // Navigation
  const goToPrevMonth = () => {
    const prev = subMonths(currentDate, 1);
    onMonthChange?.(prev.getFullYear(), prev.getMonth() + 1);
  };

  const goToNextMonth = () => {
    const next = addMonths(currentDate, 1);
    onMonthChange?.(next.getFullYear(), next.getMonth() + 1);
  };

  // Drag and Drop handlers
  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>, event: SalesEvent) => {
    if (!canEdit) return;
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', event.id);
    const dragElement = e.currentTarget;
    if (dragElement) {
      e.dataTransfer.setDragImage(dragElement, 10, 10);
    }
  }, [canEdit]);

  const handleDragEnd = useCallback(() => {
    setDraggedEvent(null);
    setDragOverDate(null);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>, dateKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(dateKey);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverDate(null);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>, targetDate: Date) => {
    e.preventDefault();
    setDragOverDate(null);
    
    if (!draggedEvent || !canEdit) return;
    
    const originalDate = typeof draggedEvent.eventDate === 'string'
      ? parseISO(draggedEvent.eventDate)
      : draggedEvent.eventDate;
    
    // 같은 날짜면 무시
    if (isSameDay(originalDate, targetDate)) {
      setDraggedEvent(null);
      return;
    }
    
    // 기간 일정인 경우 기간도 함께 이동
    const daysDiff = differenceInDays(targetDate, originalDate);
    const updateData: { id: string; eventDate: string; endDate?: string } = {
      id: draggedEvent.id,
      eventDate: targetDate.toISOString(),
    };
    
    if (draggedEvent.endDate) {
      const originalEndDate = typeof draggedEvent.endDate === 'string'
        ? parseISO(draggedEvent.endDate)
        : draggedEvent.endDate;
      const newEndDate = new Date(originalEndDate);
      newEndDate.setDate(newEndDate.getDate() + daysDiff);
      updateData.endDate = newEndDate.toISOString();
    }
    
    updateDateMutation.mutate(updateData);
    setDraggedEvent(null);
  }, [draggedEvent, canEdit, updateDateMutation]);

  // Modal handlers
  const openAddModal = (date?: Date) => {
    setEditingEvent(null);
    setFormTitle('');
    setFormDescription('');
    setFormEventDate(format(date || new Date(), 'yyyy-MM-dd'));
    setFormEndDate('');
    setFormIsRange(false);
    setFormEventType('other');
    setFormColor('#3b82f6');
    setSelectedDate(date || null);
    setIsEventModalOpen(true);
  };

  const openEditModal = (event: SalesEvent) => {
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormDescription(event.description || '');
    const eventDate = typeof event.eventDate === 'string' 
      ? parseISO(event.eventDate) 
      : event.eventDate;
    setFormEventDate(format(eventDate, 'yyyy-MM-dd'));
    
    if (event.endDate) {
      const endDate = typeof event.endDate === 'string' 
        ? parseISO(event.endDate) 
        : event.endDate;
      setFormEndDate(format(endDate, 'yyyy-MM-dd'));
      setFormIsRange(true);
    } else {
      setFormEndDate('');
      setFormIsRange(false);
    }
    
    setFormEventType(event.eventType);
    setFormColor(event.color || '#3b82f6');
    setIsEventModalOpen(true);
  };

  const closeModal = () => {
    setIsEventModalOpen(false);
    setEditingEvent(null);
    setSelectedDate(null);
  };

  const handleSubmit = () => {
    if (!formTitle.trim()) {
      toast.error('일정 제목을 입력해주세요.');
      return;
    }

    if (formIsRange && formEndDate && formEndDate < formEventDate) {
      toast.error('종료일은 시작일 이후여야 합니다.');
      return;
    }

    if (editingEvent) {
      updateMutation.mutate({
        id: editingEvent.id,
        title: formTitle,
        description: formDescription || undefined,
        eventDate: new Date(formEventDate).toISOString(),
        endDate: formIsRange && formEndDate ? new Date(formEndDate).toISOString() : undefined,
        eventType: formEventType,
        color: formColor,
      });
    } else {
      createMutation.mutate({
        title: formTitle,
        description: formDescription || undefined,
        eventDate: new Date(formEventDate).toISOString(),
        endDate: formIsRange && formEndDate ? new Date(formEndDate).toISOString() : undefined,
        eventType: formEventType,
        color: formColor,
      });
    }
  };

  const handleDelete = (eventId: string) => {
    setDeletingEventId(eventId);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (deletingEventId) {
      deleteMutation.mutate({ id: deletingEventId });
    }
  };

  const today = startOfDay(new Date());

  // Helper: 일정이 해당 날짜에서 시작/중간/끝인지 확인
  const getEventPosition = (event: SalesEvent, day: Date): 'start' | 'middle' | 'end' | 'single' => {
    const startDate = typeof event.eventDate === 'string' ? parseISO(event.eventDate) : event.eventDate;
    const endDate = event.endDate 
      ? (typeof event.endDate === 'string' ? parseISO(event.endDate) : event.endDate)
      : null;
    
    if (!endDate || isSameDay(startDate, endDate)) return 'single';
    if (isSameDay(day, startDate)) return 'start';
    if (isSameDay(day, endDate)) return 'end';
    return 'middle';
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">주요 일정</h3>
          {canEdit && (
            <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
              (드래그하여 날짜 변경)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[100px] text-center">
            {format(currentDate, 'yyyy년 M월', { locale: ko })}
          </span>
          <Button variant="ghost" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => openAddModal()} className="ml-2">
              <Plus className="w-4 h-4 mr-1" />
              일정 추가
            </Button>
          )}
        </div>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="flex flex-col lg:flex-row">
        {/* Left: Calendar (50%) */}
        <div className="lg:w-1/2 p-4 border-b lg:border-b-0 lg:border-r border-border">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                  <div 
                    key={day} 
                    className={`text-center text-xs font-medium py-1 ${
                      idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-muted-foreground'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days with event titles */}
              <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map((day, idx) => {
                  if (!day) {
                    return <div key={`empty-${idx}`} className="min-h-[80px]" />;
                  }
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const dayEvents = eventsByDate.get(dateKey) || [];
                  const isToday = isSameDay(day, today);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const dayOfWeek = day.getDay();
                  const isDragOver = dragOverDate === dateKey;

                  return (
                    <div
                      key={dateKey}
                      className={`min-h-[80px] p-1 rounded cursor-pointer transition-all flex flex-col ${
                        isDragOver
                          ? 'bg-primary/30 ring-2 ring-primary scale-[1.02]'
                          : isSelected 
                            ? 'bg-primary/20 ring-1 ring-primary' 
                            : isToday 
                              ? 'bg-primary/10' 
                              : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedDate(day)}
                      onDragOver={(e) => handleDragOver(e, dateKey)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, day)}
                    >
                      {/* Date number */}
                      <div className={`text-xs font-medium mb-1 ${
                        dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : 'text-foreground'
                      }`}>
                        <span className={isToday ? 'bg-primary text-white rounded-full w-5 h-5 inline-flex items-center justify-center' : ''}>
                          {format(day, 'd')}
                        </span>
                      </div>
                      
                      {/* Event titles */}
                      <div className="flex-1 overflow-hidden space-y-0.5">
                        {dayEvents.slice(0, 3).map((event) => {
                          const position = getEventPosition(event, day);
                          const eventColor = event.color || EVENT_TYPES[event.eventType].color;
                          
                          return (
                            <div
                              key={event.id}
                              draggable={canEdit}
                              onDragStart={(e) => handleDragStart(e, event)}
                              onDragEnd={handleDragEnd}
                              className={`text-[10px] px-1 py-0.5 truncate transition-all ${
                                canEdit ? 'cursor-grab active:cursor-grabbing hover:opacity-80' : ''
                              } ${draggedEvent?.id === event.id ? 'opacity-50' : ''} ${
                                position === 'start' ? 'rounded-l' :
                                position === 'end' ? 'rounded-r' :
                                position === 'middle' ? '' : 'rounded'
                              }`}
                              style={{ 
                                backgroundColor: `${eventColor}30`,
                                color: eventColor,
                                borderLeft: position === 'start' || position === 'single' ? `2px solid ${eventColor}` : 'none',
                              }}
                              title={`${event.title}${event.endDate ? ` (${format(event.eventDate, 'M/d')} ~ ${format(event.endDate, 'M/d')})` : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (canEdit) openEditModal(event);
                              }}
                            >
                              {(position === 'start' || position === 'single') ? event.title : ''}
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-[9px] text-muted-foreground px-1">
                            +{dayEvents.length - 3}개 더
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Date Info */}
              {selectedDate && (
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">
                      {format(selectedDate, 'M월 d일 (EEEE)', { locale: ko })}
                    </h4>
                    {canEdit && (
                      <Button size="sm" variant="ghost" onClick={() => openAddModal(selectedDate)}>
                        <Plus className="w-3 h-3 mr-1" />
                        추가
                      </Button>
                    )}
                  </div>
                  {(() => {
                    const selectedDateEvents = eventsByDate.get(format(selectedDate, 'yyyy-MM-dd')) || [];
                    return selectedDateEvents.length === 0 ? (
                      <p className="text-xs text-muted-foreground">등록된 일정이 없습니다.</p>
                    ) : (
                      <div className="space-y-1">
                        {selectedDateEvents.map((event) => (
                          <div
                            key={event.id}
                            draggable={canEdit}
                            onDragStart={(e) => handleDragStart(e, event)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center gap-2 text-xs p-1.5 rounded bg-background ${
                              canEdit ? 'cursor-grab active:cursor-grabbing' : ''
                            } ${draggedEvent?.id === event.id ? 'opacity-50' : ''}`}
                          >
                            {canEdit && (
                              <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
                            )}
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: event.color || EVENT_TYPES[event.eventType].color }}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="truncate block">{event.title}</span>
                              {event.endDate && (
                                <span className="text-[10px] text-muted-foreground">
                                  {format(event.eventDate, 'M/d')} ~ {format(event.endDate, 'M/d')}
                                </span>
                              )}
                            </div>
                            {canEdit && (
                              <div className="flex gap-0.5 shrink-0">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-5 w-5"
                                  onClick={() => openEditModal(event)}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-5 w-5 text-destructive"
                                  onClick={() => handleDelete(event.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Events List (50%) */}
        <div className="lg:w-1/2 p-4">
          <div className="flex items-center gap-2 mb-3">
            <List className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-sm">{month}월 주요 일정</h4>
            <span className="text-xs text-muted-foreground">({monthlyEventsList.length}건)</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : monthlyEventsList.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">등록된 일정이 없습니다.</p>
              {canEdit && (
                <Button size="sm" variant="outline" className="mt-3" onClick={() => openAddModal()}>
                  <Plus className="w-4 h-4 mr-1" />
                  일정 추가
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {monthlyEventsList.map((event) => {
                const isPast = isBefore(event.eventDate, today) && (!event.endDate || isBefore(event.endDate, today));
                const isEventToday = isSameDay(event.eventDate, today) || 
                  (event.endDate && isWithinInterval(today, { start: event.eventDate, end: event.endDate }));
                const isRangeEvent = event.endDate && !isSameDay(event.eventDate, event.endDate);
                
                return (
                  <div
                    key={event.id}
                    draggable={canEdit}
                    onDragStart={(e) => handleDragStart(e, event)}
                    onDragEnd={handleDragEnd}
                    className={`p-3 rounded-lg border transition-all ${
                      isEventToday 
                        ? 'bg-primary/10 border-primary/30' 
                        : isPast 
                          ? 'bg-muted/30 border-border opacity-60' 
                          : 'bg-background border-border hover:border-primary/30'
                    } ${canEdit ? 'cursor-grab active:cursor-grabbing' : ''} ${
                      draggedEvent?.id === event.id ? 'opacity-50 scale-95' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Drag Handle */}
                      {canEdit && (
                        <div className="shrink-0 pt-1">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      
                      {/* Date Badge */}
                      <div className={`shrink-0 w-14 text-center py-1 rounded ${
                        isEventToday 
                          ? 'bg-primary text-white' 
                          : isPast 
                            ? 'bg-muted text-muted-foreground' 
                            : 'bg-muted/50 text-foreground'
                      }`}>
                        <div className="text-xs font-medium">
                          {format(event.eventDate, 'M/d')}
                        </div>
                        {isRangeEvent ? (
                          <div className="text-[10px]">
                            ~{format(event.endDate!, 'M/d')}
                          </div>
                        ) : (
                          <div className="text-[10px]">
                            {format(event.eventDate, 'EEE', { locale: ko })}
                          </div>
                        )}
                      </div>

                      {/* Event Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                            style={{ 
                              backgroundColor: `${event.color || EVENT_TYPES[event.eventType].color}20`,
                              color: event.color || EVENT_TYPES[event.eventType].color
                            }}
                          >
                            {EVENT_TYPES[event.eventType].label}
                          </span>
                          {isRangeEvent && (
                            <CalendarRange className="w-3 h-3 text-muted-foreground shrink-0" />
                          )}
                          <h5 className={`font-medium text-sm truncate ${isPast && !isEventToday ? 'line-through' : ''}`}>
                            {event.title}
                          </h5>
                        </div>
                        {event.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {event.description}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      {canEdit && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => openEditModal(event)}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(event.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Event Modal */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? '일정 수정' : '새 일정 추가'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">일정 제목 *</Label>
              <Input
                id="title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="일정 제목을 입력하세요"
              />
            </div>
            
            {/* 기간 설정 체크박스 */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRange"
                checked={formIsRange}
                onCheckedChange={(checked) => setFormIsRange(checked === true)}
              />
              <Label htmlFor="isRange" className="text-sm font-normal cursor-pointer">
                기간 일정으로 등록
              </Label>
            </div>
            
            <div className={`grid gap-4 ${formIsRange ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div className="space-y-2">
                <Label htmlFor="eventDate">{formIsRange ? '시작일 *' : '날짜 *'}</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={formEventDate}
                  onChange={(e) => setFormEventDate(e.target.value)}
                />
              </div>
              {formIsRange && (
                <div className="space-y-2">
                  <Label htmlFor="endDate">종료일 *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    min={formEventDate}
                  />
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="eventType">일정 유형</Label>
              <Select value={formEventType} onValueChange={(v) => setFormEventType(v as EventType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_TYPES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">색상</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">{formColor}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="일정에 대한 설명을 입력하세요"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              취소
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingEvent ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle>일정 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            이 일정을 삭제하시겠습니까? 삭제된 일정은 복구할 수 없습니다.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              취소
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
