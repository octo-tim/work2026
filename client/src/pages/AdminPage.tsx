/**
 * Admin Page - Organization Settings
 * 관리자용 사업부, 팀, 직책, 직급 관리 페이지
 */

import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { 
  Building2, Users, Briefcase, Award, Plus, Pencil, Trash2, 
  Loader2, Settings, Shield, AlertTriangle 
} from 'lucide-react';

type TabType = 'divisions' | 'teams' | 'positions' | 'ranks';

interface FormData {
  name: string;
  description: string;
  sortOrder: number;
  level?: number;
  divisionId?: number;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('divisions');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    sortOrder: 0,
    level: 0,
    divisionId: undefined,
  });

  const utils = trpc.useUtils();

  // Fetch data
  const { data: divisions, isLoading: divisionsLoading } = trpc.organization.division.listAll.useQuery(
    undefined,
    { enabled: user?.role === 'admin' }
  );
  const { data: teams, isLoading: teamsLoading } = trpc.organization.team.listAll.useQuery(
    undefined,
    { enabled: user?.role === 'admin' }
  );
  const { data: positions, isLoading: positionsLoading } = trpc.organization.position.listAll.useQuery(
    undefined,
    { enabled: user?.role === 'admin' }
  );
  const { data: ranks, isLoading: ranksLoading } = trpc.organization.rank.listAll.useQuery(
    undefined,
    { enabled: user?.role === 'admin' }
  );

  // Mutations
  const createDivision = trpc.organization.division.create.useMutation({
    onSuccess: () => {
      toast.success('사업부가 추가되었습니다');
      utils.organization.division.listAll.invalidate();
      closeModal();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateDivision = trpc.organization.division.update.useMutation({
    onSuccess: () => {
      toast.success('사업부가 수정되었습니다');
      utils.organization.division.listAll.invalidate();
      closeModal();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteDivision = trpc.organization.division.delete.useMutation({
    onSuccess: () => {
      toast.success('사업부가 삭제되었습니다');
      utils.organization.division.listAll.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const createTeam = trpc.organization.team.create.useMutation({
    onSuccess: () => {
      toast.success('팀이 추가되었습니다');
      utils.organization.team.listAll.invalidate();
      closeModal();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateTeam = trpc.organization.team.update.useMutation({
    onSuccess: () => {
      toast.success('팀이 수정되었습니다');
      utils.organization.team.listAll.invalidate();
      closeModal();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteTeam = trpc.organization.team.delete.useMutation({
    onSuccess: () => {
      toast.success('팀이 삭제되었습니다');
      utils.organization.team.listAll.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const createPosition = trpc.organization.position.create.useMutation({
    onSuccess: () => {
      toast.success('직책이 추가되었습니다');
      utils.organization.position.listAll.invalidate();
      closeModal();
    },
    onError: (error) => toast.error(error.message),
  });

  const updatePosition = trpc.organization.position.update.useMutation({
    onSuccess: () => {
      toast.success('직책이 수정되었습니다');
      utils.organization.position.listAll.invalidate();
      closeModal();
    },
    onError: (error) => toast.error(error.message),
  });

  const deletePosition = trpc.organization.position.delete.useMutation({
    onSuccess: () => {
      toast.success('직책이 삭제되었습니다');
      utils.organization.position.listAll.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const createRank = trpc.organization.rank.create.useMutation({
    onSuccess: () => {
      toast.success('직급이 추가되었습니다');
      utils.organization.rank.listAll.invalidate();
      closeModal();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateRank = trpc.organization.rank.update.useMutation({
    onSuccess: () => {
      toast.success('직급이 수정되었습니다');
      utils.organization.rank.listAll.invalidate();
      closeModal();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteRank = trpc.organization.rank.delete.useMutation({
    onSuccess: () => {
      toast.success('직급이 삭제되었습니다');
      utils.organization.rank.listAll.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      sortOrder: 0,
      level: 0,
      divisionId: divisions?.[0]?.id,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      sortOrder: item.sortOrder || 0,
      level: item.level || 0,
      divisionId: item.divisionId,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      sortOrder: 0,
      level: 0,
      divisionId: undefined,
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('이름을 입력해주세요');
      return;
    }

    if (editingItem) {
      // Update
      switch (activeTab) {
        case 'divisions':
          updateDivision.mutate({ id: editingItem.id, ...formData });
          break;
        case 'teams':
          if (!formData.divisionId) {
            toast.error('사업부를 선택해주세요');
            return;
          }
          updateTeam.mutate({ id: editingItem.id, ...formData, divisionId: formData.divisionId });
          break;
        case 'positions':
          updatePosition.mutate({ id: editingItem.id, ...formData });
          break;
        case 'ranks':
          updateRank.mutate({ id: editingItem.id, ...formData });
          break;
      }
    } else {
      // Create
      switch (activeTab) {
        case 'divisions':
          createDivision.mutate(formData);
          break;
        case 'teams':
          if (!formData.divisionId) {
            toast.error('사업부를 선택해주세요');
            return;
          }
          createTeam.mutate({ ...formData, divisionId: formData.divisionId });
          break;
        case 'positions':
          createPosition.mutate(formData);
          break;
        case 'ranks':
          createRank.mutate(formData);
          break;
      }
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    switch (activeTab) {
      case 'divisions':
        deleteDivision.mutate({ id });
        break;
      case 'teams':
        deleteTeam.mutate({ id });
        break;
      case 'positions':
        deletePosition.mutate({ id });
        break;
      case 'ranks':
        deleteRank.mutate({ id });
        break;
    }
  };

  const handleToggleActive = (item: any, isActive: boolean) => {
    switch (activeTab) {
      case 'divisions':
        updateDivision.mutate({ id: item.id, isActive });
        break;
      case 'teams':
        updateTeam.mutate({ id: item.id, isActive });
        break;
      case 'positions':
        updatePosition.mutate({ id: item.id, isActive });
        break;
      case 'ranks':
        updateRank.mutate({ id: item.id, isActive });
        break;
    }
  };

  const getTabIcon = (tab: TabType) => {
    switch (tab) {
      case 'divisions': return <Building2 className="h-4 w-4" />;
      case 'teams': return <Users className="h-4 w-4" />;
      case 'positions': return <Briefcase className="h-4 w-4" />;
      case 'ranks': return <Award className="h-4 w-4" />;
    }
  };

  const getTabLabel = (tab: TabType) => {
    switch (tab) {
      case 'divisions': return '사업부';
      case 'teams': return '팀';
      case 'positions': return '직책';
      case 'ranks': return '직급';
    }
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case 'divisions': return divisions || [];
      case 'teams': return teams || [];
      case 'positions': return positions || [];
      case 'ranks': return ranks || [];
    }
  };

  const isLoading = divisionsLoading || teamsLoading || positionsLoading || ranksLoading;

  // Check admin access
  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">접근 권한이 없습니다</h2>
          <p className="text-muted-foreground mb-4">이 페이지는 관리자만 접근할 수 있습니다.</p>
          <Button onClick={() => setLocation('/tasks')}>업무관리로 이동</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">조직 설정</h1>
              <p className="text-sm text-muted-foreground">사업부, 팀, 직책, 직급을 관리합니다</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm">
            <Shield className="h-4 w-4" />
            관리자 전용
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid grid-cols-4 w-auto">
              {(['divisions', 'teams', 'positions', 'ranks'] as TabType[]).map((tab) => (
                <TabsTrigger key={tab} value={tab} className="flex items-center gap-2 px-4">
                  {getTabIcon(tab)}
                  <span className="hidden sm:inline">{getTabLabel(tab)}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            <Button onClick={openAddModal} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {getTabLabel(activeTab)} 추가
            </Button>
          </div>

          {/* Content */}
          {(['divisions', 'teams', 'positions', 'ranks'] as TabType[]).map((tab) => (
            <TabsContent key={tab} value={tab}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getTabIcon(tab)}
                    {getTabLabel(tab)} 관리
                  </CardTitle>
                  <CardDescription>
                    {tab === 'divisions' && '회사의 사업부를 관리합니다. 팀은 사업부에 소속됩니다.'}
                    {tab === 'teams' && '각 사업부에 소속된 팀을 관리합니다.'}
                    {tab === 'positions' && '직책(팀장, 파트장 등)을 관리합니다.'}
                    {tab === 'ranks' && '직급(사원, 대리, 과장 등)을 관리합니다.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : getCurrentData().length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      등록된 {getTabLabel(tab)}이(가) 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {getCurrentData().map((item: any) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={item.isActive}
                                onCheckedChange={(checked) => handleToggleActive(item, checked)}
                              />
                            </div>
                            <div>
                              <div className="font-medium text-foreground">
                                {item.name}
                                {tab === 'teams' && item.divisionId && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({divisions?.find(d => d.id === item.divisionId)?.name})
                                  </span>
                                )}
                                {tab === 'ranks' && item.level !== undefined && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    (레벨: {item.level})
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <div className="text-sm text-muted-foreground">{item.description}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground mr-2">
                              순서: {item.sortOrder}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Add/Edit Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? `${getTabLabel(activeTab)} 수정` : `${getTabLabel(activeTab)} 추가`}
              </DialogTitle>
              <DialogDescription>
                {editingItem ? '정보를 수정합니다.' : '새로운 항목을 추가합니다.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {activeTab === 'teams' && (
                <div className="space-y-2">
                  <Label>소속 사업부</Label>
                  <Select
                    value={formData.divisionId?.toString() ?? ""}
                    onValueChange={(value) => setFormData({ ...formData, divisionId: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="사업부 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {divisions?.map((division) => (
                        <SelectItem key={division.id} value={division.id.toString()}>
                          {division.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>이름</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={`${getTabLabel(activeTab)} 이름`}
                />
              </div>
              <div className="space-y-2">
                <Label>설명 (선택)</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="설명을 입력하세요"
                />
              </div>
              {activeTab === 'ranks' && (
                <div className="space-y-2">
                  <Label>레벨 (숫자가 높을수록 상위)</Label>
                  <Input
                    type="number"
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>정렬 순서</Label>
                <Input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeModal}>
                취소
              </Button>
              <Button onClick={handleSubmit}>
                {editingItem ? '수정' : '추가'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
