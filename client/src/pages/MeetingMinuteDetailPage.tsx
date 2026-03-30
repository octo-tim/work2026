/**
 * Meeting Minute Detail Page - 회의록 작성/상세보기
 */

import { useState, useEffect, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Save, Trash2, Plus, X, Check } from 'lucide-react';
import { useLocation, useParams } from 'wouter';
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

interface ActionItem {
  task: string;
  assignee: string;
  dueDate: string;
}

export default function MeetingMinuteDetailPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const isNew = params.id === 'new';

  // Form state
  const [meetingDate, setMeetingDate] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocationValue] = useState('');
  const [attendees, setAttendees] = useState<string[]>([]);
  const [newAttendee, setNewAttendee] = useState('');
  const [content, setContent] = useState('');
  const [decisions, setDecisions] = useState('');
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [nextMeetingDate, setNextMeetingDate] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(isNew);

  // 활성 멤버 목록 가져오기
  const { data: activeMembers } = trpc.member.activeList.useQuery();
  const memberNames = useMemo(() => {
    if (!activeMembers) return [];
    return activeMembers.map(m => m.koreanName || m.name || '').filter(Boolean);
  }, [activeMembers]);

  // tRPC queries
  const { data: minute, isLoading } = trpc.meetingMinutes.get.useQuery(
    { id: params.id || '' },
    { enabled: !isNew && !!params.id }
  );

  // Mutations
  const createMutation = trpc.meetingMinutes.create.useMutation({
    onSuccess: (data) => {
      toast.success('회의록이 작성되었습니다.');
      setLocation(`/meetings/${data.id}`);
    },
    onError: (err) => toast.error('작성 실패: ' + err.message),
  });

  const updateMutation = trpc.meetingMinutes.update.useMutation({
    onSuccess: () => {
      toast.success('회의록이 수정되었습니다.');
      setIsEditing(false);
    },
    onError: (err) => toast.error('수정 실패: ' + err.message),
  });

  const deleteMutation = trpc.meetingMinutes.delete.useMutation({
    onSuccess: () => {
      toast.success('회의록이 삭제되었습니다.');
      setLocation('/meetings');
    },
    onError: (err) => toast.error('삭제 실패: ' + err.message),
  });

  // Load existing data
  useEffect(() => {
    if (minute) {
      setMeetingDate(new Date(minute.meetingDate).toISOString().split('T')[0]);
      setTitle(minute.title);
      setLocationValue(minute.location || '');
      setContent(minute.content || '');
      setDecisions(minute.decisions || '');
      setNextMeetingDate(minute.nextMeetingDate ? new Date(minute.nextMeetingDate).toISOString().split('T')[0] : '');
      
      // Parse attendees
      if (minute.attendees) {
        try {
          setAttendees(JSON.parse(minute.attendees));
        } catch {
          setAttendees(minute.attendees.split(',').map(a => a.trim()));
        }
      }
      
      // Parse action items
      if (minute.actionItems) {
        try {
          setActionItems(JSON.parse(minute.actionItems));
        } catch {
          setActionItems([]);
        }
      }
    }
  }, [minute]);

  // Set default date for new meeting
  useEffect(() => {
    if (isNew) {
      setMeetingDate(new Date().toISOString().split('T')[0]);
    }
  }, [isNew]);

  // Handlers
  const handleAddAttendee = () => {
    if (newAttendee.trim()) {
      setAttendees([...attendees, newAttendee.trim()]);
      setNewAttendee('');
    }
  };

  const handleRemoveAttendee = (index: number) => {
    setAttendees(attendees.filter((_, i) => i !== index));
  };

  const handleAddActionItem = () => {
    setActionItems([...actionItems, { task: '', assignee: '', dueDate: '' }]);
  };

  const handleUpdateActionItem = (index: number, field: keyof ActionItem, value: string) => {
    const updated = [...actionItems];
    updated[index] = { ...updated[index], [field]: value };
    setActionItems(updated);
  };

  const handleRemoveActionItem = (index: number) => {
    setActionItems(actionItems.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!meetingDate || !title) {
      toast.error('회의 일자와 주제는 필수입니다.');
      return;
    }

    const data = {
      meetingDate,
      title,
      location: location || undefined,
      attendees: attendees.length > 0 ? JSON.stringify(attendees) : undefined,
      content: content || undefined,
      decisions: decisions || undefined,
      actionItems: actionItems.length > 0 ? JSON.stringify(actionItems) : undefined,
      nextMeetingDate: nextMeetingDate || undefined,
    };

    if (isNew) {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate({ id: params.id!, ...data });
    }
  };

  const handleDelete = () => {
    if (params.id) {
      deleteMutation.mutate({ id: params.id });
    }
    setDeleteDialogOpen(false);
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  if (!isNew && isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation('/meetings')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">
              {isNew ? '회의록 작성' : isEditing ? '회의록 수정' : '회의록 상세'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {!isNew && !isEditing && (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  수정
                </Button>
                <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  삭제
                </Button>
              </>
            )}
            {(isNew || isEditing) && (
              <>
                {!isNew && (
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    취소
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  저장
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="bg-card rounded-lg border border-border p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meetingDate">회의 일자 *</Label>
              {isEditing ? (
                <Input
                  id="meetingDate"
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                />
              ) : (
                <p className="text-foreground py-2">{meetingDate ? formatDate(meetingDate) : '-'}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">장소</Label>
              {isEditing ? (
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocationValue(e.target.value)}
                  placeholder="회의 장소"
                />
              ) : (
                <p className="text-foreground py-2">{location || '-'}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">회의 주제 *</Label>
            {isEditing ? (
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="회의 주제를 입력하세요"
              />
            ) : (
              <p className="text-lg font-medium text-foreground py-2">{title}</p>
            )}
          </div>

          {/* Attendees */}
          <div className="space-y-2">
            <Label>참석자</Label>
            {isEditing ? (
              <div className="space-y-2">
                {memberNames.length > 0 ? (
                  <div className="flex gap-2">
                    <select
                      value={newAttendee}
                      onChange={(e) => setNewAttendee(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">참석자 선택</option>
                      {memberNames.filter(n => !attendees.includes(n)).map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    <Button type="button" variant="outline" onClick={handleAddAttendee} disabled={!newAttendee}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={newAttendee}
                      onChange={(e) => setNewAttendee(e.target.value)}
                      placeholder="참석자 이름"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAttendee())}
                    />
                    <Button type="button" variant="outline" onClick={handleAddAttendee}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {attendees.map((attendee, idx) => (
                    <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                      {attendee}
                      <button onClick={() => handleRemoveAttendee(idx)} className="ml-1 hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 py-2">
                {attendees.length > 0 ? (
                  attendees.map((attendee, idx) => (
                    <Badge key={idx} variant="secondary">{attendee}</Badge>
                  ))
                ) : (
                  <p className="text-muted-foreground">-</p>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">회의 내용</Label>
            {isEditing ? (
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="회의 내용을 입력하세요"
                rows={6}
              />
            ) : (
              <div className="bg-muted/50 rounded-lg p-4 min-h-[100px] whitespace-pre-wrap">
                {content || <span className="text-muted-foreground">-</span>}
              </div>
            )}
          </div>

          {/* Decisions */}
          <div className="space-y-2">
            <Label htmlFor="decisions">결정 사항</Label>
            {isEditing ? (
              <Textarea
                id="decisions"
                value={decisions}
                onChange={(e) => setDecisions(e.target.value)}
                placeholder="결정 사항을 입력하세요"
                rows={4}
              />
            ) : (
              <div className="bg-muted/50 rounded-lg p-4 min-h-[80px] whitespace-pre-wrap">
                {decisions || <span className="text-muted-foreground">-</span>}
              </div>
            )}
          </div>

          {/* Action Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>액션 아이템</Label>
              {isEditing && (
                <Button type="button" variant="outline" size="sm" onClick={handleAddActionItem}>
                  <Plus className="w-4 h-4 mr-1" />
                  추가
                </Button>
              )}
            </div>
            {isEditing ? (
              <div className="space-y-3">
                {actionItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-start p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <Input
                        value={item.task}
                        onChange={(e) => handleUpdateActionItem(idx, 'task', e.target.value)}
                        placeholder="할 일"
                      />
                      {memberNames.length > 0 ? (
                        <select
                          value={item.assignee}
                          onChange={(e) => handleUpdateActionItem(idx, 'assignee', e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="">담당자 선택</option>
                          {memberNames.map(name => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          value={item.assignee}
                          onChange={(e) => handleUpdateActionItem(idx, 'assignee', e.target.value)}
                          placeholder="담당자"
                        />
                      )}
                      <Input
                        type="date"
                        value={item.dueDate}
                        onChange={(e) => handleUpdateActionItem(idx, 'dueDate', e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveActionItem(idx)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {actionItems.length === 0 && (
                  <p className="text-muted-foreground text-sm py-2">액션 아이템이 없습니다.</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {actionItems.length > 0 ? (
                  actionItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{item.task}</p>
                        <p className="text-sm text-muted-foreground">
                          담당: {item.assignee || '-'} | 기한: {item.dueDate || '-'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground py-2">-</p>
                )}
              </div>
            )}
          </div>

          {/* Next Meeting */}
          <div className="space-y-2">
            <Label htmlFor="nextMeetingDate">다음 회의 일정</Label>
            {isEditing ? (
              <Input
                id="nextMeetingDate"
                type="date"
                value={nextMeetingDate}
                onChange={(e) => setNextMeetingDate(e.target.value)}
              />
            ) : (
              <p className="text-foreground py-2">
                {nextMeetingDate ? formatDate(nextMeetingDate) : '-'}
              </p>
            )}
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>회의록 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                이 회의록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
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
