/**
 * Member Management Page - 멤버관리
 * 관리자용 멤버 목록 조회 및 삭제 페이지
 */

import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { 
  Users, Trash2, Loader2, Shield, AlertTriangle, Search,
  UserCog, Crown, DollarSign
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function MemberPage() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<'user' | 'admin'>('user');

  const utils = trpc.useUtils();

  // Fetch members
  const { data: members, isLoading: membersLoading } = trpc.member.list.useQuery(
    undefined,
    { enabled: user?.role === 'admin' }
  );

  // Mutations
  const deleteMember = trpc.member.delete.useMutation({
    onSuccess: () => {
      toast.success('멤버가 삭제되었습니다');
      utils.member.list.invalidate();
      setDeleteDialogOpen(false);
      setSelectedMember(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const updateRole = trpc.member.updateRole.useMutation({
    onSuccess: () => {
      toast.success('역할이 변경되었습니다');
      utils.member.list.invalidate();
      setRoleDialogOpen(false);
      setSelectedMember(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const updateSalesPermission = trpc.member.updateSalesPermission.useMutation({
    onSuccess: () => {
      toast.success('매출관리 권한이 변경되었습니다');
      utils.member.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateFinancialPermission = trpc.member.updateFinancialPermission.useMutation({
    onSuccess: () => {
      toast.success('재무현황 권한이 변경되었습니다');
      utils.member.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  // Loading state
  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  // Admin check
  if (user?.role !== 'admin') {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Shield className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">접근 권한이 없습니다</h2>
          <p className="text-muted-foreground">이 페이지는 관리자만 접근할 수 있습니다.</p>
          <Button onClick={() => setLocation('/')}>홈으로 돌아가기</Button>
        </div>
      </MainLayout>
    );
  }

  // Filter members by search query
  const filteredMembers = members?.filter(member => {
    const searchLower = searchQuery.toLowerCase();
    return (
      member.koreanName?.toLowerCase().includes(searchLower) ||
      member.name?.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower) ||
      member.divisionName?.toLowerCase().includes(searchLower) ||
      member.teamName?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const handleDeleteClick = (member: any) => {
    setSelectedMember(member);
    setDeleteDialogOpen(true);
  };

  const handleRoleClick = (member: any) => {
    setSelectedMember(member);
    setSelectedRole(member.role);
    setRoleDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedMember) {
      deleteMember.mutate({ userId: selectedMember.id });
    }
  };

  const confirmRoleChange = () => {
    if (selectedMember) {
      updateRole.mutate({ userId: selectedMember.id, role: selectedRole });
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6" />
              멤버관리
            </h1>
            <p className="text-muted-foreground mt-1">
              시스템에 등록된 멤버를 관리합니다
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            총 {members?.length || 0}명
          </Badge>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="이름, 이메일, 사업부, 팀으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle>멤버 목록</CardTitle>
            <CardDescription>
              멤버의 역할을 변경하거나 삭제할 수 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? '검색 결과가 없습니다' : '등록된 멤버가 없습니다'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">이름</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">이메일</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">사업부</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">팀</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">직책</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">역할</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">매출권한</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">재무권한</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">가입일</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">최근 접속</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => (
                      <tr key={member.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {member.koreanName || member.name || '(이름 없음)'}
                            {member.id === user?.id && (
                              <Badge variant="secondary" className="text-xs">나</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {member.email || '-'}
                        </td>
                        <td className="py-3 px-4">
                          {member.divisionName || '-'}
                        </td>
                        <td className="py-3 px-4">
                          {member.teamName || '-'}
                        </td>
                        <td className="py-3 px-4">
                          {member.positionName || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                            {member.role === 'admin' ? (
                              <span className="flex items-center gap-1">
                                <Crown className="h-3 w-3" />
                                관리자
                              </span>
                            ) : '일반'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center">
                            <Switch
                              checked={member.role === 'admin' || member.canEditSales}
                              disabled={member.role === 'admin' || updateSalesPermission.isPending}
                              onCheckedChange={(checked) => {
                                updateSalesPermission.mutate({ userId: member.id, canEditSales: checked });
                              }}
                              title={member.role === 'admin' ? '관리자는 자동으로 권한이 부여됩니다' : '매출관리 편집 권한'}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center">
                            <Switch
                              checked={member.role === 'admin' || member.canEditFinancial}
                              disabled={member.role === 'admin' || updateFinancialPermission.isPending}
                              onCheckedChange={(checked) => {
                                updateFinancialPermission.mutate({ userId: member.id, canEditFinancial: checked });
                              }}
                              title={member.role === 'admin' ? '관리자는 자동으로 권한이 부여됩니다' : '재무현황 편집 권한'}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-sm">
                          {formatDate(member.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-sm">
                          {formatDate(member.lastSignedIn)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRoleClick(member)}
                              disabled={member.id === user?.id}
                              title={member.id === user?.id ? '자신의 역할은 변경할 수 없습니다' : '역할 변경'}
                            >
                              <UserCog className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(member)}
                              disabled={member.id === user?.id}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              title={member.id === user?.id ? '자신은 삭제할 수 없습니다' : '멤버 삭제'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              멤버 삭제 확인
            </DialogTitle>
            <DialogDescription>
              <strong>{selectedMember?.koreanName || selectedMember?.name || '(이름 없음)'}</strong> 멤버를 삭제하시겠습니까?
              <br />
              <span className="text-destructive">
                이 작업은 되돌릴 수 없으며, 해당 멤버의 모든 데이터(업무, 매출, 계약, 회의록 등)가 함께 삭제됩니다.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteMember.isPending}
            >
              {deleteMember.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Change Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              역할 변경
            </DialogTitle>
            <DialogDescription>
              <strong>{selectedMember?.koreanName || selectedMember?.name || '(이름 없음)'}</strong> 멤버의 역할을 변경합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedRole} onValueChange={(value: 'user' | 'admin') => setSelectedRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">일반 사용자</SelectItem>
                <SelectItem value="admin">관리자</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              취소
            </Button>
            <Button 
              onClick={confirmRoleChange}
              disabled={updateRole.isPending || selectedRole === selectedMember?.role}
            >
              {updateRole.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              변경
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
