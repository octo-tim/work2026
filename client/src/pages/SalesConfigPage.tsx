import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, GripVertical, Settings } from 'lucide-react';

interface SalesCategory {
  id: number;
  name: string;
  division: string;
  isActive: boolean;
  sortOrder: number;
}

interface SalesItem {
  id: number;
  categoryId: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

interface ContractChannel {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

interface ContractSubChannel {
  id: number;
  channelId: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

export default function SalesConfigPage() {
  const [activeTab, setActiveTab] = useState('sales');
  
  // Sales Category State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SalesCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', division: '' });
  
  // Sales Item State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SalesItem | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState({ name: '' });
  
  // Contract Channel State
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ContractChannel | null>(null);
  const [channelForm, setChannelForm] = useState({ name: '' });
  
  // Contract Sub Channel State
  const [isSubChannelModalOpen, setIsSubChannelModalOpen] = useState(false);
  const [editingSubChannel, setEditingSubChannel] = useState<ContractSubChannel | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [subChannelForm, setSubChannelForm] = useState({ name: '' });

  // tRPC Queries
  const { data: categories, isLoading: categoriesLoading, refetch: refetchCategories } = 
    trpc.salesConfig.listCategories.useQuery();
  
  const { data: channels, isLoading: channelsLoading, refetch: refetchChannels } = 
    trpc.contractConfig.listChannels.useQuery();

  const { data: items, refetch: refetchItems } = 
    trpc.salesConfig.listItems.useQuery(
      { categoryId: selectedCategoryId! },
      { enabled: !!selectedCategoryId }
    );

  const { data: subChannels, refetch: refetchSubChannels } = 
    trpc.contractConfig.listSubChannels.useQuery(
      { channelId: selectedChannelId! },
      { enabled: !!selectedChannelId }
    );

  // Mutations
  const createCategoryMutation = trpc.salesConfig.createCategory.useMutation({
    onSuccess: () => {
      toast.success('카테고리가 추가되었습니다');
      refetchCategories();
      setIsCategoryModalOpen(false);
      setCategoryForm({ name: '', division: '' });
    },
    onError: (err) => toast.error('오류: ' + err.message),
  });

  const updateCategoryMutation = trpc.salesConfig.updateCategory.useMutation({
    onSuccess: () => {
      toast.success('카테고리가 수정되었습니다');
      refetchCategories();
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
    },
    onError: (err) => toast.error('오류: ' + err.message),
  });

  const deleteCategoryMutation = trpc.salesConfig.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success('카테고리가 삭제되었습니다');
      refetchCategories();
    },
    onError: (err) => toast.error('오류: ' + err.message),
  });

  const createItemMutation = trpc.salesConfig.createItem.useMutation({
    onSuccess: () => {
      toast.success('항목이 추가되었습니다');
      refetchItems();
      setIsItemModalOpen(false);
      setItemForm({ name: '' });
    },
    onError: (err) => toast.error('오류: ' + err.message),
  });

  const updateItemMutation = trpc.salesConfig.updateItem.useMutation({
    onSuccess: () => {
      toast.success('항목이 수정되었습니다');
      refetchItems();
      setIsItemModalOpen(false);
      setEditingItem(null);
    },
    onError: (err) => toast.error('오류: ' + err.message),
  });

  const deleteItemMutation = trpc.salesConfig.deleteItem.useMutation({
    onSuccess: () => {
      toast.success('항목이 삭제되었습니다');
      refetchItems();
    },
    onError: (err) => toast.error('오류: ' + err.message),
  });

  const createChannelMutation = trpc.contractConfig.createChannel.useMutation({
    onSuccess: () => {
      toast.success('채널이 추가되었습니다');
      refetchChannels();
      setIsChannelModalOpen(false);
      setChannelForm({ name: '' });
    },
    onError: (err) => toast.error('오류: ' + err.message),
  });

  const updateChannelMutation = trpc.contractConfig.updateChannel.useMutation({
    onSuccess: () => {
      toast.success('채널이 수정되었습니다');
      refetchChannels();
      setIsChannelModalOpen(false);
      setEditingChannel(null);
    },
    onError: (err) => toast.error('오류: ' + err.message),
  });

  const deleteChannelMutation = trpc.contractConfig.deleteChannel.useMutation({
    onSuccess: () => {
      toast.success('채널이 삭제되었습니다');
      refetchChannels();
    },
    onError: (err) => toast.error('오류: ' + err.message),
  });

  const createSubChannelMutation = trpc.contractConfig.createSubChannel.useMutation({
    onSuccess: () => {
      toast.success('세부 채널이 추가되었습니다');
      refetchSubChannels();
      setIsSubChannelModalOpen(false);
      setSubChannelForm({ name: '' });
    },
    onError: (err) => toast.error('오류: ' + err.message),
  });

  const updateSubChannelMutation = trpc.contractConfig.updateSubChannel.useMutation({
    onSuccess: () => {
      toast.success('세부 채널이 수정되었습니다');
      refetchSubChannels();
      setIsSubChannelModalOpen(false);
      setEditingSubChannel(null);
    },
    onError: (err) => toast.error('오류: ' + err.message),
  });

  const deleteSubChannelMutation = trpc.contractConfig.deleteSubChannel.useMutation({
    onSuccess: () => {
      toast.success('세부 채널이 삭제되었습니다');
      refetchSubChannels();
    },
    onError: (err) => toast.error('오류: ' + err.message),
  });

  // Handlers
  const handleOpenCategoryModal = (category?: SalesCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ name: category.name, division: category.division });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', division: '' });
    }
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = () => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, ...categoryForm });
    } else {
      createCategoryMutation.mutate(categoryForm);
    }
  };

  const handleToggleCategoryActive = (category: SalesCategory) => {
    updateCategoryMutation.mutate({ id: category.id, isActive: !category.isActive });
  };

  const handleOpenItemModal = (categoryId: number, item?: SalesItem) => {
    setSelectedCategoryId(categoryId);
    if (item) {
      setEditingItem(item);
      setItemForm({ name: item.name });
    } else {
      setEditingItem(null);
      setItemForm({ name: '' });
    }
    setIsItemModalOpen(true);
  };

  const handleSaveItem = () => {
    if (!selectedCategoryId) return;
    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, ...itemForm });
    } else {
      createItemMutation.mutate({ categoryId: selectedCategoryId, ...itemForm });
    }
  };

  const handleToggleItemActive = (item: SalesItem) => {
    updateItemMutation.mutate({ id: item.id, isActive: !item.isActive });
  };

  const handleOpenChannelModal = (channel?: ContractChannel) => {
    if (channel) {
      setEditingChannel(channel);
      setChannelForm({ name: channel.name });
    } else {
      setEditingChannel(null);
      setChannelForm({ name: '' });
    }
    setIsChannelModalOpen(true);
  };

  const handleSaveChannel = () => {
    if (editingChannel) {
      updateChannelMutation.mutate({ id: editingChannel.id, ...channelForm });
    } else {
      createChannelMutation.mutate(channelForm);
    }
  };

  const handleToggleChannelActive = (channel: ContractChannel) => {
    updateChannelMutation.mutate({ id: channel.id, isActive: !channel.isActive });
  };

  const handleOpenSubChannelModal = (channelId: number, subChannel?: ContractSubChannel) => {
    setSelectedChannelId(channelId);
    if (subChannel) {
      setEditingSubChannel(subChannel);
      setSubChannelForm({ name: subChannel.name });
    } else {
      setEditingSubChannel(null);
      setSubChannelForm({ name: '' });
    }
    setIsSubChannelModalOpen(true);
  };

  const handleSaveSubChannel = () => {
    if (!selectedChannelId) return;
    if (editingSubChannel) {
      updateSubChannelMutation.mutate({ id: editingSubChannel.id, ...subChannelForm });
    } else {
      createSubChannelMutation.mutate({ channelId: selectedChannelId, ...subChannelForm });
    }
  };

  const handleToggleSubChannelActive = (subChannel: ContractSubChannel) => {
    updateSubChannelMutation.mutate({ id: subChannel.id, isActive: !subChannel.isActive });
  };

  const isLoading = categoriesLoading || channelsLoading;

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Settings className="w-6 h-6" />
              매출/계약 설정
            </h1>
            <p className="text-muted-foreground mt-1">
              매출 카테고리, 브랜드, 계약 채널 및 유입경로를 관리합니다
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="sales">매출 카테고리</TabsTrigger>
              <TabsTrigger value="contract">계약 채널</TabsTrigger>
            </TabsList>

            {/* 매출 카테고리 탭 */}
            <TabsContent value="sales" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>매출 카테고리</CardTitle>
                    <CardDescription>봄봄시공, 제조공급, 온라인판매 등의 매출 섹션을 관리합니다</CardDescription>
                  </div>
                  <Button onClick={() => handleOpenCategoryModal()}>
                    <Plus className="w-4 h-4 mr-2" />
                    카테고리 추가
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>카테고리명</TableHead>
                        <TableHead>구분</TableHead>
                        <TableHead>활성화</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories?.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell>
                            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                          </TableCell>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell>{category.division}</TableCell>
                          <TableCell>
                            <Switch
                              checked={category.isActive}
                              onCheckedChange={() => handleToggleCategoryActive(category)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedCategoryId(category.id);
                                  refetchItems();
                                }}
                              >
                                항목 관리
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenCategoryModal(category)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm('이 카테고리를 삭제하시겠습니까? 관련된 모든 항목도 함께 삭제됩니다.')) {
                                    deleteCategoryMutation.mutate({ id: category.id });
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!categories || categories.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            등록된 카테고리가 없습니다
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* 선택된 카테고리의 항목 관리 */}
              {selectedCategoryId && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>
                        {categories?.find(c => c.id === selectedCategoryId)?.name} - 항목 관리
                      </CardTitle>
                      <CardDescription>브랜드 또는 거래처그룹을 관리합니다</CardDescription>
                    </div>
                    <Button onClick={() => handleOpenItemModal(selectedCategoryId)}>
                      <Plus className="w-4 h-4 mr-2" />
                      항목 추가
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>항목명</TableHead>
                          <TableHead>활성화</TableHead>
                          <TableHead className="text-right">작업</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items?.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                            </TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>
                              <Switch
                                checked={item.isActive}
                                onCheckedChange={() => handleToggleItemActive(item)}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenItemModal(selectedCategoryId, item)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (confirm('이 항목을 삭제하시겠습니까?')) {
                                      deleteItemMutation.mutate({ id: item.id });
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!items || items.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              등록된 항목이 없습니다
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* 계약 채널 탭 */}
            <TabsContent value="contract" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>계약 채널</CardTitle>
                    <CardDescription>내부채널, 외부채널 등의 계약 유입경로를 관리합니다</CardDescription>
                  </div>
                  <Button onClick={() => handleOpenChannelModal()}>
                    <Plus className="w-4 h-4 mr-2" />
                    채널 추가
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>채널명</TableHead>
                        <TableHead>활성화</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {channels?.map((channel) => (
                        <TableRow key={channel.id}>
                          <TableCell>
                            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                          </TableCell>
                          <TableCell className="font-medium">{channel.name}</TableCell>
                          <TableCell>
                            <Switch
                              checked={channel.isActive}
                              onCheckedChange={() => handleToggleChannelActive(channel)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedChannelId(channel.id);
                                  refetchSubChannels();
                                }}
                              >
                                세부 채널 관리
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenChannelModal(channel)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm('이 채널을 삭제하시겠습니까? 관련된 모든 세부 채널도 함께 삭제됩니다.')) {
                                    deleteChannelMutation.mutate({ id: channel.id });
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!channels || channels.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            등록된 채널이 없습니다
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* 선택된 채널의 세부 채널 관리 */}
              {selectedChannelId && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>
                        {channels?.find(c => c.id === selectedChannelId)?.name} - 세부 채널 관리
                      </CardTitle>
                      <CardDescription>유입경로를 관리합니다</CardDescription>
                    </div>
                    <Button onClick={() => handleOpenSubChannelModal(selectedChannelId)}>
                      <Plus className="w-4 h-4 mr-2" />
                      세부 채널 추가
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>세부 채널명</TableHead>
                          <TableHead>활성화</TableHead>
                          <TableHead className="text-right">작업</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subChannels?.map((subChannel) => (
                          <TableRow key={subChannel.id}>
                            <TableCell>
                              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                            </TableCell>
                            <TableCell className="font-medium">{subChannel.name}</TableCell>
                            <TableCell>
                              <Switch
                                checked={subChannel.isActive}
                                onCheckedChange={() => handleToggleSubChannelActive(subChannel)}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenSubChannelModal(selectedChannelId, subChannel)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (confirm('이 세부 채널을 삭제하시겠습니까?')) {
                                      deleteSubChannelMutation.mutate({ id: subChannel.id });
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!subChannels || subChannels.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              등록된 세부 채널이 없습니다
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Category Modal */}
        <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? '카테고리 수정' : '카테고리 추가'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>카테고리명</Label>
                <Input
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="예: 봄봄시공"
                />
              </div>
              <div className="space-y-2">
                <Label>구분</Label>
                <Input
                  value={categoryForm.division}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, division: e.target.value }))}
                  placeholder="예: 시공, 제조, 온라인"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCategoryModalOpen(false)}>취소</Button>
              <Button 
                onClick={handleSaveCategory}
                disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
              >
                {(createCategoryMutation.isPending || updateCategoryMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                저장
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Item Modal */}
        <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? '항목 수정' : '항목 추가'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>항목명</Label>
                <Input
                  value={itemForm.name}
                  onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="예: 본사, 지사, 리코코"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsItemModalOpen(false)}>취소</Button>
              <Button 
                onClick={handleSaveItem}
                disabled={createItemMutation.isPending || updateItemMutation.isPending}
              >
                {(createItemMutation.isPending || updateItemMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                저장
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Channel Modal */}
        <Dialog open={isChannelModalOpen} onOpenChange={setIsChannelModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingChannel ? '채널 수정' : '채널 추가'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>채널명</Label>
                <Input
                  value={channelForm.name}
                  onChange={(e) => setChannelForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="예: 내부채널, 외부채널"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsChannelModalOpen(false)}>취소</Button>
              <Button 
                onClick={handleSaveChannel}
                disabled={createChannelMutation.isPending || updateChannelMutation.isPending}
              >
                {(createChannelMutation.isPending || updateChannelMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                저장
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sub Channel Modal */}
        <Dialog open={isSubChannelModalOpen} onOpenChange={setIsSubChannelModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSubChannel ? '세부 채널 수정' : '세부 채널 추가'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>세부 채널명</Label>
                <Input
                  value={subChannelForm.name}
                  onChange={(e) => setSubChannelForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="예: 상담전화, 샘플신청, 라이브커머스"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSubChannelModalOpen(false)}>취소</Button>
              <Button 
                onClick={handleSaveSubChannel}
                disabled={createSubChannelMutation.isPending || updateSubChannelMutation.isPending}
              >
                {(createSubChannelMutation.isPending || updateSubChannelMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                저장
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
