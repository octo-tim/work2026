/**
 * Sales Page - 매출현황
 * 엑셀 구조에 맞춘 매출관리 페이지
 * - 봄봄시공 (거래처그룹: 본사, 지사)
 * - 제조공급 (브랜드: 리코코, 크림하우스, 기타)
 * - 온라인판매 (브랜드: 봄봄, 슈슈비, 기타)
 * - 계약현황 (내부채널, 외부채널)
 */

import { useState, useMemo, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ChevronLeft, ChevronRight, Save, Plus, Pencil, Trash2, MessageSquare, Edit3 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { SalesCalendar } from '@/components/SalesCalendar';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Types
interface SalesRecord {
  id: string;
  division: string;
  productGroup: string;
  monthlyTarget: number | null;
  previousMonthSales: number | null;
  week1Sales: number | null;
  week2Sales: number | null;
  week3Sales: number | null;
  week4Sales: number | null;
  week5Sales: number | null;
  cumulativeSales: number | null;
  achievementRate: string | null;
}

interface ContractRecord {
  id: string;
  channel: string;
  subChannel: string | null;
  previousMonthCount: number | null;
  monthlyTarget: number | null;
  week1Count: number | null;
  week2Count: number | null;
  week3Count: number | null;
  week4Count: number | null;
  week5Count: number | null;
  totalCount: number | null;
  achievementRate: string | null;
}

// 프레임 정의 - 엑셀 구조에 맞춤
const SALES_FRAMES = {
  봄봄시공: {
    division: 'bombom',
    items: ['본사', '지사'],
    label: '거래처그룹'
  },
  온라인판매: {
    division: 'online',
    items: ['봄봄', '슈슈비', '기타'],
    label: '브랜드'
  },
  제조공급: {
    division: 'manufacturing',
    items: ['리코코', '크림하우스', '기타'],
    label: '브랜드'
  },
  리코코: {
    division: 'ricoco',
    items: ['시공매출', '온라인매출'],
    label: '매출구분'
  },
};

const CONTRACT_FRAMES = {
  내부채널: ['상담전화', '샘플신청', '채널톡', '홈피문의'],
  외부채널: ['라이브커머스', '베이비페어', '시공팀', '유아매장', '인플루언서공구', '입주박람회', '지사자체상담']
};

// Helper functions
const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined || isNaN(num)) return '-';
  return new Intl.NumberFormat('ko-KR').format(num);
};

const parseNumber = (value: string): number => {
  const parsed = parseInt(value.replace(/,/g, ''), 10);
  return isNaN(parsed) ? 0 : parsed;
};

// Chart colors - 세련된 팔레트
const CHART_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

// 사업부별 고유 색상
const DIVISION_COLORS: Record<string, { bg: string; text: string; gradient: string; progressBar: string; border: string; light: string }> = {
  bombom: {
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    text: 'text-violet-700 dark:text-violet-300',
    gradient: 'from-violet-500 to-purple-600',
    progressBar: '[&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:to-purple-600',
    border: 'border-violet-200 dark:border-violet-800',
    light: 'bg-violet-100 dark:bg-violet-900/50',
  },
  manufacturing: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    gradient: 'from-emerald-500 to-teal-600',
    progressBar: '[&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-teal-600',
    border: 'border-emerald-200 dark:border-emerald-800',
    light: 'bg-emerald-100 dark:bg-emerald-900/50',
  },
  online: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
    gradient: 'from-amber-500 to-orange-600',
    progressBar: '[&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-orange-600',
    border: 'border-amber-200 dark:border-amber-800',
    light: 'bg-amber-100 dark:bg-amber-900/50',
  },
  ricoco: {
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    text: 'text-rose-700 dark:text-rose-300',
    gradient: 'from-rose-500 to-pink-600',
    progressBar: '[&>div]:bg-gradient-to-r [&>div]:from-rose-500 [&>div]:to-pink-600',
    border: 'border-rose-200 dark:border-rose-800',
    light: 'bg-rose-100 dark:bg-rose-900/50',
  },
};

export default function SalesPage() {
  const { user } = useAuth();
  // 관리자이거나 매출관리 권한이 있는 사용자는 편집 가능
  const canEditSales = user?.role === 'admin' || user?.canEditSales === true;
  const isAdmin = user?.role === 'admin';
  
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [setupSection, setSetupSection] = useState<string>('');
  const [setupData, setSetupData] = useState<Record<string, { previousMonth: number; target: number }>>({});
  
  // 계약현황 설정 모달 state
  const [isContractSetupModalOpen, setIsContractSetupModalOpen] = useState(false);
  const [contractSetupChannel, setContractSetupChannel] = useState<string>('');
  const [contractSetupData, setContractSetupData] = useState<Record<string, { previousMonth: number; target: number }>>({});
  
  // 항목 관리 모달 state
  const [isItemManageModalOpen, setIsItemManageModalOpen] = useState(false);
  const [itemManageSection, setItemManageSection] = useState<string>('');
  const [itemManageItems, setItemManageItems] = useState<string[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editingItemName, setEditingItemName] = useState('');
  
  // 채널 관리 모달 state
  const [isChannelManageModalOpen, setIsChannelManageModalOpen] = useState(false);
  const [channelManageType, setChannelManageType] = useState<string>('');
  const [channelManageItems, setChannelManageItems] = useState<string[]>([]);
  const [newChannelName, setNewChannelName] = useState('');
  const [editingChannelIndex, setEditingChannelIndex] = useState<number | null>(null);
  const [editingChannelName, setEditingChannelName] = useState('');
  
  // 동적 프레임 state (DB에서 불러온 데이터로 초기화)
  const [dynamicSalesFrames, setDynamicSalesFrames] = useState(SALES_FRAMES);
  const [dynamicContractFrames, setDynamicContractFrames] = useState(CONTRACT_FRAMES);
  
  // 주차별 입력 데이터 상태
  const [weeklyInputs, setWeeklyInputs] = useState<Record<string, Record<string, number>>>({});
  const [contractInputs, setContractInputs] = useState<Record<string, Record<string, number>>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // tRPC queries
  const { data: salesData, isLoading: salesLoading, refetch: refetchSales } = trpc.sales.list.useQuery({
    year,
    month,
  });

  const { data: bombomContractData, isLoading: contractLoading, refetch: refetchBombomContracts } = trpc.contract.list.useQuery({
    year,
    month,
    brand: 'bombom',
  });

  const { data: ricocoContractData, refetch: refetchRicocoContracts } = trpc.contract.list.useQuery({
    year,
    month,
    brand: 'ricoco',
  });

  // 두 브랜드 데이터를 합친 전체 계약 데이터
  const contractData = useMemo(() => {
    return [...(bombomContractData || []), ...(ricocoContractData || [])];
  }, [bombomContractData, ricocoContractData]);

  const refetchContracts = () => {
    refetchBombomContracts();
    refetchRicocoContracts();
  };

  // 전월 데이터 조회
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  
  const { data: lastMonthSalesData } = trpc.sales.list.useQuery({
    year: prevYear,
    month: prevMonth,
  });

  const { data: lastMonthBombomContractData } = trpc.contract.list.useQuery({
    year: prevYear,
    month: prevMonth,
    brand: 'bombom',
  });

  const { data: lastMonthRicocoContractData } = trpc.contract.list.useQuery({
    year: prevYear,
    month: prevMonth,
    brand: 'ricoco',
  });

  const lastMonthContractData = useMemo(() => {
    return [...(lastMonthBombomContractData || []), ...(lastMonthRicocoContractData || [])];
  }, [lastMonthBombomContractData, lastMonthRicocoContractData]);

  // 주단위 매출 요약 조회
  const { data: weeklySummary, refetch: refetchWeeklySummary } = trpc.sales.weeklySummary.useQuery({
    year,
    month,
  });

  // 이달의 한마디 조회
  const { data: monthlyMessage, refetch: refetchMonthlyMessage } = trpc.monthlyMessage.get.useQuery({
    year,
    month,
  });

  // 이달의 한마디 state
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [messageInput, setMessageInput] = useState('');

  // 사업계획에서 월별 매출 목표 조회
  const { data: businessPlanData } = trpc.businessPlan.getByYear.useQuery(
    { year },
    { enabled: true }
  );

  // 사업계획에서 전월 실적 조회 (매출관리 전월실적에 사용)
  const { data: prevMonthBusinessPlanActuals } = trpc.sales.getPreviousMonthActuals.useQuery(
    { year: prevYear, month: prevMonth },
    { enabled: true }
  );

  // 사업계획 월별 목표 데이터 정리 (division별)
  const businessPlanTargets = useMemo(() => {
    const result: Record<string, number> = {
      'bombom': 0,
      'online': 0,
      'manufacturing': 0,
      'ricoco': 0,
    };
    
    // 사업계획 division → 매출관리 division 매핑
    const divisionMapping: Record<string, string> = {
      'bombom_construction': 'bombom',
      'online_sales': 'online',
      'oem_supply': 'manufacturing',
      'ricoco': 'ricoco',
    };
    
    if (businessPlanData) {
      // 매출 카테고리의 대분류(소분류가 null)만 조회
      businessPlanData.forEach(plan => {
        if (plan.category === 'revenue' && !plan.subDivision) {
          const salesDivision = divisionMapping[plan.division];
          if (salesDivision) {
            // 해당 월의 목표 값 가져오기
            const monthKey = `month${month}` as keyof typeof plan;
            const monthValue = Number(plan[monthKey]) || 0;
            result[salesDivision] = monthValue;
          }
        }
      });
    }
    
    return result;
  }, [businessPlanData, month]);

  // 사업계획 전월 실적 데이터 정리 (division + productGroup별)
  const businessPlanPrevMonthActuals = useMemo(() => {
    const result: Record<string, number> = {};
    
    if (prevMonthBusinessPlanActuals) {
      prevMonthBusinessPlanActuals.forEach(item => {
        const key = `${item.division}-${item.productGroup}`;
        result[key] = item.actual;
      });
    }
    
    return result;
  }, [prevMonthBusinessPlanActuals]);

  // 전월실적 값 가져오기 - 사업계획 실적 우선, 없으면 salesData의 previousMonthSales 사용
  const getPreviousMonthSales = (division: string, productGroup: string): number => {
    const key = `${division}-${productGroup}`;
    // 사업계획 실적에서 가져오기
    if (businessPlanPrevMonthActuals[key] !== undefined) {
      return businessPlanPrevMonthActuals[key];
    }
    // 사업계획에 없으면 salesData의 previousMonthSales 사용
    const record = salesData?.find((s: any) => s.division === division && s.productGroup === productGroup);
    return record?.previousMonthSales ?? 0;
  };

  // Mutations
  const upsertSalesMutation = trpc.sales.upsert.useMutation({
    onSuccess: () => {
      refetchSales();
    },
    onError: (err) => toast.error('저장 실패: ' + err.message),
  });

  const upsertContractMutation = trpc.contract.upsert.useMutation({
    onSuccess: () => {
      refetchContracts();
    },
    onError: (err) => toast.error('저장 실패: ' + err.message),
  });

  // 이달의 한마디 mutation
  const upsertMessageMutation = trpc.monthlyMessage.upsert.useMutation({
    onSuccess: () => {
      toast.success('이달의 한마디가 저장되었습니다.');
      refetchMonthlyMessage();
      setIsEditingMessage(false);
    },
    onError: (err) => toast.error('저장 실패: ' + err.message),
  });

  // 데이터 초기화
  useEffect(() => {
    if (salesData) {
      const inputs: Record<string, Record<string, number>> = {};
      salesData.forEach((record: any) => {
        const key = `${record.division}-${record.productGroup}`;
        inputs[key] = {
          week1: record.week1Sales ?? 0,
          week2: record.week2Sales ?? 0,
          week3: record.week3Sales ?? 0,
          week4: record.week4Sales ?? 0,
          week5: record.week5Sales ?? 0,
        };
      });
      setWeeklyInputs(inputs);

      // DB에 존재하는 productGroup을 dynamicSalesFrames에 자동 반영
      // 신규 브랜드가 추가되었을 때 집계 누락을 방지
      setDynamicSalesFrames(prev => {
        const updated = { ...prev };
        Object.entries(updated).forEach(([sectionName, config]) => {
          const dbItems = salesData
            .filter((s: any) => s.division === config.division)
            .map((s: any) => s.productGroup as string);
          
          // DB에 있지만 현재 items에 없는 항목 추가
          const newItems = [...config.items];
          dbItems.forEach((item: string) => {
            if (!newItems.includes(item)) {
              newItems.push(item);
            }
          });
          
          if (newItems.length !== config.items.length) {
            updated[sectionName as keyof typeof SALES_FRAMES] = {
              ...config,
              items: newItems
            };
          }
        });
        return updated;
      });
    }
  }, [salesData]);

  useEffect(() => {
    if (contractData) {
      const inputs: Record<string, Record<string, number>> = {};
      contractData.forEach((record: any) => {
        const brand = record.brand || 'bombom';
        const key = record.subChannel ? `${brand}-${record.channel}-${record.subChannel}` : `${brand}-${record.channel}`;
        inputs[key] = {
          week1: record.week1Count ?? 0,
          week2: record.week2Count ?? 0,
          week3: record.week3Count ?? 0,
          week4: record.week4Count ?? 0,
          week5: record.week5Count ?? 0,
        };
      });
      setContractInputs(inputs);
    }
  }, [contractData]);

  // 섹션별 데이터 필터링
  const getSalesDataByDivision = (division: string) => {
    return (salesData ?? []).filter((s: any) => s.division === division);
  };

  // 주차별 입력 핸들러
  const handleWeeklyInput = (division: string, productGroup: string, week: string, value: string) => {
    const key = `${division}-${productGroup}`;
    setWeeklyInputs(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [week]: parseNumber(value)
      }
    }));
    setHasChanges(true);
  };

  const handleContractInput = (brand: string, channel: string, subChannel: string | null, week: string, value: string) => {
    const key = subChannel ? `${brand}-${channel}-${subChannel}` : `${brand}-${channel}`;
    setContractInputs(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [week]: parseNumber(value)
      }
    }));
    setHasChanges(true);
  };

  // 저장 핸들러
  const handleSave = async () => {
    try {
      // 매출 데이터 저장
      for (const [sectionName, config] of Object.entries(dynamicSalesFrames)) {
        for (const item of config.items) {
          const key = `${config.division}-${item}`;
          const existingRecord = salesData?.find((s: any) => s.division === config.division && s.productGroup === item);
          const weekData = weeklyInputs[key] || { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 };
          
          await upsertSalesMutation.mutateAsync({
            year,
            month,
            division: config.division,
            productGroup: item,
            previousMonthSales: existingRecord?.previousMonthSales ?? 0,
            monthlyTarget: existingRecord?.monthlyTarget ?? 0,
            week1Sales: weekData.week1,
            week2Sales: weekData.week2,
            week3Sales: weekData.week3,
            week4Sales: weekData.week4,
            week5Sales: weekData.week5,
          });
        }
      }

      // 계약 데이터 저장 (봄봄시공 + 리코코시공)
      for (const brand of ['bombom', 'ricoco']) {
        for (const [channel, subChannels] of Object.entries(dynamicContractFrames)) {
          for (const subChannel of subChannels) {
            const key = `${brand}-${channel}-${subChannel}`;
            const existingRecord = contractData?.find((c: any) => c.brand === brand && c.channel === channel && c.subChannel === subChannel);
            const weekData = contractInputs[key] || { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 };
            
            await upsertContractMutation.mutateAsync({
              year,
              month,
              brand,
              channel,
              subChannel,
              previousMonthCount: existingRecord?.previousMonthCount ?? 0,
              monthlyTarget: existingRecord?.monthlyTarget ?? 0,
              week1Count: weekData.week1,
              week2Count: weekData.week2,
              week3Count: weekData.week3,
              week4Count: weekData.week4,
              week5Count: weekData.week5,
            });
          }
        }
      }

      toast.success('저장되었습니다.');
      setHasChanges(false);
      refetchSales();
      refetchContracts();
      refetchWeeklySummary();
    } catch (error) {
      toast.error('저장 중 오류가 발생했습니다.');
    }
  };

  // 설정 모달 열기
  const openSetupModal = (section: string) => {
    setSetupSection(section);
    const config = dynamicSalesFrames[section as keyof typeof dynamicSalesFrames];
    if (config) {
      const data: Record<string, { previousMonth: number; target: number }> = {};
      config.items.forEach(item => {
        const record = salesData?.find((s: any) => s.division === config.division && s.productGroup === item);
        data[item] = {
          previousMonth: record?.previousMonthSales ?? 0,
          target: record?.monthlyTarget ?? 0
        };
      });
      setSetupData(data);
    }
    setIsSetupModalOpen(true);
  };

  // 설정 저장
  const handleSetupSave = async () => {
    const config = dynamicSalesFrames[setupSection as keyof typeof dynamicSalesFrames];
    if (!config) return;

    try {
      for (const item of config.items) {
        const data = setupData[item] || { previousMonth: 0, target: 0 };
        const key = `${config.division}-${item}`;
        const weekData = weeklyInputs[key] || { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 };
        
        await upsertSalesMutation.mutateAsync({
          year,
          month,
          division: config.division,
          productGroup: item,
          previousMonthSales: data.previousMonth,
          monthlyTarget: data.target,
          week1Sales: weekData.week1,
          week2Sales: weekData.week2,
          week3Sales: weekData.week3,
          week4Sales: weekData.week4,
          week5Sales: weekData.week5,
        });
      }
      toast.success('설정이 저장되었습니다.');
      setIsSetupModalOpen(false);
      refetchSales();
      refetchWeeklySummary();
    } catch (error) {
      toast.error('설정 저장 중 오류가 발생했습니다.');
    }
  };

  // 계약현황 설정 모달 열기
  // 계약현황 설정 모달용 brand state
  const [contractSetupBrand, setContractSetupBrand] = useState<string>('bombom');

  const openContractSetupModal = (brand: string, channel: string) => {
    setContractSetupBrand(brand);
    setContractSetupChannel(channel);
    const subChannels = dynamicContractFrames[channel as keyof typeof dynamicContractFrames] || [];
    const data: Record<string, { previousMonth: number; target: number }> = {};
    subChannels.forEach(subChannel => {
      const record = contractData?.find((c: any) => c.brand === brand && c.channel === channel && c.subChannel === subChannel);
      data[subChannel] = {
        previousMonth: record?.previousMonthCount ?? 0,
        target: record?.monthlyTarget ?? 0,
      };
    });
    setContractSetupData(data);
    setIsContractSetupModalOpen(true);
  };

  // 계약현황 설정 저장
  const handleContractSetupSave = async () => {
    const subChannels = dynamicContractFrames[contractSetupChannel as keyof typeof dynamicContractFrames] || [];
    if (subChannels.length === 0) return;

    try {
      for (const subChannel of subChannels) {
        const data = contractSetupData[subChannel] || { previousMonth: 0, target: 0 };
        const key = `${contractSetupBrand}-${contractSetupChannel}-${subChannel}`;
        const weekData = contractInputs[key] || { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 };
        
        await upsertContractMutation.mutateAsync({
          year,
          month,
          brand: contractSetupBrand,
          channel: contractSetupChannel,
          subChannel: subChannel,
          previousMonthCount: data.previousMonth,
          monthlyTarget: data.target,
          week1Count: weekData.week1,
          week2Count: weekData.week2,
          week3Count: weekData.week3,
          week4Count: weekData.week4,
          week5Count: weekData.week5,
        });
      }
      toast.success('계약현황 설정이 저장되었습니다.');
      setIsContractSetupModalOpen(false);
      refetchContracts();
    } catch (error) {
      toast.error('계약현황 설정 저장 중 오류가 발생했습니다.');
    }
  };

  // 항목 관리 모달 열기 (매출현황)
  const openItemManageModal = (section: string) => {
    setItemManageSection(section);
    const config = dynamicSalesFrames[section as keyof typeof dynamicSalesFrames];
    if (config) {
      setItemManageItems([...config.items]);
    }
    setNewItemName('');
    setEditingItemIndex(null);
    setEditingItemName('');
    setIsItemManageModalOpen(true);
  };

  // 항목 추가 (매출현황)
  const handleAddItem = () => {
    if (!newItemName.trim()) {
      toast.error('항목명을 입력해주세요.');
      return;
    }
    if (itemManageItems.includes(newItemName.trim())) {
      toast.error('이미 존재하는 항목입니다.');
      return;
    }
    setItemManageItems([...itemManageItems, newItemName.trim()]);
    setNewItemName('');
  };

  // 항목 수정 시작
  const startEditItem = (index: number) => {
    setEditingItemIndex(index);
    setEditingItemName(itemManageItems[index]);
  };

  // 항목 수정 저장
  const saveEditItem = () => {
    if (editingItemIndex === null) return;
    if (!editingItemName.trim()) {
      toast.error('항목명을 입력해주세요.');
      return;
    }
    const newItems = [...itemManageItems];
    newItems[editingItemIndex] = editingItemName.trim();
    setItemManageItems(newItems);
    setEditingItemIndex(null);
    setEditingItemName('');
  };

  // 항목 삭제
  const deleteItem = (index: number) => {
    const newItems = itemManageItems.filter((_, i) => i !== index);
    setItemManageItems(newItems);
  };

  // 항목 관리 저장
  const handleSaveItemManage = () => {
    const config = dynamicSalesFrames[itemManageSection as keyof typeof dynamicSalesFrames];
    if (!config) return;
    
    setDynamicSalesFrames(prev => ({
      ...prev,
      [itemManageSection]: {
        ...config,
        items: itemManageItems
      }
    }));
    
    toast.success(`${itemManageSection} 항목이 저장되었습니다.`);
    setIsItemManageModalOpen(false);
  };

  // 채널 관리 모달 열기 (계약현황)
  const openChannelManageModal = (channelType: string) => {
    setChannelManageType(channelType);
    const channels = dynamicContractFrames[channelType as keyof typeof dynamicContractFrames];
    if (channels) {
      setChannelManageItems([...channels]);
    }
    setNewChannelName('');
    setEditingChannelIndex(null);
    setEditingChannelName('');
    setIsChannelManageModalOpen(true);
  };

  // 채널 추가
  const handleAddChannel = () => {
    if (!newChannelName.trim()) {
      toast.error('채널명을 입력해주세요.');
      return;
    }
    if (channelManageItems.includes(newChannelName.trim())) {
      toast.error('이미 존재하는 채널입니다.');
      return;
    }
    setChannelManageItems([...channelManageItems, newChannelName.trim()]);
    setNewChannelName('');
  };

  // 채널 수정 시작
  const startEditChannel = (index: number) => {
    setEditingChannelIndex(index);
    setEditingChannelName(channelManageItems[index]);
  };

  // 채널 수정 저장
  const saveEditChannel = () => {
    if (editingChannelIndex === null) return;
    if (!editingChannelName.trim()) {
      toast.error('채널명을 입력해주세요.');
      return;
    }
    const newChannels = [...channelManageItems];
    newChannels[editingChannelIndex] = editingChannelName.trim();
    setChannelManageItems(newChannels);
    setEditingChannelIndex(null);
    setEditingChannelName('');
  };

  // 채널 삭제
  const deleteChannel = (index: number) => {
    const newChannels = channelManageItems.filter((_, i) => i !== index);
    setChannelManageItems(newChannels);
  };

  // 채널 관리 저장
  const handleSaveChannelManage = () => {
    setDynamicContractFrames(prev => ({
      ...prev,
      [channelManageType]: channelManageItems
    }));
    
    toast.success(`${channelManageType} 채널이 저장되었습니다.`);
    setIsChannelManageModalOpen(false);
  };

  // 누계 및 달성률 계산
  const calculateCumulative = (division: string, productGroup: string) => {
    const key = `${division}-${productGroup}`;
    const weekData = weeklyInputs[key] || { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 };
    return (weekData.week1 ?? 0) + (weekData.week2 ?? 0) + (weekData.week3 ?? 0) + (weekData.week4 ?? 0) + (weekData.week5 ?? 0);
  };

  const calculateAchievementRate = (division: string, productGroup: string) => {
    // 개별 항목(productGroup)의 monthlyTarget을 우선 사용
    const record = salesData?.find((s: any) => s.division === division && s.productGroup === productGroup);
    const recordTarget = record?.monthlyTarget ?? 0;
    // 개별 항목 목표가 있으면 사용, 없으면 사업계획 대분류 목표 사용
    const target = recordTarget > 0 ? recordTarget : (businessPlanTargets[division] || 0);
    if (target === 0) return '0.0';
    const cumulative = calculateCumulative(division, productGroup);
    return ((cumulative / target) * 100).toFixed(1);
  };

  const calculateContractCumulative = (brand: string, channel: string, subChannel: string | null) => {
    const key = subChannel ? `${brand}-${channel}-${subChannel}` : `${brand}-${channel}`;
    const weekData = contractInputs[key] || { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 };
    return (weekData.week1 ?? 0) + (weekData.week2 ?? 0) + (weekData.week3 ?? 0) + (weekData.week4 ?? 0) + (weekData.week5 ?? 0);
  };

  const calculateContractAchievementRate = (brand: string, channel: string, subChannel: string | null) => {
    const record = contractData?.find((c: any) => c.brand === brand && c.channel === channel && c.subChannel === subChannel);
    const target = record?.monthlyTarget ?? 0;
    if (target === 0) return '0.0';
    const cumulative = calculateContractCumulative(brand, channel, subChannel);
    return ((cumulative / target) * 100).toFixed(1);
  };

  // 섹션별 합계 계산
  const calculateSectionTotals = (division: string, items: string[]) => {
    let previousMonth = 0, week1 = 0, week2 = 0, week3 = 0, week4 = 0, week5 = 0;
    
    items.forEach(item => {
      // 사업계획 실적에서 전월실적 가져오기
      previousMonth += getPreviousMonthSales(division, item);
      
      const key = `${division}-${item}`;
      const weekData = weeklyInputs[key] || { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 };
      week1 += weekData.week1 ?? 0;
      week2 += weekData.week2 ?? 0;
      week3 += weekData.week3 ?? 0;
      week4 += weekData.week4 ?? 0;
      week5 += weekData.week5 ?? 0;
    });

    // 개별 항목의 monthlyTarget 합산을 우선 사용, 없으면 사업계획 대분류 목표 사용
    let itemTargetSum = 0;
    items.forEach(item => {
      const record = salesData?.find((s: any) => s.division === division && s.productGroup === item);
      itemTargetSum += record?.monthlyTarget ?? 0;
    });
    // 개별 항목 목표 합산이 있으면 사용, 없으면 사업계획 대분류 목표 사용
    let target = itemTargetSum > 0 ? itemTargetSum : (businessPlanTargets[division] || 0);
    const cumulative = week1 + week2 + week3 + week4 + week5;
    const rate = target > 0 ? ((cumulative / target) * 100).toFixed(1) : '0.0';

    return { previousMonth, target, week1, week2, week3, week4, week5, cumulative, rate };
  };

  // 계약 섹션 합계
  const calculateContractSectionTotals = (brand: string, channel: string, subChannels: string[]) => {
    let previousMonth = 0, target = 0, week1 = 0, week2 = 0, week3 = 0, week4 = 0, week5 = 0;
    
    subChannels.forEach(subChannel => {
      const record = contractData?.find((c: any) => c.brand === brand && c.channel === channel && c.subChannel === subChannel);
      previousMonth += record?.previousMonthCount ?? 0;
      target += record?.monthlyTarget ?? 0;
      
      const key = `${brand}-${channel}-${subChannel}`;
      const weekData = contractInputs[key] || { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 };
      week1 += weekData.week1 ?? 0;
      week2 += weekData.week2 ?? 0;
      week3 += weekData.week3 ?? 0;
      week4 += weekData.week4 ?? 0;
      week5 += weekData.week5 ?? 0;
    });

    const cumulative = week1 + week2 + week3 + week4 + week5;
    const rate = target > 0 ? ((cumulative / target) * 100).toFixed(1) : '0.0';

    return { previousMonth, target, week1, week2, week3, week4, week5, cumulative, rate };
  };

  // 전체 계약 합계 (브랜드별)
  const calculateTotalContractTotals = (brand: string) => {
    const internal = calculateContractSectionTotals(brand, '내부채널', dynamicContractFrames['내부채널']);
    const external = calculateContractSectionTotals(brand, '외부채널', dynamicContractFrames['외부채널']);
    
    return {
      previousMonth: internal.previousMonth + external.previousMonth,
      target: internal.target + external.target,
      week1: internal.week1 + external.week1,
      week2: internal.week2 + external.week2,
      week3: internal.week3 + external.week3,
      week4: internal.week4 + external.week4,
      week5: internal.week5 + external.week5,
      cumulative: internal.cumulative + external.cumulative,
      rate: (internal.target + external.target) > 0 
        ? (((internal.cumulative + external.cumulative) / (internal.target + external.target)) * 100).toFixed(1) 
        : '0.0'
    };
  };

  // Navigation
  const goToPrevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  // 주간 트렌드 데이터
  const weeklyTrendData = useMemo(() => {
    const weeks = ['1주', '2주', '3주', '4주'];
    return weeks.map((week, idx) => {
      const weekKey = `week${idx + 1}`;
      const data: Record<string, string | number> = { name: week };
      
      Object.entries(dynamicSalesFrames).forEach(([sectionName, config]) => {
        let total = 0;
        config.items.forEach(item => {
          const key = `${config.division}-${item}`;
          const weekData = weeklyInputs[key] || {};
          total += weekData[weekKey] || 0;
        });
        data[sectionName] = total;
      });
      
      return data;
    });
  }, [weeklyInputs, dynamicSalesFrames]);

  const isLoading = salesLoading || contractLoading;

  // 전월 대비 차트 데이터 - 사업계획 실적에서 가져오기
  const monthComparisonData = useMemo(() => {
    const sections = Object.entries(dynamicSalesFrames);
    return sections.map(([sectionName, config]) => {
      // 금월 누계
      let currentMonthTotal = 0;
      config.items.forEach(item => {
        const key = `${config.division}-${item}`;
        const weekData = weeklyInputs[key] || { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 };
        currentMonthTotal += (weekData.week1 ?? 0) + (weekData.week2 ?? 0) + (weekData.week3 ?? 0) + (weekData.week4 ?? 0) + (weekData.week5 ?? 0);
      });

      // 전월실적 - 사업계획 실적에서 가져오기
      let lastMonthTotal = 0;
      config.items.forEach(item => {
        lastMonthTotal += getPreviousMonthSales(config.division, item);
      });

      return {
        name: sectionName,
        '전월': lastMonthTotal,
        '금월': currentMonthTotal,
      };
    });
  }, [weeklyInputs, salesData, businessPlanPrevMonthActuals, dynamicSalesFrames]);

  // 계약실적 채널별 데이터 (파이 차트용) - 두 브랜드 합산
  const contractChannelDataByBrand = (brand: string) => {
    const channels = Object.entries(dynamicContractFrames);
    return channels.map(([channelName, subChannels]) => {
      let total = 0;
      subChannels.forEach(subChannel => {
        const key = `${brand}-${channelName}-${subChannel}`;
        const weekData = contractInputs[key] || { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 };
        total += (weekData.week1 ?? 0) + (weekData.week2 ?? 0) + (weekData.week3 ?? 0) + (weekData.week4 ?? 0) + (weekData.week5 ?? 0);
      });
      return {
        name: channelName,
        value: total,
      };
    });
  };

  const bombomContractChannelData = useMemo(() => contractChannelDataByBrand('bombom'), [contractInputs, dynamicContractFrames]);
  const ricocoContractChannelData = useMemo(() => contractChannelDataByBrand('ricoco'), [contractInputs, dynamicContractFrames]);
  const contractChannelData = useMemo(() => {
    const channels = Object.entries(dynamicContractFrames);
    return channels.map(([channelName, subChannels]) => {
      let total = 0;
      ['bombom', 'ricoco'].forEach(brand => {
        subChannels.forEach(subChannel => {
          const key = `${brand}-${channelName}-${subChannel}`;
          const weekData = contractInputs[key] || { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 };
          total += (weekData.week1 ?? 0) + (weekData.week2 ?? 0) + (weekData.week3 ?? 0) + (weekData.week4 ?? 0) + (weekData.week5 ?? 0);
        });
      });
      return {
        name: channelName,
        value: total,
      };
    });
  }, [contractInputs, dynamicContractFrames]);

  // 계약실적 세부 채널별 데이터 (막대 차트용) - 브랜드별
  const contractSubChannelDataByBrand = (brand: string) => {
    const data: { name: string; '내부채널': number; '외부채널': number }[] = [];
    
    dynamicContractFrames['내부채널'].forEach(subChannel => {
      const key = `${brand}-내부채널-${subChannel}`;
      const weekData = contractInputs[key] || { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 };
      const total = (weekData.week1 ?? 0) + (weekData.week2 ?? 0) + (weekData.week3 ?? 0) + (weekData.week4 ?? 0) + (weekData.week5 ?? 0);
      data.push({ name: subChannel, '내부채널': total, '외부채널': 0 });
    });
    
    dynamicContractFrames['외부채널'].forEach(subChannel => {
      const key = `${brand}-외부채널-${subChannel}`;
      const weekData = contractInputs[key] || { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 };
      const total = (weekData.week1 ?? 0) + (weekData.week2 ?? 0) + (weekData.week3 ?? 0) + (weekData.week4 ?? 0) + (weekData.week5 ?? 0);
      const existingIdx = data.findIndex(d => d.name === subChannel);
      if (existingIdx >= 0) {
        data[existingIdx]['외부채널'] = total;
      } else {
        data.push({ name: subChannel, '내부채널': 0, '외부채널': total });
      }
    });
    
    return data;
  };

  const bombomContractSubChannelData = useMemo(() => contractSubChannelDataByBrand('bombom'), [contractInputs, dynamicContractFrames]);
  const ricocoContractSubChannelData = useMemo(() => contractSubChannelDataByBrand('ricoco'), [contractInputs, dynamicContractFrames]);

  // 계약실적 세부 채널별 데이터 (막대 차트용) - 두 브랜드 합산
  const contractSubChannelData = useMemo(() => {
    const data: { name: string; '내부채널': number; '외부채널': number }[] = [];
    
    // 내부채널 데이터
    dynamicContractFrames['내부채널'].forEach(subChannel => {
      let total = 0;
      ['bombom', 'ricoco'].forEach(brand => {
        const key = `${brand}-내부채널-${subChannel}`;
        const weekData = contractInputs[key] || { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 };
        total += (weekData.week1 ?? 0) + (weekData.week2 ?? 0) + (weekData.week3 ?? 0) + (weekData.week4 ?? 0) + (weekData.week5 ?? 0);
      });
      const existingIdx = data.findIndex(d => d.name === subChannel);
      if (existingIdx >= 0) {
        data[existingIdx]['내부채널'] = total;
      } else {
        data.push({ name: subChannel, '내부채널': total, '외부채널': 0 });
      }
    });
    
    // 외부채널 데이터
    dynamicContractFrames['외부채널'].forEach(subChannel => {
      let total = 0;
      ['bombom', 'ricoco'].forEach(brand => {
        const key = `${brand}-외부채널-${subChannel}`;
        const weekData = contractInputs[key] || { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 };
        total += (weekData.week1 ?? 0) + (weekData.week2 ?? 0) + (weekData.week3 ?? 0) + (weekData.week4 ?? 0) + (weekData.week5 ?? 0);
      });
      const existingIdx = data.findIndex(d => d.name === subChannel);
      if (existingIdx >= 0) {
        data[existingIdx]['외부채널'] = total;
      } else {
        data.push({ name: subChannel, '내부채널': 0, '외부채널': total });
      }
    });
    
    return data;
  }, [contractInputs]);

  // 계약실적 전월 대비 데이터 - 브랜드별
  const contractMonthComparisonDataByBrand = (brand: string) => {
    const channels = Object.entries(dynamicContractFrames);
    return channels.map(([channelName, subChannels]) => {
      let currentMonthTotal = 0;
      let lastMonthTotal = 0;
      subChannels.forEach(subChannel => {
        const key = `${brand}-${channelName}-${subChannel}`;
        const weekData = contractInputs[key] || { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 };
        currentMonthTotal += (weekData.week1 ?? 0) + (weekData.week2 ?? 0) + (weekData.week3 ?? 0) + (weekData.week4 ?? 0) + (weekData.week5 ?? 0);
      });
      if (contractData) {
        subChannels.forEach(subChannel => {
          const record = contractData.find((c: any) => c.brand === brand && c.channel === channelName && c.subChannel === subChannel);
          if (record) {
            lastMonthTotal += record.previousMonthCount ?? 0;
          }
        });
      }
      return {
        name: channelName,
        '전월': lastMonthTotal,
        '금월': currentMonthTotal,
      };
    });
  };

  const bombomContractMonthComparisonData = useMemo(() => contractMonthComparisonDataByBrand('bombom'), [contractInputs, contractData, dynamicContractFrames]);
  const ricocoContractMonthComparisonData = useMemo(() => contractMonthComparisonDataByBrand('ricoco'), [contractInputs, contractData, dynamicContractFrames]);

  // 계약실적 전월 대비 데이터 - 두 브랜드 합산
  const contractMonthComparisonData = useMemo(() => {
    const channels = Object.entries(dynamicContractFrames);
    return channels.map(([channelName, subChannels]) => {
      let currentMonthTotal = 0;
      let lastMonthTotal = 0;
      ['bombom', 'ricoco'].forEach(brand => {
        subChannels.forEach(subChannel => {
          const key = `${brand}-${channelName}-${subChannel}`;
          const weekData = contractInputs[key] || { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 };
          currentMonthTotal += (weekData.week1 ?? 0) + (weekData.week2 ?? 0) + (weekData.week3 ?? 0) + (weekData.week4 ?? 0) + (weekData.week5 ?? 0);
        });
        if (contractData) {
          subChannels.forEach(subChannel => {
            const record = contractData.find((c: any) => c.brand === brand && c.channel === channelName && c.subChannel === subChannel);
            if (record) {
              lastMonthTotal += record.previousMonthCount ?? 0;
            }
          });
        }
      });

      return {
        name: channelName,
        '전월': lastMonthTotal,
        '금월': currentMonthTotal,
      };
    });
  }, [contractInputs, contractData, dynamicContractFrames]);

  // 계약실적 주간 트렌드 데이터 - 브랜드별
  const contractWeeklyTrendDataByBrand = (brand: string) => {
    const weeks = ['1주', '2주', '3주', '4주'];
    return weeks.map((week, idx) => {
      const weekKey = `week${idx + 1}`;
      let internalTotal = 0;
      let externalTotal = 0;
      
      dynamicContractFrames['내부채널'].forEach(subChannel => {
        const key = `${brand}-내부채널-${subChannel}`;
        const weekData = contractInputs[key] || {};
        internalTotal += weekData[weekKey] || 0;
      });
      
      dynamicContractFrames['외부채널'].forEach(subChannel => {
        const key = `${brand}-외부채널-${subChannel}`;
        const weekData = contractInputs[key] || {};
        externalTotal += weekData[weekKey] || 0;
      });
      
      return {
        name: week,
        '내부채널': internalTotal,
        '외부채널': externalTotal,
      };
    });
  };

  const bombomContractWeeklyTrendData = useMemo(() => contractWeeklyTrendDataByBrand('bombom'), [contractInputs, dynamicContractFrames]);
  const ricocoContractWeeklyTrendData = useMemo(() => contractWeeklyTrendDataByBrand('ricoco'), [contractInputs, dynamicContractFrames]);

  // 계약실적 주간 트렌드 데이터 - 두 브랜드 합산
  const contractWeeklyTrendData = useMemo(() => {
    const weeks = ['1주', '2주', '3주', '4주'];
    return weeks.map((week, idx) => {
      const weekKey = `week${idx + 1}`;
      let internalTotal = 0;
      let externalTotal = 0;
      
      ['bombom', 'ricoco'].forEach(brand => {
        dynamicContractFrames['내부채널'].forEach(subChannel => {
          const key = `${brand}-내부채널-${subChannel}`;
          const weekData = contractInputs[key] || {};
          internalTotal += weekData[weekKey] || 0;
        });
        
        dynamicContractFrames['외부채널'].forEach(subChannel => {
          const key = `${brand}-외부채널-${subChannel}`;
          const weekData = contractInputs[key] || {};
          externalTotal += weekData[weekKey] || 0;
        });
      });
      
      return {
        name: week,
        '내부채널': internalTotal,
        '외부채널': externalTotal,
      };
    });
  }, [contractInputs]);

  // 파이 차트 색상
  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  // 입력 셀 스타일 (핑크색 배경)
  const inputCellStyle = "bg-pink-50 border border-pink-200";

  // 매출 섹션 렌더링
  const renderSalesSection = (sectionName: string, config: typeof SALES_FRAMES[keyof typeof SALES_FRAMES]) => {
    const totals = calculateSectionTotals(config.division, config.items);

    return (
      <section key={sectionName} id={`section-${config.division}`} className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className={`flex items-center justify-between p-4 border-b border-border/60 ${DIVISION_COLORS[config.division]?.bg || 'bg-muted/30'}`}>
          <h2 className={`text-lg font-bold ${DIVISION_COLORS[config.division]?.text || 'text-foreground'}`}>{sectionName}</h2>
          {canEditSales && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openSetupModal(sectionName)}>
                전월실적/목표 설정
              </Button>
              <Button size="sm" variant="outline" onClick={() => openItemManageModal(sectionName)}>
                <Plus className="h-4 w-4 mr-1" />
                {config.label} 관리
              </Button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">{config.label}</TableHead>
                <TableHead className="text-right w-[100px]">전월실적</TableHead>
                <TableHead className="text-right w-[100px]">금월목표</TableHead>
                <TableHead className={`text-right w-[90px] ${inputCellStyle}`}>1주</TableHead>
                <TableHead className={`text-right w-[90px] ${inputCellStyle}`}>2주</TableHead>
                <TableHead className={`text-right w-[90px] ${inputCellStyle}`}>3주</TableHead>
                <TableHead className={`text-right w-[90px] ${inputCellStyle}`}>4주</TableHead>
                <TableHead className="text-right w-[100px] bg-blue-50">월누계</TableHead>
                <TableHead className="text-right w-[80px] bg-green-50">달성률</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.items.map((item) => {
                const record = salesData?.find((s: any) => s.division === config.division && s.productGroup === item);
                const key = `${config.division}-${item}`;
                const weekData = weeklyInputs[key] || { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 };
                const cumulative = calculateCumulative(config.division, item);
                const rate = calculateAchievementRate(config.division, item);

                return (
                  <TableRow key={item}>
                    <TableCell className="font-medium">{item}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(getPreviousMonthSales(config.division, item))}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(record?.monthlyTarget)}</TableCell>
                    <TableCell className={inputCellStyle}>
                      <Input
                        type="text"
                        value={formatNumber(weekData.week1 ?? 0)}
                        onChange={(e) => handleWeeklyInput(config.division, item, 'week1', e.target.value)}
                        className="h-8 text-right font-mono bg-transparent border-0 focus:ring-1 focus:ring-pink-400"
                        placeholder="0"
                        disabled={!canEditSales}
                      />
                    </TableCell>
                    <TableCell className={inputCellStyle}>
                      <Input
                        type="text"
                        value={formatNumber(weekData.week2 ?? 0)}
                        onChange={(e) => handleWeeklyInput(config.division, item, 'week2', e.target.value)}
                        className="h-8 text-right font-mono bg-transparent border-0 focus:ring-1 focus:ring-pink-400"
                        placeholder="0"
                        disabled={!canEditSales}
                      />
                    </TableCell>
                    <TableCell className={inputCellStyle}>
                      <Input
                        type="text"
                        value={formatNumber(weekData.week3 ?? 0)}
                        onChange={(e) => handleWeeklyInput(config.division, item, 'week3', e.target.value)}
                        className="h-8 text-right font-mono bg-transparent border-0 focus:ring-1 focus:ring-pink-400"
                        placeholder="0"
                        disabled={!canEditSales}
                      />
                    </TableCell>
                    <TableCell className={inputCellStyle}>
                      <Input
                        type="text"
                        value={formatNumber(weekData.week4 ?? 0)}
                        onChange={(e) => handleWeeklyInput(config.division, item, 'week4', e.target.value)}
                        className="h-8 text-right font-mono bg-transparent border-0 focus:ring-1 focus:ring-pink-400"
                        placeholder="0"
                        disabled={!canEditSales}
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold bg-blue-50">{formatNumber(cumulative)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-50">{rate}%</TableCell>
                  </TableRow>
                );
              })}
              {/* 합계 행 */}
              <TableRow className="bg-muted/50 font-semibold border-t-2">
                <TableCell>합계</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(totals.previousMonth)}</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(totals.target)}</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(totals.week1)}</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(totals.week2)}</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(totals.week3)}</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(totals.week4)}</TableCell>
                <TableCell className="text-right font-mono bg-blue-100">{formatNumber(totals.cumulative)}</TableCell>
                <TableCell className="text-right font-mono bg-green-100">{totals.rate}%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>
    );
  };

  // 계약 섹션 렌더링 (brand별)
  const renderContractSection = (brand: string, brandLabel: string) => {
    const internalTotals = calculateContractSectionTotals(brand, '내부채널', dynamicContractFrames['내부채널']);
    const externalTotals = calculateContractSectionTotals(brand, '외부채널', dynamicContractFrames['외부채널']);
    const totalTotals = calculateTotalContractTotals(brand);

    return (
      <section key={brand} className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className={`flex items-center justify-between p-4 border-b border-border/60 ${DIVISION_COLORS[brand]?.bg || 'bg-teal-50 dark:bg-teal-950/30'}`}>
          <h2 className={`text-lg font-bold ${DIVISION_COLORS[brand]?.text || 'text-teal-700 dark:text-teal-300'}`}>계약현황 - {brandLabel}</h2>
          {canEditSales && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openContractSetupModal(brand, '내부채널')}>
                내부채널 목표설정
              </Button>
              <Button size="sm" variant="outline" onClick={() => openChannelManageModal('내부채널')}>
                <Plus className="h-4 w-4 mr-1" />
                내부채널 관리
              </Button>
              <Button size="sm" variant="outline" onClick={() => openContractSetupModal(brand, '외부채널')}>
                외부채널 목표설정
              </Button>
              <Button size="sm" variant="outline" onClick={() => openChannelManageModal('외부채널')}>
                <Plus className="h-4 w-4 mr-1" />
                외부채널 관리
              </Button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">유입경로</TableHead>
                <TableHead className="w-[120px]"></TableHead>
                <TableHead className="text-right w-[80px]">전월실적</TableHead>
                <TableHead className="text-right w-[80px]">금월목표</TableHead>
                <TableHead className={`text-right w-[70px] ${inputCellStyle}`}>1주</TableHead>
                <TableHead className={`text-right w-[70px] ${inputCellStyle}`}>2주</TableHead>
                <TableHead className={`text-right w-[70px] ${inputCellStyle}`}>3주</TableHead>
                <TableHead className={`text-right w-[70px] ${inputCellStyle}`}>4주</TableHead>
                <TableHead className="text-right w-[80px] bg-blue-50">월누계</TableHead>
                <TableHead className="text-right w-[70px] bg-green-50">달성률</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* 내부채널 */}
              {dynamicContractFrames['내부채널'].map((subChannel, idx) => {
                const record = contractData?.find((c: any) => c.brand === brand && c.channel === '내부채널' && c.subChannel === subChannel);
                const key = `${brand}-내부채널-${subChannel}`;
                const weekData = contractInputs[key] || { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 };
                const cumulative = calculateContractCumulative(brand, '내부채널', subChannel);
                const rate = calculateContractAchievementRate(brand, '내부채널', subChannel);

                return (
                  <TableRow key={key}>
                    {idx === 0 && (
                      <TableCell rowSpan={dynamicContractFrames['내부채널'].length + 1} className="font-medium align-top border-r">
                        내부채널
                      </TableCell>
                    )}
                    <TableCell>{subChannel}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(record?.previousMonthCount)}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(record?.monthlyTarget)}</TableCell>
                    <TableCell className={inputCellStyle}>
                      <Input
                        type="text"
                        value={formatNumber(weekData.week1 || 0)}
                        onChange={(e) => handleContractInput(brand, '내부채널', subChannel, 'week1', e.target.value)}
                        className="h-7 text-right font-mono text-sm bg-transparent border-0 focus:ring-1 focus:ring-pink-400"
                        placeholder="0"
                        disabled={!canEditSales}
                      />
                    </TableCell>
                    <TableCell className={inputCellStyle}>
                      <Input
                        type="text"
                        value={formatNumber(weekData.week2 || 0)}
                        onChange={(e) => handleContractInput(brand, '내부채널', subChannel, 'week2', e.target.value)}
                        className="h-7 text-right font-mono text-sm bg-transparent border-0 focus:ring-1 focus:ring-pink-400"
                        placeholder="0"
                        disabled={!canEditSales}
                      />
                    </TableCell>
                    <TableCell className={inputCellStyle}>
                      <Input
                        type="text"
                        value={formatNumber(weekData.week3 || 0)}
                        onChange={(e) => handleContractInput(brand, '내부채널', subChannel, 'week3', e.target.value)}
                        className="h-7 text-right font-mono text-sm bg-transparent border-0 focus:ring-1 focus:ring-pink-400"
                        placeholder="0"
                        disabled={!canEditSales}
                      />
                    </TableCell>
                    <TableCell className={inputCellStyle}>
                      <Input
                        type="text"
                        value={formatNumber(weekData.week4 || 0)}
                        onChange={(e) => handleContractInput(brand, '내부채널', subChannel, 'week4', e.target.value)}
                        className="h-7 text-right font-mono text-sm bg-transparent border-0 focus:ring-1 focus:ring-pink-400"
                        placeholder="0"
                        disabled={!canEditSales}
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono bg-blue-50">{formatNumber(cumulative)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-50">{rate}%</TableCell>
                  </TableRow>
                );
              })}
              {/* 내부채널 소계 */}
              <TableRow className="bg-gray-50 font-medium">
                <TableCell>소계</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(internalTotals.previousMonth)}</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(internalTotals.target)}</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(internalTotals.week1)}</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(internalTotals.week2)}</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(internalTotals.week3)}</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(internalTotals.week4)}</TableCell>
                <TableCell className="text-right font-mono bg-blue-100">{formatNumber(internalTotals.cumulative)}</TableCell>
                <TableCell className="text-right font-mono bg-green-100">{internalTotals.rate}%</TableCell>
              </TableRow>

              {/* 외부채널 */}
              {dynamicContractFrames['외부채널'].map((subChannel, idx) => {
                const record = contractData?.find((c: any) => c.brand === brand && c.channel === '외부채널' && c.subChannel === subChannel);
                const key = `${brand}-외부채널-${subChannel}`;
                const weekData = contractInputs[key] || { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 };
                const cumulative = calculateContractCumulative(brand, '외부채널', subChannel);
                const rate = calculateContractAchievementRate(brand, '외부채널', subChannel);

                return (
                  <TableRow key={key}>
                    {idx === 0 && (
                      <TableCell rowSpan={dynamicContractFrames['외부채널'].length + 1} className="font-medium align-top border-r">
                        외부채널
                      </TableCell>
                    )}
                    <TableCell>{subChannel}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(record?.previousMonthCount)}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(record?.monthlyTarget)}</TableCell>
                    <TableCell className={inputCellStyle}>
                      <Input
                        type="text"
                        value={formatNumber(weekData.week1 || 0)}
                        onChange={(e) => handleContractInput(brand, '외부채널', subChannel, 'week1', e.target.value)}
                        className="h-7 text-right font-mono text-sm bg-transparent border-0 focus:ring-1 focus:ring-pink-400"
                        placeholder="0"
                        disabled={!canEditSales}
                      />
                    </TableCell>
                    <TableCell className={inputCellStyle}>
                      <Input
                        type="text"
                        value={formatNumber(weekData.week2 || 0)}
                        onChange={(e) => handleContractInput(brand, '외부채널', subChannel, 'week2', e.target.value)}
                        className="h-7 text-right font-mono text-sm bg-transparent border-0 focus:ring-1 focus:ring-pink-400"
                        placeholder="0"
                        disabled={!canEditSales}
                      />
                    </TableCell>
                    <TableCell className={inputCellStyle}>
                      <Input
                        type="text"
                        value={formatNumber(weekData.week3 || 0)}
                        onChange={(e) => handleContractInput(brand, '외부채널', subChannel, 'week3', e.target.value)}
                        className="h-7 text-right font-mono text-sm bg-transparent border-0 focus:ring-1 focus:ring-pink-400"
                        placeholder="0"
                        disabled={!canEditSales}
                      />
                    </TableCell>
                    <TableCell className={inputCellStyle}>
                      <Input
                        type="text"
                        value={formatNumber(weekData.week4 || 0)}
                        onChange={(e) => handleContractInput(brand, '외부채널', subChannel, 'week4', e.target.value)}
                        className="h-7 text-right font-mono text-sm bg-transparent border-0 focus:ring-1 focus:ring-pink-400"
                        placeholder="0"
                        disabled={!canEditSales}
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono bg-blue-50">{formatNumber(cumulative)}</TableCell>
                    <TableCell className="text-right font-mono bg-green-50">{rate}%</TableCell>
                  </TableRow>
                );
              })}
              {/* 외부채널 소계 */}
              <TableRow className="bg-gray-50 font-medium">
                <TableCell>소계</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(externalTotals.previousMonth)}</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(externalTotals.target)}</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(externalTotals.week1)}</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(externalTotals.week2)}</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(externalTotals.week3)}</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(externalTotals.week4)}</TableCell>
                <TableCell className="text-right font-mono bg-blue-100">{formatNumber(externalTotals.cumulative)}</TableCell>
                <TableCell className="text-right font-mono bg-green-100">{externalTotals.rate}%</TableCell>
              </TableRow>

              {/* 채널 합계 */}
              <TableRow className="bg-muted/50 font-semibold border-t-2">
                <TableCell colSpan={2}>채널합계</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(totalTotals.previousMonth)}</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(totalTotals.target)}</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(totalTotals.week1)}</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(totalTotals.week2)}</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(totalTotals.week3)}</TableCell>
                <TableCell className="text-right font-mono">{formatNumber(totalTotals.week4)}</TableCell>
                <TableCell className="text-right font-mono bg-blue-100">{formatNumber(totalTotals.cumulative)}</TableCell>
                <TableCell className="text-right font-mono bg-green-100">{totalTotals.rate}%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">매출현황</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 bg-gradient-to-br from-pink-200 to-rose-300 border border-pink-300 rounded-sm"></span>
              핑크색 셀에 주차별 실적을 입력하세요
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPrevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-lg font-semibold min-w-[120px] text-center">
                {year}년 {month}월
              </span>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            {canEditSales && hasChanges && (
              <Button onClick={handleSave} disabled={upsertSalesMutation.isPending || upsertContractMutation.isPending}>
                {(upsertSalesMutation.isPending || upsertContractMutation.isPending) ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                저장
              </Button>
            )}
          </div>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* 이달의 한마디 */}
            <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-yellow-950/20 rounded-2xl border border-amber-200/60 dark:border-amber-800/60 p-6 shadow-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-200/30 to-transparent rounded-bl-full"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-200/20 to-transparent rounded-tr-full"></div>
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-md shadow-amber-200/50 dark:shadow-amber-900/50">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-amber-900 dark:text-amber-100">이달의 한마디</h2>
                    <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">{year}년 {month}월</p>
                  </div>
                </div>
                {canEditSales && !isEditingMessage && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                    onClick={() => {
                      setMessageInput(monthlyMessage?.message || '');
                      setIsEditingMessage(true);
                    }}
                  >
                    <Edit3 className="w-4 h-4 mr-1" />
                    {monthlyMessage ? '수정' : '작성'}
                  </Button>
                )}
              </div>
              
              {isEditingMessage ? (
                <div className="mt-4 space-y-3">
                  <Textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="이번 달 매출 목표, 주요 전략, 팀원들에게 전하고 싶은 메시지를 작성해주세요..."
                    className="min-h-[100px] bg-white dark:bg-gray-800 border-amber-200 dark:border-amber-700"
                    maxLength={1000}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      {messageInput.length}/1000자
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsEditingMessage(false);
                          setMessageInput('');
                        }}
                      >
                        취소
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (messageInput.trim()) {
                            upsertMessageMutation.mutate({
                              year,
                              month,
                              message: messageInput.trim(),
                            });
                          }
                        }}
                        disabled={!messageInput.trim() || upsertMessageMutation.isPending}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        {upsertMessageMutation.isPending && (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        저장
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  {monthlyMessage?.message ? (
                    <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-5 border border-amber-100/80 dark:border-amber-800/80 shadow-sm">
                      <div className="absolute top-3 left-4 text-4xl text-amber-200 dark:text-amber-800 font-serif leading-none select-none">&ldquo;</div>
                      <p className="text-foreground whitespace-pre-wrap leading-relaxed pl-6 pt-2 text-[15px]">
                        {monthlyMessage.message}
                      </p>
                      {monthlyMessage.authorName && (
                        <p className="mt-4 text-sm font-medium text-amber-600 dark:text-amber-400 text-right italic">
                          &mdash; {monthlyMessage.authorName}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 border border-dashed border-amber-300 dark:border-amber-700 text-center">
                      <p className="text-amber-600 dark:text-amber-400">
                        아직 작성된 메시지가 없습니다.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* 주단위 전체 매출 요약 */}
            {weeklySummary && (
              <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-blue-50 to-sky-50 dark:from-indigo-950/40 dark:via-blue-950/30 dark:to-sky-950/20 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60 p-6 shadow-sm">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-indigo-200/20 to-transparent rounded-bl-full"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-200/15 to-transparent rounded-tr-full"></div>
                <h2 className="relative text-lg font-bold mb-5 text-indigo-900 dark:text-indigo-100">주단위 전체 매출 현황</h2>
                
                {/* 목표 대비 달성률 프로그레스 바 */}
                <div className="relative mb-6 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-md shadow-indigo-100/50 dark:shadow-indigo-900/30 border border-indigo-100/80 dark:border-indigo-800/80">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground">월간 목표 달성률</span>
                      <span className={`text-2xl font-bold font-mono ${
                        parseFloat(weeklySummary.achievementRate) >= 100 ? 'text-green-600 dark:text-green-400' 
                        : parseFloat(weeklySummary.achievementRate) >= 70 ? 'text-yellow-600 dark:text-yellow-400' 
                        : 'text-red-600 dark:text-red-400'
                      }`}>
                        {weeklySummary.achievementRate}%
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">{formatNumber(weeklySummary.monthlyTotal)}</span>
                        <span className="mx-1">/</span>
                        <span className="font-mono">{formatNumber(weeklySummary.targetTotal)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <Progress 
                      value={Math.min(parseFloat(weeklySummary.achievementRate), 100)} 
                      className={`h-5 rounded-full ${
                        parseFloat(weeklySummary.achievementRate) >= 100 ? '[&>div]:bg-gradient-to-r [&>div]:from-green-400 [&>div]:to-emerald-600 [&>div]:shadow-sm [&>div]:shadow-green-300/50' 
                        : parseFloat(weeklySummary.achievementRate) >= 70 ? '[&>div]:bg-gradient-to-r [&>div]:from-yellow-400 [&>div]:to-amber-600 [&>div]:shadow-sm [&>div]:shadow-yellow-300/50' 
                        : '[&>div]:bg-gradient-to-r [&>div]:from-red-400 [&>div]:to-rose-600 [&>div]:shadow-sm [&>div]:shadow-red-300/50'
                      }`}
                    />
                    {parseFloat(weeklySummary.achievementRate) > 100 && (
                      <div className="absolute top-0 left-0 h-4 w-full flex items-center justify-end pr-2">
                        <span className="text-xs font-bold text-white drop-shadow">🎉 목표 초과!</span>
                      </div>
                    )}
                  </div>
                  
                  {/* 사업부별 프로그레스 바 */}
                  <div className="mt-5 space-y-2">
                    {weeklySummary.byDivision.map((div) => {
                      const divisionName = div.division === 'bombom' ? '봄봄시공' 
                        : div.division === 'ricoco' ? '리코코'
                        : div.division === 'manufacturing' ? '제조공급' 
                        : div.division === 'online' ? '온라인판매' 
                        : div.division;
                      const rateNum = parseFloat(div.rate);
                      const colors = DIVISION_COLORS[div.division] || DIVISION_COLORS.bombom;
                      const scrollToSection = () => {
                        const element = document.getElementById(`section-${div.division}`);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      };
                      return (
                        <div 
                          key={div.division} 
                          className={`flex items-center gap-3 cursor-pointer rounded-xl p-3 -mx-1 transition-all duration-200 hover:shadow-sm ${colors.bg} hover:scale-[1.01]`}
                          onClick={scrollToSection}
                          title={`${divisionName} 섹션으로 이동`}
                        >
                          <div className={`w-20 text-sm font-semibold truncate ${colors.text}`}>{divisionName}</div>
                          <div className="flex-1">
                            <Progress 
                              value={Math.min(rateNum, 100)} 
                              className={`h-3 rounded-full ${colors.progressBar}`}
                            />
                          </div>
                          <div className={`w-24 text-right text-sm font-mono font-bold ${colors.text}`}>
                            {div.rate}%
                            <span className="text-[10px] font-normal ml-1 opacity-70">
                              ({formatNumber(div.total)})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* 주간 달성률 추이 미니 차트 */}
                  <div className="mt-5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-indigo-100/60 dark:border-indigo-800/60">
                    <div className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-3">주간 달성률 추이</div>
                    <div className="h-[80px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart 
                          data={[
                            { 
                              week: '1주', 
                              rate: weeklySummary.targetTotal > 0 
                                ? Math.round((weeklySummary.week1Total / weeklySummary.targetTotal) * 100) 
                                : 0 
                            },
                            { 
                              week: '2주', 
                              rate: weeklySummary.targetTotal > 0 
                                ? Math.round(((weeklySummary.week1Total + weeklySummary.week2Total) / weeklySummary.targetTotal) * 100) 
                                : 0 
                            },
                            { 
                              week: '3주', 
                              rate: weeklySummary.targetTotal > 0 
                                ? Math.round(((weeklySummary.week1Total + weeklySummary.week2Total + weeklySummary.week3Total) / weeklySummary.targetTotal) * 100) 
                                : 0 
                            },
                            { 
                              week: '4주', 
                              rate: weeklySummary.targetTotal > 0 
                                ? Math.round(((weeklySummary.week1Total + weeklySummary.week2Total + weeklySummary.week3Total + weeklySummary.week4Total) / weeklySummary.targetTotal) * 100) 
                                : 0 
                            },
                          ]}
                          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                        >
                          <XAxis 
                            dataKey="week" 
                            tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} 
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis 
                            tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} 
                            axisLine={false}
                            tickLine={false}
                            domain={[0, 'auto']}
                            width={30}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'var(--card)', 
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              fontSize: '12px'
                            }}
                            formatter={(value: number) => [`${value}%`, '달성률']}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="rate" 
                            stroke="#6366f1" 
                            strokeWidth={2}
                            dot={{ fill: '#6366f1', r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                          {/* 목표 100% 기준선 */}
                          <Line 
                            type="monotone" 
                            dataKey={() => 100} 
                            stroke="#22c55e" 
                            strokeWidth={1}
                            strokeDasharray="3 3"
                            dot={false}
                            name="목표"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-indigo-500 rounded"></div>
                        <span>달성률</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-green-500 rounded" style={{ borderStyle: 'dashed' }}></div>
                        <span>목표(100%)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 주차별 전체 매출 카드 */}
                <div className="relative grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
                  {[
                    { label: '1주차', value: weeklySummary.week1Total },
                    { label: '2주차', value: weeklySummary.week2Total },
                    { label: '3주차', value: weeklySummary.week3Total },
                    { label: '4주차', value: weeklySummary.week4Total },
                  ].map((item, idx) => (
                    <div key={idx} className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-indigo-100/60 dark:border-indigo-800/60 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 transition-all duration-200 hover:-translate-y-0.5">
                      <div className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1.5">{item.label}</div>
                      <div className="text-lg font-bold font-mono text-indigo-700 dark:text-indigo-300">
                        {formatNumber(item.value)}
                      </div>
                    </div>
                  ))}
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/50 col-span-2 md:col-span-1 hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5">
                    <div className="text-xs font-semibold text-indigo-100 uppercase tracking-wider mb-1.5">월 누계</div>
                    <div className="text-lg font-bold font-mono text-white">
                      {formatNumber(weeklySummary.monthlyTotal)}
                    </div>
                    <div className="text-xs text-indigo-200 mt-1 font-medium">
                      목표 대비 {weeklySummary.achievementRate}%
                    </div>
                  </div>
                </div>

                {/* 사업부별 주차 매출 테이블 */}
                {weeklySummary.byDivision.length > 0 && (
                  <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl border border-indigo-100/60 dark:border-indigo-800/60 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/40 dark:to-blue-900/30">
                            <TableHead className="font-bold text-indigo-800 dark:text-indigo-200">사업부</TableHead>
                            <TableHead className="text-right font-bold text-indigo-800 dark:text-indigo-200">1주차</TableHead>
                            <TableHead className="text-right font-bold text-indigo-800 dark:text-indigo-200">2주차</TableHead>
                            <TableHead className="text-right font-bold text-indigo-800 dark:text-indigo-200">3주차</TableHead>
                            <TableHead className="text-right font-bold text-indigo-800 dark:text-indigo-200">4주차</TableHead>
                            <TableHead className="text-right font-bold text-indigo-800 dark:text-indigo-200 bg-indigo-100/80 dark:bg-indigo-800/50">월 누계</TableHead>
                            <TableHead className="text-right font-bold text-indigo-800 dark:text-indigo-200">목표</TableHead>
                            <TableHead className="text-right font-bold text-indigo-800 dark:text-indigo-200">달성률</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {weeklySummary.byDivision.filter((div) => div.division !== 'ricoco').map((div) => {
                            const divisionName = div.division === 'bombom' ? '봄봄시공' 
                              : div.division === 'manufacturing' ? '제조공급' 
                              : div.division === 'online' ? '온라인판매' 
                              : div.division;
                            const rateNum = parseFloat(div.rate);
                            const rateColor = rateNum >= 100 ? 'text-green-600 dark:text-green-400' 
                              : rateNum >= 70 ? 'text-yellow-600 dark:text-yellow-400' 
                              : 'text-red-600 dark:text-red-400';
                            return (
                              <TableRow key={div.division}>
                                <TableCell className="font-medium">{divisionName}</TableCell>
                                <TableCell className="text-right font-mono">{formatNumber(div.week1)}</TableCell>
                                <TableCell className="text-right font-mono">{formatNumber(div.week2)}</TableCell>
                                <TableCell className="text-right font-mono">{formatNumber(div.week3)}</TableCell>
                                <TableCell className="text-right font-mono">{formatNumber(div.week4)}</TableCell>
                                <TableCell className="text-right font-mono font-semibold bg-indigo-50 dark:bg-indigo-900/20">{formatNumber(div.total)}</TableCell>
                                <TableCell className="text-right font-mono text-muted-foreground">{formatNumber(div.target)}</TableCell>
                                <TableCell className={`text-right font-mono font-semibold ${rateColor}`}>{div.rate}%</TableCell>
                              </TableRow>
                            );
                          })}
                          {/* 합계 행 */}
                          <TableRow className="bg-gradient-to-r from-indigo-100 to-blue-100 dark:from-indigo-900/50 dark:to-blue-900/40 font-semibold border-t-2 border-indigo-300 dark:border-indigo-600">
                            <TableCell>합계</TableCell>
                            <TableCell className="text-right font-mono">{formatNumber(weeklySummary.week1Total)}</TableCell>
                            <TableCell className="text-right font-mono">{formatNumber(weeklySummary.week2Total)}</TableCell>
                            <TableCell className="text-right font-mono">{formatNumber(weeklySummary.week3Total)}</TableCell>
                            <TableCell className="text-right font-mono">{formatNumber(weeklySummary.week4Total)}</TableCell>
                            <TableCell className="text-right font-mono bg-indigo-200 dark:bg-indigo-800">{formatNumber(weeklySummary.monthlyTotal)}</TableCell>
                            <TableCell className="text-right font-mono">{formatNumber(weeklySummary.targetTotal)}</TableCell>
                            <TableCell className={`text-right font-mono ${
                              parseFloat(weeklySummary.achievementRate) >= 100 ? 'text-green-600 dark:text-green-400' 
                              : parseFloat(weeklySummary.achievementRate) >= 70 ? 'text-yellow-600 dark:text-yellow-400' 
                              : 'text-red-600 dark:text-red-400'
                            }`}>{weeklySummary.achievementRate}%</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* 주차별 매출 바 차트 */}
                <div className="mt-6 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-indigo-100/40 dark:border-indigo-800/40">
                  <div className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-3">주차별 매출 추이</div>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={[
                          { name: '1주차', 매출: weeklySummary.week1Total },
                          { name: '2주차', 매출: weeklySummary.week2Total },
                          { name: '3주차', 매출: weeklySummary.week3Total },
                          { name: '4주차', 매출: weeklySummary.week4Total },
                        ]}
                        barGap={8}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                        <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'var(--card)', 
                            border: '1px solid var(--border)',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => [formatNumber(value), '매출']}
                        />
                        <Bar dataKey="매출" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>
            )}

            {/* 주간 매출 트렌드 차트 */}
            {Object.values(weeklyInputs).some(w => Object.values(w).some(v => v > 0)) && (
              <section className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-fuchsia-50 to-pink-50 dark:from-purple-950/40 dark:via-fuchsia-950/30 dark:to-pink-950/20 rounded-2xl border border-purple-200/60 dark:border-purple-800/60 p-6 shadow-sm">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-200/20 to-transparent rounded-bl-full"></div>
                <h2 className="relative text-lg font-bold mb-5 text-purple-800 dark:text-purple-200">주간 매출 트렌드</h2>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--card)', 
                          border: '1px solid var(--border)',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [formatNumber(value), '']}
                      />
                      <Legend />
                      {Object.keys(dynamicSalesFrames).map((section, idx) => (
                        <Line 
                          key={section}
                          type="monotone" 
                          dataKey={section} 
                          stroke={CHART_COLORS[idx % CHART_COLORS.length]} 
                          strokeWidth={2}
                          dot={{ fill: CHART_COLORS[idx % CHART_COLORS.length], r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* 전월 대비 매출 비교 막대 차트 */}
            <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-950/40 dark:via-gray-950/30 dark:to-zinc-950/20 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-6 shadow-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-100/20 to-transparent rounded-bl-full"></div>
              <h2 className="relative text-lg font-bold mb-5 text-slate-800 dark:text-slate-200">전월 대비 매출 실적 <span className="text-sm font-normal text-muted-foreground ml-2">{year}년 {prevMonth}월 vs {month}월</span></h2>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthComparisonData} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--card)', 
                        border: '1px solid var(--border)',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [formatNumber(value), '']}
                    />
                    <Legend />
                    <Bar dataKey="전월" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="금월" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="relative mt-5 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {monthComparisonData.map((item: { name: string; '전월': number; '금월': number }) => {
                  const lastMonth = item['전월'];
                  const thisMonth = item['금월'];
                  const growthRate = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth * 100).toFixed(1) : (thisMonth > 0 ? '100.0' : '0.0');
                  const isPositive = thisMonth >= lastMonth;
                  return (
                    <div key={item.name} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border border-slate-100/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                      <div className="font-bold text-slate-700 dark:text-slate-300 mb-2">{item.name}</div>
                      <div className="space-y-1">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-muted-foreground">전월</span>
                          <span className="font-mono text-slate-500 dark:text-slate-400 text-xs">{formatNumber(lastMonth)}</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-muted-foreground">금월</span>
                          <span className="font-mono font-semibold text-sm">{formatNumber(thisMonth)}</span>
                        </div>
                      </div>
                      <div className={`mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-center gap-1 font-bold text-sm ${
                        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${
                          isPositive ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-rose-100 dark:bg-rose-900/50'
                        }`}>
                          {isPositive ? '▲' : '▼'}
                        </span>
                        {growthRate}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 매출 섹션들 */}
            {Object.entries(dynamicSalesFrames).map(([sectionName, config]) => 
              renderSalesSection(sectionName, config)
            )}

            {/* 계약현황 섹션 - 봄봄시공 */}
            {renderContractSection('bombom', '봄봄시공')}

            {/* 계약현황 섹션 - 리코코시공 */}
            {renderContractSection('ricoco', '리코코시공')}

            {/* 계약실적 시각화 - 봄봄시공 */}
            <section className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-950/40 dark:via-purple-950/30 dark:to-fuchsia-950/20 rounded-2xl border border-violet-200/60 dark:border-violet-800/60 p-6 shadow-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-200/20 to-transparent rounded-bl-full"></div>
              <h2 className="relative text-lg font-bold mb-5 text-violet-800 dark:text-violet-200">계약실적 시각화 - 봄봄시공</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 채널별 계약 비율 (파이 차트) */}
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-5 border border-white/50 dark:border-gray-700/50 shadow-sm">
                  <h3 className="text-md font-semibold mb-3">채널별 계약 비율</h3>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={bombomContractChannelData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {bombomContractChannelData.map((_: any, index: number) => (
                            <Cell key={`cell-bombom-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [`${value}건`, '계약 건수']}
                          contentStyle={{ 
                            backgroundColor: 'var(--card)', 
                            border: '1px solid var(--border)',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 text-center text-sm text-muted-foreground">
                    총 계약: <span className="font-semibold text-foreground">{bombomContractChannelData.reduce((sum: number, d: any) => sum + d.value, 0)}건</span>
                  </div>
                </div>

                {/* 계약실적 전월 대비 (막대 차트) */}
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-5 border border-white/50 dark:border-gray-700/50 shadow-sm">
                  <h3 className="text-md font-medium mb-3">전월 대비 계약 실적 ({year}년 {month}월)</h3>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bombomContractMonthComparisonData} barGap={8}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                        <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'var(--card)', 
                            border: '1px solid var(--border)',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => [`${value}건`, '']}
                        />
                        <Legend />
                        <Bar dataKey="전월" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="금월" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    {bombomContractMonthComparisonData.map((item: { name: string; '전월': number; '금월': number }) => {
                      const lastMonth = item['전월'];
                      const thisMonth = item['금월'];
                      const growthRate = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth * 100).toFixed(1) : (thisMonth > 0 ? '100.0' : '0.0');
                      const isPositive = thisMonth >= lastMonth;
                      return (
                        <div key={item.name} className="bg-background rounded p-2">
                          <div className="font-medium">{item.name}</div>
                          <div className={`text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '▲' : '▼'} {growthRate}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 계약실적 주간 트렌드 (라인 차트) */}
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-5 border border-white/50 dark:border-gray-700/50 shadow-sm">
                  <h3 className="text-md font-medium mb-3">주간 계약 트렌드</h3>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={bombomContractWeeklyTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                        <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'var(--card)', 
                            border: '1px solid var(--border)',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => [`${value}건`, '']}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="내부채널" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          dot={{ fill: '#3b82f6', r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="외부채널" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          dot={{ fill: '#10b981', r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 세부 채널별 계약 현황 (수평 막대 차트) */}
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-5 border border-white/50 dark:border-gray-700/50 shadow-sm">
                  <h3 className="text-md font-medium mb-3">세부 채널별 계약 현황</h3>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bombomContractSubChannelData} layout="vertical" barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis type="number" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} width={80} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'var(--card)', 
                            border: '1px solid var(--border)',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => [`${value}건`, '']}
                        />
                        <Legend />
                        <Bar dataKey="내부채널" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="외부채널" fill="#10b981" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </section>

            {/* 계약실적 시각화 - 리코코시공 */}
            <section className="relative overflow-hidden bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50 dark:from-rose-950/40 dark:via-pink-950/30 dark:to-fuchsia-950/20 rounded-2xl border border-rose-200/60 dark:border-rose-800/60 p-6 shadow-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-rose-200/20 to-transparent rounded-bl-full"></div>
              <h2 className="relative text-lg font-bold mb-5 text-rose-800 dark:text-rose-200">계약실적 시각화 - 리코코시공</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 채널별 계약 비율 (파이 차트) */}
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-5 border border-white/50 dark:border-gray-700/50 shadow-sm">
                  <h3 className="text-md font-semibold mb-3">채널별 계약 비율</h3>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={ricocoContractChannelData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {ricocoContractChannelData.map((_: any, index: number) => (
                            <Cell key={`cell-ricoco-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [`${value}건`, '계약 건수']}
                          contentStyle={{ 
                            backgroundColor: 'var(--card)', 
                            border: '1px solid var(--border)',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 text-center text-sm text-muted-foreground">
                    총 계약: <span className="font-semibold text-foreground">{ricocoContractChannelData.reduce((sum: number, d: any) => sum + d.value, 0)}건</span>
                  </div>
                </div>

                {/* 계약실적 전월 대비 (막대 차트) */}
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-5 border border-white/50 dark:border-gray-700/50 shadow-sm">
                  <h3 className="text-md font-medium mb-3">전월 대비 계약 실적 ({year}년 {month}월)</h3>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ricocoContractMonthComparisonData} barGap={8}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                        <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'var(--card)', 
                            border: '1px solid var(--border)',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => [`${value}건`, '']}
                        />
                        <Legend />
                        <Bar dataKey="전월" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="금월" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    {ricocoContractMonthComparisonData.map((item: { name: string; '전월': number; '금월': number }) => {
                      const lastMonth = item['전월'];
                      const thisMonth = item['금월'];
                      const growthRate = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth * 100).toFixed(1) : (thisMonth > 0 ? '100.0' : '0.0');
                      const isPositive = thisMonth >= lastMonth;
                      return (
                        <div key={item.name} className="bg-background rounded p-2">
                          <div className="font-medium">{item.name}</div>
                          <div className={`text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '▲' : '▼'} {growthRate}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 계약실적 주간 트렌드 (라인 차트) */}
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-5 border border-white/50 dark:border-gray-700/50 shadow-sm">
                  <h3 className="text-md font-medium mb-3">주간 계약 트렌드</h3>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={ricocoContractWeeklyTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                        <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'var(--card)', 
                            border: '1px solid var(--border)',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => [`${value}건`, '']}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="내부채널" 
                          stroke="#8b5cf6" 
                          strokeWidth={2}
                          dot={{ fill: '#8b5cf6', r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="외부채널" 
                          stroke="#f59e0b" 
                          strokeWidth={2}
                          dot={{ fill: '#f59e0b', r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 세부 채널별 계약 현황 (수평 막대 차트) */}
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-5 border border-white/50 dark:border-gray-700/50 shadow-sm">
                  <h3 className="text-md font-medium mb-3">세부 채널별 계약 현황</h3>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ricocoContractSubChannelData} layout="vertical" barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis type="number" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} width={80} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'var(--card)', 
                            border: '1px solid var(--border)',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => [`${value}건`, '']}
                        />
                        <Legend />
                        <Bar dataKey="내부채널" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="외부채널" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </section>

            {/* 주요 일정 캘린더 */}
            <section className="bg-card rounded-lg border border-border">
              <SalesCalendar
                year={year}
                month={month}
                onMonthChange={(newYear, newMonth) => {
                  setYear(newYear);
                  setMonth(newMonth);
                }}
                canEdit={canEditSales}
              />
            </section>
          </>
        )}

        {/* 설정 모달 */}
        <Dialog open={isSetupModalOpen} onOpenChange={setIsSetupModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{setupSection} - 전월실적/목표 설정</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {setupSection && dynamicSalesFrames[setupSection as keyof typeof dynamicSalesFrames]?.items.map((item) => (
                <div key={item} className="space-y-2">
                  <Label className="font-medium">{item}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">전월실적</Label>
                      <Input
                        type="text"
                        value={formatNumber(setupData[item]?.previousMonth)}
                        onChange={(e) => setSetupData(prev => ({
                          ...prev,
                          [item]: { ...prev[item], previousMonth: parseNumber(e.target.value) }
                        }))}
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">금월목표</Label>
                      <Input
                        type="text"
                        value={formatNumber(setupData[item]?.target)}
                        onChange={(e) => setSetupData(prev => ({
                          ...prev,
                          [item]: { ...prev[item], target: parseNumber(e.target.value) }
                        }))}
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSetupModalOpen(false)}>취소</Button>
              <Button onClick={handleSetupSave} disabled={upsertSalesMutation.isPending}>
                {upsertSalesMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                저장
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 계약현황 설정 모달 */}
        <Dialog open={isContractSetupModalOpen} onOpenChange={setIsContractSetupModalOpen}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{contractSetupChannel} - 전월실적/목표 설정</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {contractSetupChannel && dynamicContractFrames[contractSetupChannel as keyof typeof dynamicContractFrames]?.map((subChannel) => (
                <div key={subChannel} className="space-y-2">
                  <Label className="font-medium">{subChannel}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">전월실적</Label>
                      <Input
                        type="text"
                        value={formatNumber(contractSetupData[subChannel]?.previousMonth)}
                        onChange={(e) => setContractSetupData(prev => ({
                          ...prev,
                          [subChannel]: { ...prev[subChannel], previousMonth: parseNumber(e.target.value) }
                        }))}
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">금월목표</Label>
                      <Input
                        type="text"
                        value={formatNumber(contractSetupData[subChannel]?.target)}
                        onChange={(e) => setContractSetupData(prev => ({
                          ...prev,
                          [subChannel]: { ...prev[subChannel], target: parseNumber(e.target.value) }
                        }))}
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsContractSetupModalOpen(false)}>취소</Button>
              <Button onClick={handleContractSetupSave} disabled={upsertContractMutation.isPending}>
                {upsertContractMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                저장
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 항목 관리 모달 (매출현황) */}
        <Dialog open={isItemManageModalOpen} onOpenChange={setIsItemManageModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{itemManageSection} - {dynamicSalesFrames[itemManageSection as keyof typeof dynamicSalesFrames]?.label || '항목'} 관리</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* 항목 목록 */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {itemManageItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                    {editingItemIndex === index ? (
                      <>
                        <Input
                          value={editingItemName}
                          onChange={(e) => setEditingItemName(e.target.value)}
                          className="flex-1 h-8"
                          autoFocus
                        />
                        <Button size="sm" onClick={saveEditItem}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingItemIndex(null)}>
                          취소
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1">{item}</span>
                        <Button size="sm" variant="ghost" onClick={() => startEditItem(index)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteItem(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              
              {/* 새 항목 추가 */}
              <div className="flex gap-2">
                <Input
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="새 항목명 입력"
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                />
                <Button onClick={handleAddItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  추가
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsItemManageModalOpen(false)}>취소</Button>
              <Button onClick={handleSaveItemManage}>저장</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 채널 관리 모달 (계약현황) */}
        <Dialog open={isChannelManageModalOpen} onOpenChange={setIsChannelManageModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{channelManageType} - 채널 관리</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* 채널 목록 */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {channelManageItems.map((channel, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                    {editingChannelIndex === index ? (
                      <>
                        <Input
                          value={editingChannelName}
                          onChange={(e) => setEditingChannelName(e.target.value)}
                          className="flex-1 h-8"
                          autoFocus
                        />
                        <Button size="sm" onClick={saveEditChannel}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingChannelIndex(null)}>
                          취소
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1">{channel}</span>
                        <Button size="sm" variant="ghost" onClick={() => startEditChannel(index)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteChannel(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              
              {/* 새 채널 추가 */}
              <div className="flex gap-2">
                <Input
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="새 채널명 입력"
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddChannel()}
                />
                <Button onClick={handleAddChannel}>
                  <Plus className="h-4 w-4 mr-1" />
                  추가
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsChannelManageModalOpen(false)}>취소</Button>
              <Button onClick={handleSaveChannelManage}>저장</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
