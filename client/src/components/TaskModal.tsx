/**
 * TaskModal Component
 * Design: Japanese Zen Minimalism
 * Mobile Responsive
 * - 깔끔한 폼 레이아웃
 * - 충분한 여백과 명확한 레이블
 * - 부드러운 전환 애니메이션
 * - 파일 첨부 기능 (드래그&드롭 + 클릭 선택)
 */

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Task, TaskStatus, STATUS_LABELS } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { useForm } from 'react-hook-form';
import { trpc } from '@/lib/trpc';
import { Plus, Trash2, Calendar, Paperclip, Upload, FileText, Image, File, X, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProgressLog {
  id?: number;
  logDate: Date;
  content: string;
}

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

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  onSubmit: (data: TaskFormData) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image className="w-4 h-4 text-violet-500" />;
  if (mimeType.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />;
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileText className="w-4 h-4 text-green-500" />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="w-4 h-4 text-blue-500" />;
  return <File className="w-4 h-4 text-muted-foreground" />;
}

export function TaskModal({ open, onOpenChange, task, onSubmit }: TaskModalProps) {
  const isEditing = !!task;
  const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([]);
  const [isSavingLogs, setIsSavingLogs] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 관리자가 생성한 사업부 목록 가져오기
  const { data: divisions } = trpc.organization.division.listActive.useQuery();
  // 관리자가 생성한 팀 목록 가져오기
  const { data: teams } = trpc.organization.team.listActive.useQuery();
  // 활성 멤버 목록 가져오기 (담당자 드롭다운용)
  const { data: activeMembers } = trpc.member.activeList.useQuery();
  
  // 업무 진행 이력 조회
  const { data: existingLogs, refetch: refetchLogs } = trpc.task.getProgressLogs.useQuery(
    { taskId: task?.id ?? '' },
    { enabled: !!task?.id && open }
  );

  // 첨부파일 조회
  const { data: attachments, refetch: refetchAttachments } = trpc.task.getAttachments.useQuery(
    { taskId: task?.id ?? '' },
    { enabled: !!task?.id && open }
  );

  // 파일 업로드 mutation
  const uploadMutation = trpc.task.uploadAttachment.useMutation({
    onSuccess: () => {
      refetchAttachments();
    },
    onError: (error) => {
      toast.error(`파일 업로드 실패: ${error.message}`);
    }
  });

  // 파일 삭제 mutation
  const deleteMutation = trpc.task.deleteAttachment.useMutation({
    onSuccess: () => {
      toast.success('파일이 삭제되었습니다.');
      refetchAttachments();
    },
    onError: (error) => {
      toast.error(`파일 삭제 실패: ${error.message}`);
    }
  });
  
  // 업무 진행 이력 저장 mutation
  const saveProgressLogsMutation = trpc.task.saveProgressLogs.useMutation({
    onSuccess: () => {
      toast.success('진행 이력이 저장되었습니다.');
      refetchLogs();
    },
    onError: (error) => {
      toast.error(`진행 이력 저장 실패: ${error.message}`);
    }
  });
  
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<TaskFormData>({
    defaultValues: {
      title: '',
      department: '',
      assignee: '',
      schedule: '',
      details: '',
      status: 'pending',
      startDate: null,
      dueDate: null
    }
  });

  const currentStatus = watch('status');
  const currentDepartment = watch('department');
  const currentStartDate = watch('startDate');
  const currentDueDate = watch('dueDate');

  // 사업부와 팀을 합쳐서 부서 목록 생성
  const departmentOptions = useMemo(() => {
    const options: { value: string; label: string; type: 'division' | 'team' }[] = [];
    
    if (divisions && divisions.length > 0) {
      divisions.forEach(div => {
        options.push({ value: div.name, label: div.name, type: 'division' });
      });
    }
    
    if (teams && teams.length > 0) {
      teams.forEach(team => {
        options.push({ value: team.name, label: team.name, type: 'team' });
      });
    }
    
    return options;
  }, [divisions, teams]);

  // 기존 진행 이력 로드
  useEffect(() => {
    if (open && task?.id && existingLogs) {
      setProgressLogs(existingLogs.map(log => ({
        id: log.id,
        logDate: new Date(log.logDate),
        content: log.content
      })));
    }
  }, [existingLogs, open, task?.id]);

  // 모달이 열리거나 task가 변경될 때 초기화
  useEffect(() => {
    if (open) {
      setProgressLogs([]);
      setUploadingFiles([]);
      
      if (task) {
        reset({
          title: task.title,
          department: task.department ?? '',
          assignee: task.assignee ?? '',
          schedule: task.schedule ?? '',
          details: task.details ?? '',
          status: task.status,
          startDate: task.startDate ? new Date(task.startDate) : null,
          dueDate: task.dueDate ? new Date(task.dueDate) : null
        });
      } else {
        reset({
          title: '',
          department: '',
          assignee: '',
          schedule: '',
          details: '',
          status: 'pending',
          startDate: null,
          dueDate: null
        });
      }
    }
  }, [open, task?.id, reset]);

  // 파일 업로드 처리
  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    if (!task?.id) {
      toast.error('업무를 먼저 저장한 후 파일을 첨부할 수 있습니다.');
      return;
    }

    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" 파일이 10MB를 초과합니다.`);
        continue;
      }

      setUploadingFiles(prev => [...prev, file.name]);
      
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data:xxx;base64, prefix
            const base64Data = result.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        await uploadMutation.mutateAsync({
          taskId: task.id,
          fileName: file.name,
          fileBase64: base64,
          mimeType: file.type || 'application/octet-stream',
          fileSize: file.size,
        });

        toast.success(`"${file.name}" 업로드 완료`);
      } catch (error) {
        console.error('File upload error:', error);
      } finally {
        setUploadingFiles(prev => prev.filter(name => name !== file.name));
      }
    }
  }, [task?.id, uploadMutation]);

  // 드래그 앤 드롭 핸들러
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  // 파일 삭제
  const handleDeleteAttachment = useCallback((id: number) => {
    deleteMutation.mutate({ id });
  }, [deleteMutation]);

  // 진행 이력 추가
  const addProgressLog = () => {
    setProgressLogs([...progressLogs, { logDate: new Date(), content: '' }]);
  };

  // 진행 이력 삭제
  const removeProgressLog = (index: number) => {
    setProgressLogs(progressLogs.filter((_, i) => i !== index));
  };

  // 진행 이력 수정
  const updateProgressLog = (index: number, field: 'logDate' | 'content', value: Date | string) => {
    const updated = [...progressLogs];
    if (field === 'logDate') {
      updated[index].logDate = value as Date;
    } else {
      updated[index].content = value as string;
    }
    setProgressLogs(updated);
  };

  const handleFormSubmit = async (data: TaskFormData) => {
    onSubmit(data);
    
    if (isEditing && task?.id) {
      setIsSavingLogs(true);
      try {
        const validLogs = progressLogs.filter(log => log.content.trim() !== '');
        await saveProgressLogsMutation.mutateAsync({
          taskId: task.id,
          logs: validLogs.map(log => ({
            logDate: log.logDate,
            content: log.content
          }))
        });
      } catch (error) {
        console.error('Failed to save progress logs:', error);
      } finally {
        setIsSavingLogs(false);
      }
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[600px] p-0 gap-0 overflow-hidden max-h-[90vh] sm:max-h-[85vh] flex flex-col">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-border shrink-0">
          <DialogTitle className="text-base sm:text-lg font-medium">
            {isEditing ? '업무 수정' : '새 업무 추가'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col overflow-hidden flex-1 min-h-0">
          <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
            {/* Title */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="title" className="text-xs sm:text-sm font-medium">
                업무 제목 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="업무 제목을 입력하세요"
                {...register('title', { required: '업무 제목은 필수입니다' })}
                className="h-9 sm:h-10 text-sm"
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            {/* Department & Assignee */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="department" className="text-xs sm:text-sm font-medium">
                  담당부서
                </Label>
                {departmentOptions.length > 0 ? (
                  <Select
                    value={currentDepartment || undefined}
                    onValueChange={(value: string) => setValue('department', value)}
                  >
                    <SelectTrigger className="h-9 sm:h-10 text-sm">
                      <SelectValue placeholder="부서 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {divisions && divisions.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            사업부
                          </div>
                          {divisions.map(div => (
                            <SelectItem key={`div-${div.id}`} value={div.name}>
                              {div.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {teams && teams.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">
                            팀
                          </div>
                          {teams.map(team => (
                            <SelectItem key={`team-${team.id}`} value={team.name}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="department"
                    placeholder="예: 채널영업팀"
                    {...register('department')}
                    className="h-9 sm:h-10 text-sm"
                  />
                )}
                {departmentOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    관리자가 조직설정에서 부서를 등록하면 선택할 수 있습니다
                  </p>
                )}
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="assignee" className="text-xs sm:text-sm font-medium">
                  담당자
                </Label>
                {activeMembers && activeMembers.length > 0 ? (
                  <Select
                    value={watch('assignee') || undefined}
                    onValueChange={(val) => setValue('assignee', val)}
                  >
                    <SelectTrigger className="h-9 sm:h-10 text-sm">
                      <SelectValue placeholder="담당자 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeMembers.map((member) => (
                        <SelectItem key={member.id} value={member.koreanName || member.name || `사용자${member.id}`}>
                          {member.koreanName || member.name || `사용자${member.id}`}
                          {member.teamName && <span className="text-muted-foreground ml-1">({member.teamName})</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="assignee"
                    placeholder="예: 홍길동"
                    {...register('assignee')}
                    className="h-9 sm:h-10 text-sm"
                  />
                )}
                {(!activeMembers || activeMembers.length === 0) && (
                  <p className="text-xs text-muted-foreground">
                    멤버관리에서 프로필이 완성된 멤버가 등록되면 선택할 수 있습니다
                  </p>
                )}
              </div>
            </div>

            {/* Start Date & Due Date */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="startDate" className="text-xs sm:text-sm font-medium">
                  시작일
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={currentStartDate ? new Date(currentStartDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setValue('startDate', e.target.value ? new Date(e.target.value) : null)}
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="dueDate" className="text-xs sm:text-sm font-medium">
                  완료일
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={currentDueDate ? new Date(currentDueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setValue('dueDate', e.target.value ? new Date(e.target.value) : null)}
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
            </div>

            {/* Schedule & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="schedule" className="text-xs sm:text-sm font-medium">
                  일정 메모
                </Label>
                <Input
                  id="schedule"
                  placeholder="예: 2월초, 3월말"
                  {...register('schedule')}
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="status" className="text-xs sm:text-sm font-medium">
                  상태
                </Label>
                <Select
                  value={currentStatus}
                  onValueChange={(value: TaskStatus) => setValue('status', value)}
                >
                  <SelectTrigger className="h-9 sm:h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{STATUS_LABELS.pending}</SelectItem>
                    <SelectItem value="in-progress">{STATUS_LABELS['in-progress']}</SelectItem>
                    <SelectItem value="completed">{STATUS_LABELS.completed}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Progress Logs - 업무 진행 이력 (수정 모드에서만 표시) */}
            {isEditing && (
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs sm:text-sm font-medium">
                    업무 진행 이력
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addProgressLog}
                    className="h-7 sm:h-8 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    이력 추가
                  </Button>
                </div>
                
                {progressLogs.length === 0 ? (
                  <div className="text-xs sm:text-sm text-muted-foreground text-center py-3 sm:py-4 border border-dashed rounded-lg">
                    진행 이력이 없습니다. "이력 추가" 버튼을 클릭하여 추가하세요.
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {progressLogs.map((log, index) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-2 p-2.5 sm:p-3 bg-muted/30 rounded-lg border border-border">
                        <div className="flex gap-2 sm:flex-col sm:w-[130px] sm:shrink-0">
                          <div className="flex-1 sm:flex-none">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <Calendar className="w-3 h-3" />
                              일자
                            </div>
                            <Input
                              type="date"
                              value={log.logDate ? new Date(log.logDate).toISOString().split('T')[0] : ''}
                              onChange={(e) => updateProgressLog(index, 'logDate', e.target.value ? new Date(e.target.value) : new Date())}
                              className="h-8 text-xs sm:text-sm"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProgressLog(index)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0 self-end sm:hidden"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground mb-1">내용</div>
                          <Textarea
                            value={log.content}
                            onChange={(e) => updateProgressLog(index, 'content', e.target.value)}
                            placeholder="진행 내용을 입력하세요"
                            className="min-h-[50px] sm:min-h-[60px] text-xs sm:text-sm resize-none"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProgressLog(index)}
                          className="hidden sm:flex h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0 mt-5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* File Attachments - 파일 첨부 (수정 모드에서만 표시) */}
            {isEditing && (
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />
                    첨부파일
                  </Label>
                  <span className="text-xs text-muted-foreground">최대 10MB</span>
                </div>

                {/* 드래그 앤 드롭 영역 */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative cursor-pointer rounded-lg border-2 border-dashed transition-all duration-200
                    ${isDragging 
                      ? 'border-primary bg-primary/5 scale-[1.01]' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/30'
                    }
                    py-4 sm:py-5 px-4 text-center
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        handleFileUpload(e.target.files);
                        e.target.value = '';
                      }
                    }}
                  />
                  <Upload className={`w-6 h-6 mx-auto mb-2 transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {isDragging ? (
                      <span className="text-primary font-medium">여기에 파일을 놓으세요</span>
                    ) : (
                      <>파일을 드래그하거나 <span className="text-primary font-medium underline">클릭하여 선택</span></>
                    )}
                  </p>
                </div>

                {/* 업로드 중인 파일 */}
                {uploadingFiles.length > 0 && (
                  <div className="space-y-1.5">
                    {uploadingFiles.map((fileName) => (
                      <div key={fileName} className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border animate-pulse">
                        <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                        <span className="text-xs sm:text-sm truncate flex-1">{fileName}</span>
                        <span className="text-xs text-muted-foreground shrink-0">업로드 중...</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 첨부된 파일 목록 */}
                {attachments && attachments.length > 0 && (
                  <div className="space-y-1.5">
                    {attachments.map((file) => (
                      <div key={file.id} className="flex items-center gap-2 px-3 py-2 bg-muted/20 rounded-lg border border-border group hover:bg-muted/40 transition-colors">
                        {getFileIcon(file.mimeType ?? 'application/octet-stream')}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm truncate font-medium">{file.fileName}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {formatFileSize(file.fileSize ?? 0)}
                            {file.createdAt && ` · ${new Date(file.createdAt).toLocaleDateString('ko-KR')}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-md hover:bg-background transition-colors text-muted-foreground hover:text-primary"
                            title="다운로드"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAttachment(file.id);
                            }}
                            className="p-1.5 rounded-md hover:bg-background transition-colors text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                            title="삭제"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 첨부파일 없을 때 */}
                {(!attachments || attachments.length === 0) && uploadingFiles.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    첨부된 파일이 없습니다.
                  </p>
                )}
              </div>
            )}

            {/* Details */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="details" className="text-xs sm:text-sm font-medium">
                업무 상세 (기타 메모)
              </Label>
              <Textarea
                id="details"
                placeholder="업무 관련 추가 메모를 입력하세요"
                {...register('details')}
                className="min-h-[60px] sm:min-h-[80px] resize-none text-sm"
              />
            </div>
          </div>

          <DialogFooter className="px-4 sm:px-6 py-3 sm:py-4 border-t border-border bg-muted/30 shrink-0 flex-col sm:flex-row gap-2 sticky bottom-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto sm:mr-2 order-2 sm:order-1"
            >
              취소
            </Button>
            <Button type="submit" className="w-full sm:w-auto sm:min-w-[80px] order-1 sm:order-2" disabled={isSavingLogs || uploadingFiles.length > 0}>
              {isSavingLogs ? '저장 중...' : (isEditing ? '수정' : '추가')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
