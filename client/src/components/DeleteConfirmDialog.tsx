/**
 * DeleteConfirmDialog Component
 * Design: Japanese Zen Minimalism
 * - 간결한 확인 메시지
 * - 명확한 액션 버튼
 */

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

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  taskTitle?: string;
}

export function DeleteConfirmDialog({ 
  open, 
  onOpenChange, 
  onConfirm,
  taskTitle 
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[400px]">
        <AlertDialogHeader>
          <AlertDialogTitle>업무 삭제</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {taskTitle ? (
              <>
                <span className="font-medium text-foreground">"{taskTitle}"</span>
                {' '}업무를 삭제하시겠습니까?
              </>
            ) : (
              '이 업무를 삭제하시겠습니까?'
            )}
            <br />
            <span className="text-sm">삭제된 업무는 복구할 수 없습니다.</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
