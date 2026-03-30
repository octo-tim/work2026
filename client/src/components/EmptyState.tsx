/**
 * EmptyState Component
 * Design: Japanese Zen Minimalism
 * - 여백을 활용한 깔끔한 빈 상태 표시
 * - 미묘한 아이콘과 텍스트
 */

import { ClipboardList, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  type: 'no-tasks' | 'no-results';
  onAddTask?: () => void;
  onClearFilter?: () => void;
}

export function EmptyState({ type, onAddTask, onClearFilter }: EmptyStateProps) {
  if (type === 'no-results') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
          <Search className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          검색 결과가 없습니다
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-[280px] mb-6">
          다른 검색어나 필터 조건을 시도해 보세요.
        </p>
        {onClearFilter && (
          <Button variant="outline" onClick={onClearFilter}>
            필터 초기화
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
        <ClipboardList className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
        등록된 업무가 없습니다
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-[280px] mb-6">
        새로운 업무를 추가하여 관리를 시작하세요.
      </p>
      {onAddTask && (
        <Button onClick={onAddTask}>
          첫 업무 추가하기
        </Button>
      )}
    </div>
  );
}
