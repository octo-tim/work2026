/**
 * BusinessPlanPage - 사업계획 페이지
 * 연도별 수량/매출/원가 계획 데이터를 테이블 형태로 표시
 * 실적 입력은 매출 카테고리만 가능하며, 별도 섹션으로 분리
 * 변경 이력 관리 기능 추가
 */

import React, { useState, useMemo, useCallback } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, Save, Download, 
  Package, DollarSign, Calculator, TrendingUp, TrendingDown, Minus,
  FileSpreadsheet, Edit, Eye, BarChart3, History, Clock, User, Target, CheckCircle2, Percent
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, Cell, PieChart, Pie
} from 'recharts';

// 사업부 매핑
const DIVISION_LABELS: Record<string, string> = {
  'bombom_construction': '봄봄시공',
  'online_sales': '온라인매출',
  'oem_supply': '제조공급',
  'ricoco': '리코코',
};

// 사업부 노출 순서
const DIVISION_ORDER = ['bombom_construction', 'online_sales', 'oem_supply', 'ricoco'];

const SUB_DIVISION_LABELS: Record<string, string> = {
  'headquarters': '본사',
  'branch': '지사',
  'bombom': '봄봄',
  'shushuvi': '슈슈비',
  'etc': '기타',
  'linkmom': '에르모어',
  'ricoco': '리코코',
  'creamhouse': '크림하우스',
  'oem_etc': '기타',
};

const CATEGORY_LABELS: Record<string, string> = {
  'quantity': '수량',
  'revenue': '매출',
  'cost': '원가',
};

// 사업부별 색상 시스템 (매출관리와 동일)
const DIVISION_COLORS: Record<string, { gradient: string; bg: string; text: string; border: string; light: string; darkBg: string; darkText: string }> = {
  'bombom_construction': {
    gradient: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-100',
    text: 'text-violet-700',
    border: 'border-violet-200',
    light: 'bg-violet-50',
    darkBg: 'dark:bg-violet-900/30',
    darkText: 'dark:text-violet-300',
  },
  'online_sales': {
    gradient: 'from-amber-400 to-orange-500',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
    light: 'bg-amber-50',
    darkBg: 'dark:bg-amber-900/30',
    darkText: 'dark:text-amber-300',
  },
  'oem_supply': {
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    light: 'bg-emerald-50',
    darkBg: 'dark:bg-emerald-900/30',
    darkText: 'dark:text-emerald-300',
  },
  'ricoco': {
    gradient: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-100',
    text: 'text-rose-700',
    border: 'border-rose-200',
    light: 'bg-rose-50',
    darkBg: 'dark:bg-rose-900/30',
    darkText: 'dark:text-rose-300',
  },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'quantity': <Package className="h-4 w-4" />,
  'revenue': <DollarSign className="h-4 w-4" />,
  'cost': <Calculator className="h-4 w-4" />,
};

// 초기 데이터 (엑셀에서 가져온 2026년 데이터)
const INITIAL_DATA_2026 = [
  // 수량 데이터
  { category: 'quantity', division: 'bombom_construction', subDivision: null, months: [26000, 26760, 29000, 29336, 32000, 29000, 28000, 28000, 30000, 32000, 34000, 36000], total: 360096 },
  { category: 'quantity', division: 'bombom_construction', subDivision: 'headquarters', months: [17000, 17000, 19000, 20336, 22000, 20000, 19000, 19000, 20000, 21000, 22000, 23000], total: 239336 },
  { category: 'quantity', division: 'bombom_construction', subDivision: 'branch', months: [9000, 9760, 10000, 9000, 10000, 9000, 9000, 9000, 10000, 11000, 12000, 13000], total: 120760 },
  { category: 'quantity', division: 'online_sales', subDivision: null, months: [24000, 24500, 24500, 24500, 24500, 24500, 24500, 24500, 24500, 24500, 24500, 24500], total: 293500 },
  { category: 'quantity', division: 'online_sales', subDivision: 'bombom', months: [8000, 9000, 9000, 9000, 9000, 9000, 9000, 9000, 9000, 9000, 9000, 9000], total: 107000 },
  { category: 'quantity', division: 'online_sales', subDivision: 'shushuvi', months: [15000, 15000, 15000, 15000, 15000, 15000, 15000, 15000, 15000, 15000, 15000, 15000], total: 180000 },
  { category: 'quantity', division: 'online_sales', subDivision: 'etc', months: [1000, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500], total: 6500 },
  { category: 'quantity', division: 'oem_supply', subDivision: null, months: [2500, 2711, 4247, 4240, 4884, 3793, 3372, 2968, 5981, 4569, 8714, 6240], total: 54219 },
  { category: 'quantity', division: 'oem_supply', subDivision: 'linkmom', months: [0, 3500, 2500, 2575, 2652, 2732, 2814, 2898, 2985, 3075, 3167, 3262], total: 32160 },
  { category: 'quantity', division: 'oem_supply', subDivision: 'ricoco', months: [0, 0, 500, 1250, 2500, 1875, 1250, 625, 3750, 2500, 6250, 3750], total: 24250 },
  { category: 'quantity', division: 'oem_supply', subDivision: 'oem_etc', months: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], total: 0 },
  { category: 'quantity', division: 'oem_supply', subDivision: 'creamhouse', months: [2500, 2711, 3747, 2990, 2384, 1918, 2122, 2343, 2231, 2069, 2464, 2490], total: 29969 },
  
  // 매출 데이터
  { category: 'revenue', division: 'bombom_construction', subDivision: null, months: [608400000, 623600000, 678800000, 692467200, 754400000, 684000000, 658800000, 658800000, 704000000, 749200000, 794400000, 839600000], total: 8446467200 },
  { category: 'revenue', division: 'bombom_construction', subDivision: 'headquarters', months: [428400000, 428400000, 478800000, 512467200, 554400000, 504000000, 478800000, 478800000, 504000000, 529200000, 554400000, 579600000], total: 6031267200 },
  { category: 'revenue', division: 'bombom_construction', subDivision: 'branch', months: [180000000, 195200000, 200000000, 180000000, 200000000, 180000000, 180000000, 180000000, 200000000, 220000000, 240000000, 260000000], total: 2415200000 },
  { category: 'revenue', division: 'online_sales', subDivision: null, months: [410000000, 405000000, 423000000, 423000000, 423000000, 423000000, 423000000, 423000000, 423000000, 423000000, 423000000, 423000000], total: 5045000000 },
  { category: 'revenue', division: 'online_sales', subDivision: 'bombom', months: [80000000, 90000000, 108000000, 108000000, 108000000, 108000000, 108000000, 108000000, 108000000, 108000000, 108000000, 108000000], total: 1250000000 },
  { category: 'revenue', division: 'online_sales', subDivision: 'shushuvi', months: [300000000, 300000000, 300000000, 300000000, 300000000, 300000000, 300000000, 300000000, 300000000, 300000000, 300000000, 300000000], total: 3600000000 },
  { category: 'revenue', division: 'online_sales', subDivision: 'etc', months: [30000000, 15000000, 15000000, 15000000, 15000000, 15000000, 15000000, 15000000, 15000000, 15000000, 15000000, 15000000], total: 195000000 },
  { category: 'revenue', division: 'oem_supply', subDivision: null, months: [24500000, 79067800, 99220600, 130427000, 188146950, 153523663, 125502180, 97684178, 254140761, 191396470, 384151078, 260830994], total: 1988591674 },
  { category: 'revenue', division: 'oem_supply', subDivision: 'linkmom', months: [0, 52500000, 37500000, 38625000, 39783750, 40977263, 42206580, 43472778, 44776961, 46120270, 47503878, 48928994], total: 482395474 },
  { category: 'revenue', division: 'oem_supply', subDivision: 'ricoco', months: [0, 0, 25000000, 62500000, 125000000, 93750000, 62500000, 31250000, 187500000, 125000000, 312500000, 187500000], total: 1212500000 },
  { category: 'revenue', division: 'oem_supply', subDivision: 'oem_etc', months: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], total: 0 },
  { category: 'revenue', division: 'oem_supply', subDivision: 'creamhouse', months: [24500000, 26567800, 36720600, 29302000, 23363200, 18796400, 20795600, 22961400, 21863800, 20276200, 24147200, 24402000], total: 293696200 },
  
  // 원가 데이터
  { category: 'cost', division: 'bombom_construction', subDivision: null, months: [374040000, 383920000, 417280000, 424480320, 462640000, 419400000, 404280000, 404280000, 432400000, 460520000, 488640000, 516760000], total: 5188640320 },
  { category: 'cost', division: 'bombom_construction', subDivision: 'headquarters', months: [257040000, 257040000, 287280000, 307480320, 332640000, 302400000, 287280000, 287280000, 302400000, 317520000, 332640000, 347760000], total: 3618760320 },
  { category: 'cost', division: 'bombom_construction', subDivision: 'branch', months: [117000000, 126880000, 130000000, 117000000, 130000000, 117000000, 117000000, 117000000, 130000000, 143000000, 156000000, 169000000], total: 1569880000 },
  { category: 'cost', division: 'online_sales', subDivision: null, months: [261000000, 258000000, 271500000, 271500000, 271500000, 271500000, 271500000, 271500000, 271500000, 271500000, 271500000, 271500000], total: 3234000000 },
  { category: 'cost', division: 'online_sales', subDivision: 'bombom', months: [60000000, 67500000, 81000000, 81000000, 81000000, 81000000, 81000000, 81000000, 81000000, 81000000, 81000000, 81000000], total: 937500000 },
  { category: 'cost', division: 'online_sales', subDivision: 'shushuvi', months: [180000000, 180000000, 180000000, 180000000, 180000000, 180000000, 180000000, 180000000, 180000000, 180000000, 180000000, 180000000], total: 2160000000 },
  { category: 'cost', division: 'online_sales', subDivision: 'etc', months: [21000000, 10500000, 10500000, 10500000, 10500000, 10500000, 10500000, 10500000, 10500000, 10500000, 10500000, 10500000], total: 136500000 },
  { category: 'cost', division: 'oem_supply', subDivision: null, months: [19600000, 52754240, 66876480, 84116600, 117560810, 95873478, 79460428, 63202787, 156857217, 118893122, 235320087, 161378997], total: 1251894245 },
  { category: 'cost', division: 'oem_supply', subDivision: 'linkmom', months: [0, 31500000, 22500000, 23175000, 23870250, 24586358, 25323948, 26083667, 26866177, 27672162, 28502327, 29357397], total: 289437285 },
  { category: 'cost', division: 'oem_supply', subDivision: 'ricoco', months: [0, 0, 15000000, 37500000, 75000000, 56250000, 37500000, 18750000, 112500000, 75000000, 187500000, 112500000], total: 727500000 },
  { category: 'cost', division: 'oem_supply', subDivision: 'oem_etc', months: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], total: 0 },
  { category: 'cost', division: 'oem_supply', subDivision: 'creamhouse', months: [19600000, 21254240, 29376480, 23441600, 18690560, 15037120, 16636480, 18369120, 17491040, 16220960, 19317760, 19521600], total: 234956960 },
  
  // 리코코 별도 데이터
  { category: 'revenue', division: 'ricoco', subDivision: null, months: [100000000, 50000000, 150000000, 100000000, 200000000, 150000000, 100000000, 50000000, 300000000, 200000000, 500000000, 300000000], total: 2200000000 },
  { category: 'quantity', division: 'ricoco', subDivision: null, months: [1250, 625, 1875, 1250, 2500, 1875, 1250, 625, 3750, 2500, 6250, 3750], total: 27500 },
];

// 숫자 포맷팅 함수
const formatNumber = (num: number, category: string) => {
  if (category === 'quantity') {
    return num.toLocaleString('ko-KR');
  }
  // 매출/원가는 억 단위로 표시
  if (num >= 100000000) {
    return `${(num / 100000000).toFixed(1)}억`;
  }
  if (num >= 10000000) {
    return `${(num / 10000000).toFixed(1)}천만`;
  }
  if (num >= 10000) {
    return `${(num / 10000).toFixed(0)}만`;
  }
  return num.toLocaleString('ko-KR');
};

// 달성률 계산
const calculateAchievementRate = (actual: number, plan: number): number => {
  if (plan === 0) return actual > 0 ? 100 : 0;
  return Math.round((actual / plan) * 100);
};

// 달성률에 따른 색상
const getAchievementColor = (rate: number): string => {
  if (rate >= 100) return 'text-green-600';
  if (rate >= 80) return 'text-yellow-600';
  return 'text-red-600';
};

// 달성률 아이콘
const getAchievementIcon = (rate: number) => {
  if (rate >= 100) return <TrendingUp className="h-3 w-3" />;
  if (rate >= 80) return <Minus className="h-3 w-3" />;
  return <TrendingDown className="h-3 w-3" />;
};

// 계약현황 채널 프레임 정의
const CONTRACT_FRAMES = {
  '내부채널': ['상담전화', '샘플신청', '채널톡', '홈피문의'],
  '외부채널': ['라이브커머스', '베이비페어', '시공팀', '유아매장', '인플루언서공구', '입주박람회', '지사자체상담']
};

export default function BusinessPlanPage() {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedCategory, setSelectedCategory] = useState<string>('revenue');
  const [activeSection, setActiveSection] = useState<'plan' | 'actual' | 'history' | 'contract'>('actual');
  const [isEditingActual, setIsEditingActual] = useState(false);
  const [editingCell, setEditingCell] = useState<{division: string, subDivision: string | null, month: number} | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // 계약현황 관련 상태
  const [isEditingContract, setIsEditingContract] = useState(false);
  const [editingContractCell, setEditingContractCell] = useState<{channel: string, subChannel: string | null, month: number} | null>(null);
  const [contractEditValue, setContractEditValue] = useState('');
  const [contractEditMode, setContractEditMode] = useState<'target' | 'actual'>('target'); // 목표 또는 실적 입력 모드
  
  // 변경 이력 관련 상태
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
  
  const utils = trpc.useUtils();
  
  // 사업계획 데이터 조회
  const { data: businessPlans, isLoading } = trpc.businessPlan.getByYear.useQuery(
    { year: selectedYear },
    { enabled: !!user }
  );
  
  // 실적 데이터 조회 (매출만)
  const { data: actuals } = trpc.businessPlan.getActualsByYear.useQuery(
    { year: selectedYear },
    { enabled: !!user }
  );
  
  // 변경 이력 조회
  const { data: historyData } = trpc.businessPlan.getHistoryByYear.useQuery(
    { year: selectedYear },
    { enabled: !!user }
  );
  
  // 계약현황 사업계획 조회
  const { data: contractBusinessPlans } = trpc.contractBusinessPlan.getByYear.useQuery(
    { year: selectedYear },
    { enabled: !!user }
  );
  
  // 계약현황 변경 이력 조회
  const { data: contractHistoryData } = trpc.contractBusinessPlan.getHistoryByYear.useQuery(
    { year: selectedYear },
    { enabled: !!user }
  );
  
  // 매출관리 계약현황에서 연간 월별 실적 조회
  const { data: contractYearlyActuals } = trpc.contractBusinessPlan.getYearlyActuals.useQuery(
    { year: selectedYear },
    { enabled: !!user }
  );
  
  // 매출관리에서 월별 매출 합계 조회 (1~12월 모두)
  const salesMonthlyQueries = [
    trpc.sales.weeklySummary.useQuery({ year: selectedYear, month: 1 }, { enabled: !!user }),
    trpc.sales.weeklySummary.useQuery({ year: selectedYear, month: 2 }, { enabled: !!user }),
    trpc.sales.weeklySummary.useQuery({ year: selectedYear, month: 3 }, { enabled: !!user }),
    trpc.sales.weeklySummary.useQuery({ year: selectedYear, month: 4 }, { enabled: !!user }),
    trpc.sales.weeklySummary.useQuery({ year: selectedYear, month: 5 }, { enabled: !!user }),
    trpc.sales.weeklySummary.useQuery({ year: selectedYear, month: 6 }, { enabled: !!user }),
    trpc.sales.weeklySummary.useQuery({ year: selectedYear, month: 7 }, { enabled: !!user }),
    trpc.sales.weeklySummary.useQuery({ year: selectedYear, month: 8 }, { enabled: !!user }),
    trpc.sales.weeklySummary.useQuery({ year: selectedYear, month: 9 }, { enabled: !!user }),
    trpc.sales.weeklySummary.useQuery({ year: selectedYear, month: 10 }, { enabled: !!user }),
    trpc.sales.weeklySummary.useQuery({ year: selectedYear, month: 11 }, { enabled: !!user }),
    trpc.sales.weeklySummary.useQuery({ year: selectedYear, month: 12 }, { enabled: !!user }),
  ];
  
  // 매출관리 월별 합계 데이터 정리 (division별 + subDivision별)
  const salesMonthlyActuals = useMemo(() => {
    const result: Record<string, Record<number, number>> = {
      'bombom_construction': {},
      'online_sales': {},
      'oem_supply': {},
      'ricoco': {},
    };
    
    // 매출관리 division → 사업계획 division 매핑
    const divisionMapping: Record<string, string> = {
      'bombom': 'bombom_construction',
      'online': 'online_sales',
      'manufacturing': 'oem_supply',
      'ricoco': 'ricoco',
    };
    
    salesMonthlyQueries.forEach((query, monthIndex) => {
      const month = monthIndex + 1;
      if (query.data?.byDivision) {
        query.data.byDivision.forEach((div: { division: string; total: number }) => {
          const businessPlanDivision = divisionMapping[div.division];
          if (businessPlanDivision) {
            result[businessPlanDivision][month] = div.total;
          }
        });
      }
    });
    
    return result;
  }, [salesMonthlyQueries.map(q => q.data)]);
  
  // 매출관리 월별 하위항목별 데이터 정리
  const salesMonthlyActualsBySubDivision = useMemo(() => {
    // key: "division-subDivision", value: { [month]: actual }
    const result: Record<string, Record<number, number>> = {};
    
    // 매출관리 division → 사업계획 division 매핑
    const divisionMapping: Record<string, string> = {
      'bombom': 'bombom_construction',
      'online': 'online_sales',
      'manufacturing': 'oem_supply',
      'ricoco': 'ricoco',
    };
    
    // productGroup → subDivision 매핑
    const productGroupToSubDivision: Record<string, Record<string, string>> = {
      'bombom': {
        '본사': 'headquarters',
        '지사': 'branch',
      },
      'online': {
        '봄봄': 'bombom',
        '슈슈비': 'shushuvi',
        '기타': 'etc',
      },
      'manufacturing': {
        '에르모어': 'linkmom',
        '리코코': 'ricoco',
        '크림하우스': 'creamhouse',
        '기타': 'oem_etc',
      },
      'ricoco': {
        '시공매출': 'construction_sales',
        '온라인매출': 'online_sales',
      },
    };
    
    salesMonthlyQueries.forEach((query, monthIndex) => {
      const month = monthIndex + 1;
      if (query.data?.byProductGroup) {
        query.data.byProductGroup.forEach((item: { division: string; productGroup: string; total: number }) => {
          const businessPlanDivision = divisionMapping[item.division];
          const subDivision = productGroupToSubDivision[item.division]?.[item.productGroup];
          if (businessPlanDivision && subDivision) {
            const key = `${businessPlanDivision}-${subDivision}`;
            if (!result[key]) {
              result[key] = {};
            }
            result[key][month] = item.total;
          }
        });
      }
    });
    
    return result;
  }, [salesMonthlyQueries.map(q => q.data)]);
  
  // 매출 편집 권한 확인
  const canEdit = user?.canEditSales || user?.role === 'admin';
  
  // Mutations
  const bulkCreateMutation = trpc.businessPlan.bulkCreate.useMutation({
    onSuccess: () => {
      utils.businessPlan.getByYear.invalidate({ year: selectedYear });
      toast.success('초기 데이터가 저장되었습니다.');
    },
    onError: (error) => {
      toast.error(`저장 실패: ${error.message}`);
    },
  });
  
  const deleteByYearMutation = trpc.businessPlan.deleteByYear.useMutation({
    onError: (error) => {
      toast.error(`삭제 실패: ${error.message}`);
    },
  });
  
  const updateActualMutation = trpc.businessPlan.updateActual.useMutation({
    onSuccess: () => {
      utils.businessPlan.getActualsByYear.invalidate({ year: selectedYear });
      setEditingCell(null);
      toast.success('실적이 저장되었습니다.');
    },
    onError: (error) => {
      toast.error(`저장 실패: ${error.message}`);
    },
  });
  
  // 변경 이력 생성 mutation
  const createHistoryMutation = trpc.businessPlan.createHistory.useMutation({
    onSuccess: () => {
      utils.businessPlan.getHistoryByYear.invalidate({ year: selectedYear });
      toast.success('변경 이력이 저장되었습니다.');
    },
    onError: (error) => {
      toast.error(`이력 저장 실패: ${error.message}`);
    },
  });
  
  // 계약현황 사업계획 목표 업데이트 mutation
  const updateContractPlanMutation = trpc.contractBusinessPlan.updateMonth.useMutation({
    onSuccess: () => {
      utils.contractBusinessPlan.getByYear.invalidate({ year: selectedYear });
      setEditingContractCell(null);
      toast.success('계약 목표가 저장되었습니다.');
    },
    onError: (error) => {
      toast.error(`저장 실패: ${error.message}`);
    },
  });
  
  // 계약현황 사업계획 upsert mutation
  const upsertContractPlanMutation = trpc.contractBusinessPlan.upsert.useMutation({
    onSuccess: () => {
      utils.contractBusinessPlan.getByYear.invalidate({ year: selectedYear });
      toast.success('계약 목표가 저장되었습니다.');
    },
    onError: (error) => {
      toast.error(`저장 실패: ${error.message}`);
    },
  });
  
  // 계약현황 실적 업데이트 mutation
  const updateContractActualMutation = trpc.contractBusinessPlan.updateActual.useMutation({
    onSuccess: () => {
      setEditingContractCell(null);
      utils.contractBusinessPlan.getByYear.invalidate({ year: selectedYear });
      toast.success('계약 실적이 저장되었습니다.');
    },
    onError: (error) => {
      toast.error(`저장 실패: ${error.message}`);
    },
  });
  
  // 데이터가 없으면 초기 데이터 로드
  const displayData = useMemo(() => {
    if (businessPlans && businessPlans.length > 0) {
      return businessPlans;
    }
    // DB에 데이터가 없으면 초기 데이터 표시
    return INITIAL_DATA_2026.map((item, index) => ({
      id: index,
      year: 2026,
      category: item.category,
      division: item.division,
      subDivision: item.subDivision,
      month1: String(item.months[0]),
      month2: String(item.months[1]),
      month3: String(item.months[2]),
      month4: String(item.months[3]),
      month5: String(item.months[4]),
      month6: String(item.months[5]),
      month7: String(item.months[6]),
      month8: String(item.months[7]),
      month9: String(item.months[8]),
      month10: String(item.months[9]),
      month11: String(item.months[10]),
      month12: String(item.months[11]),
      total: String(item.total),
      sortOrder: index,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }, [businessPlans]);
  
  // 실적 데이터를 맵으로 변환 (매출만)
  const actualsMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    if (actuals) {
      actuals.forEach(actual => {
        // 매출 카테고리만 처리
        if (actual.category !== 'revenue') return;
        const key = `${actual.division}-${actual.subDivision || ''}`;
        map[key] = {
          month1: actual.month1 || '0',
          month2: actual.month2 || '0',
          month3: actual.month3 || '0',
          month4: actual.month4 || '0',
          month5: actual.month5 || '0',
          month6: actual.month6 || '0',
          month7: actual.month7 || '0',
          month8: actual.month8 || '0',
          month9: actual.month9 || '0',
          month10: actual.month10 || '0',
          month11: actual.month11 || '0',
          month12: actual.month12 || '0',
          total: actual.total || '0',
        };
      });
    }
    return map;
  }, [actuals]);
  
  // 실적 값 가져오기 (매출만) - 매출관리 월매출 합계에서 가져옴 (하위항목 포함)
  const getActualValue = useCallback((division: string, subDivision: string | null, month: number): number => {
    // 대분류(subDivision이 null)인 경우 매출관리 데이터 사용
    if (!subDivision) {
      const salesActual = salesMonthlyActuals[division]?.[month];
      if (salesActual !== undefined) {
        return salesActual;
      }
    } else {
      // 소분류도 매출관리 데이터 사용
      const key = `${division}-${subDivision}`;
      const salesActual = salesMonthlyActualsBySubDivision[key]?.[month];
      if (salesActual !== undefined) {
        return salesActual;
      }
    }
    // 매출관리 데이터가 없으면 기존 actuals 데이터 사용
    const key = `${division}-${subDivision || ''}`;
    const actual = actualsMap[key];
    if (!actual) return 0;
    const monthKey = `month${month}` as keyof typeof actual;
    return Number(actual[monthKey]) || 0;
  }, [actualsMap, salesMonthlyActuals, salesMonthlyActualsBySubDivision]);
  
  // 실적 합계 가져오기 (매출만) - 매출관리 월매출 합계에서 가져옴 (하위항목 포함)
  const getActualTotal = useCallback((division: string, subDivision: string | null): number => {
    // 대분류(subDivision이 null)인 경우 매출관리 데이터 사용
    if (!subDivision) {
      const divisionActuals = salesMonthlyActuals[division];
      if (divisionActuals) {
        let total = 0;
        for (let m = 1; m <= 12; m++) {
          total += divisionActuals[m] || 0;
        }
        return total;
      }
    } else {
      // 소분류도 매출관리 데이터 사용
      const key = `${division}-${subDivision}`;
      const subDivisionActuals = salesMonthlyActualsBySubDivision[key];
      if (subDivisionActuals) {
        let total = 0;
        for (let m = 1; m <= 12; m++) {
          total += subDivisionActuals[m] || 0;
        }
        return total;
      }
    }
    // 매출관리 데이터가 없으면 기존 actuals 데이터 사용
    const key = `${division}-${subDivision || ''}`;
    const actual = actualsMap[key];
    if (!actual) return 0;
    return Number(actual.total) || 0;
  }, [actualsMap, salesMonthlyActuals, salesMonthlyActualsBySubDivision]);
  
  // 카테고리별 필터링된 데이터
  const filteredData = useMemo(() => {
    return displayData.filter(item => item.category === selectedCategory);
  }, [displayData, selectedCategory]);
  
  // 매출 데이터만 필터링 (실적 입력용)
  const revenueData = useMemo(() => {
    return displayData.filter(item => item.category === 'revenue');
  }, [displayData]);
  
  // 사업부별 그룹화 (DIVISION_ORDER 순서로 정렬)
  const groupedData = useMemo(() => {
    const groups: Record<string, typeof filteredData> = {};
    filteredData.forEach(item => {
      if (!groups[item.division]) {
        groups[item.division] = [];
      }
      groups[item.division].push(item);
    });
    // DIVISION_ORDER 순서로 정렬된 객체 반환
    const orderedGroups: Record<string, typeof filteredData> = {};
    DIVISION_ORDER.forEach(division => {
      if (groups[division]) {
        orderedGroups[division] = groups[division];
      }
    });
    // DIVISION_ORDER에 없는 항목도 추가
    Object.keys(groups).forEach(division => {
      if (!orderedGroups[division]) {
        orderedGroups[division] = groups[division];
      }
    });
    return orderedGroups;
  }, [filteredData]);
  
  // 매출 데이터 사업부별 그룹화 (실적 입력용, DIVISION_ORDER 순서로 정렬)
  const revenueGroupedData = useMemo(() => {
    const groups: Record<string, typeof revenueData> = {};
    revenueData.forEach(item => {
      if (!groups[item.division]) {
        groups[item.division] = [];
      }
      groups[item.division].push(item);
    });
    // DIVISION_ORDER 순서로 정렬된 객체 반환
    const orderedGroups: Record<string, typeof revenueData> = {};
    DIVISION_ORDER.forEach(division => {
      if (groups[division]) {
        orderedGroups[division] = groups[division];
      }
    });
    // DIVISION_ORDER에 없는 항목도 추가
    Object.keys(groups).forEach(division => {
      if (!orderedGroups[division]) {
        orderedGroups[division] = groups[division];
      }
    });
    return orderedGroups;
  }, [revenueData]);
  
  // 초기 데이터 DB에 저장
  const handleSaveInitialData = async () => {
    if (!canEdit) {
      toast.error('수정 권한이 없습니다.');
      return;
    }
    
    try {
      // 기존 데이터 삭제
      await deleteByYearMutation.mutateAsync({ year: selectedYear });
      
      // 새 데이터 저장
      const plans = INITIAL_DATA_2026.map((item, index) => ({
        year: selectedYear,
        category: item.category,
        division: item.division,
        subDivision: item.subDivision || undefined,
        month1: String(item.months[0]),
        month2: String(item.months[1]),
        month3: String(item.months[2]),
        month4: String(item.months[3]),
        month5: String(item.months[4]),
        month6: String(item.months[5]),
        month7: String(item.months[6]),
        month8: String(item.months[7]),
        month9: String(item.months[8]),
        month10: String(item.months[9]),
        month11: String(item.months[10]),
        month12: String(item.months[11]),
        total: String(item.total),
        sortOrder: index,
      }));
      
      await bulkCreateMutation.mutateAsync({ plans });
    } catch (error) {
      console.error('Failed to save initial data:', error);
    }
  };
  
  // 실적 셀 클릭 핸들러
  const handleActualCellClick = (division: string, subDivision: string | null, month: number, currentValue: number) => {
    if (!canEdit || !isEditingActual) return;
    setEditingCell({ division, subDivision, month });
    setEditValue(currentValue.toString());
  };
  
  // 실적 저장 핸들러
  const handleSaveActual = () => {
    if (!editingCell) return;
    
    updateActualMutation.mutate({
      year: selectedYear,
      category: 'revenue', // 매출만 저장
      division: editingCell.division,
      subDivision: editingCell.subDivision,
      month: editingCell.month,
      value: editValue,
    });
  };
  
  // 계약현황 목표 셀 클릭 핸들러
  const handleContractCellClick = (channel: string, subChannel: string | null, month: number, currentValue: number) => {
    if (!canEdit || !isEditingContract) return;
    setEditingContractCell({ channel, subChannel, month });
    setContractEditValue(currentValue.toString());
  };
  
  // 계약현황 목표 저장 핸들러
  const handleSaveContractPlan = () => {
    if (!editingContractCell) return;
    
    if (contractEditMode === 'target') {
      updateContractPlanMutation.mutate({
        year: selectedYear,
        channel: editingContractCell.channel,
        subChannel: editingContractCell.subChannel,
        month: editingContractCell.month,
        value: parseInt(contractEditValue) || 0,
      });
    } else {
      updateContractActualMutation.mutate({
        year: selectedYear,
        channel: editingContractCell.channel,
        subChannel: editingContractCell.subChannel,
        month: editingContractCell.month,
        value: parseInt(contractEditValue) || 0,
      });
    }
  };
  
  // 계약현황 목표 값 가져오기
  const getContractPlanValue = useCallback((channel: string, subChannel: string | null, month: number): number => {
    if (!contractBusinessPlans) return 0;
    const plan = contractBusinessPlans.find(p => 
      p.channel === channel && p.subChannel === subChannel
    );
    if (!plan) return 0;
    const monthKey = `month${month}` as keyof typeof plan;
    return Number(plan[monthKey]) || 0;
  }, [contractBusinessPlans]);
  
  // 계약현황 목표 합계 가져오기
  const getContractPlanTotal = useCallback((channel: string, subChannel: string | null): number => {
    if (!contractBusinessPlans) return 0;
    const plan = contractBusinessPlans.find(p => 
      p.channel === channel && p.subChannel === subChannel
    );
    return Number(plan?.total) || 0;
  }, [contractBusinessPlans]);
  
  // 계약현황 실적 가져오기 (매출관리 계약현황에서)
  const getContractActualValue = useCallback((channel: string, subChannel: string | null, month: number): number => {
    if (!contractYearlyActuals) return 0;
    const actual = contractYearlyActuals.find(a => 
      a.channel === channel && a.subChannel === subChannel
    );
    if (!actual) return 0;
    return actual.monthlyActuals[month] || 0;
  }, [contractYearlyActuals]);
  
  // 계약현황 실적 합계 (매출관리 계약현황에서)
  const getContractActualTotal = useCallback((channel: string, subChannel: string | null): number => {
    if (!contractYearlyActuals) return 0;
    const actual = contractYearlyActuals.find(a => 
      a.channel === channel && a.subChannel === subChannel
    );
    if (!actual) return 0;
    // 1~12월 합계
    let total = 0;
    for (let i = 1; i <= 12; i++) {
      total += actual.monthlyActuals[i] || 0;
    }
    return total;
  }, [contractYearlyActuals]);
  
  // 엑셀 다운로드 핸들러
  const handleExcelDownload = () => {
    // CSV 형식으로 데이터 생성
    const headers = ['사업부', '세부', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월', '합계'];
    
    let csvContent = '\uFEFF'; // BOM for UTF-8
    
    // 각 카테고리별로 시트 생성
    ['quantity', 'revenue', 'cost'].forEach(category => {
      csvContent += `\n=== ${CATEGORY_LABELS[category]} 계획 ===\n`;
      csvContent += headers.join(',') + '\n';
      
      const categoryData = displayData.filter(item => item.category === category);
      
      categoryData.forEach(item => {
        const row = [
          DIVISION_LABELS[item.division] || item.division,
          item.subDivision ? SUB_DIVISION_LABELS[item.subDivision] || item.subDivision : '',
          item.month1, item.month2, item.month3, item.month4, item.month5, item.month6,
          item.month7, item.month8, item.month9, item.month10, item.month11, item.month12,
          item.total
        ];
        csvContent += row.join(',') + '\n';
      });
    });
    
    // 매출 실적 데이터
    csvContent += '\n=== 매출 실적 ===\n';
    csvContent += headers.join(',') + '\n';
    revenueData.forEach(item => {
      const key = `${item.division}-${item.subDivision || ''}`;
      const actual = actualsMap[key] || {};
      const row = [
        DIVISION_LABELS[item.division] || item.division,
        item.subDivision ? SUB_DIVISION_LABELS[item.subDivision] || item.subDivision : '',
        actual.month1 || '0', actual.month2 || '0', actual.month3 || '0', actual.month4 || '0',
        actual.month5 || '0', actual.month6 || '0', actual.month7 || '0', actual.month8 || '0',
        actual.month9 || '0', actual.month10 || '0', actual.month11 || '0', actual.month12 || '0',
        actual.total || '0'
      ];
      csvContent += row.join(',') + '\n';
    });
    
    // 다운로드
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `사업계획_${selectedYear}년.csv`;
    link.click();
    
    toast.success('엑셀 파일이 다운로드되었습니다.');
  };
  
  // 합계 계산 (사업계획)
  const calculatePlanTotals = useMemo(() => {
    const totals = {
      months: Array(12).fill(0),
      total: 0,
    };
    
    // 대분류만 합산 (소분류 제외)
    filteredData
      .filter(item => !item.subDivision)
      .forEach(item => {
        totals.months[0] += Number(item.month1) || 0;
        totals.months[1] += Number(item.month2) || 0;
        totals.months[2] += Number(item.month3) || 0;
        totals.months[3] += Number(item.month4) || 0;
        totals.months[4] += Number(item.month5) || 0;
        totals.months[5] += Number(item.month6) || 0;
        totals.months[6] += Number(item.month7) || 0;
        totals.months[7] += Number(item.month8) || 0;
        totals.months[8] += Number(item.month9) || 0;
        totals.months[9] += Number(item.month10) || 0;
        totals.months[10] += Number(item.month11) || 0;
        totals.months[11] += Number(item.month12) || 0;
        totals.total += Number(item.total) || 0;
      });
    
    return totals;
  }, [filteredData]);
  
  // 매출 실적 합계 계산
  const calculateActualTotals = useMemo(() => {
    const totals = {
      months: Array(12).fill(0),
      total: 0,
    };
    
    // 대분류만 합산 (소분류 제외)
    revenueData
      .filter(item => !item.subDivision)
      .forEach(item => {
        for (let i = 1; i <= 12; i++) {
          totals.months[i - 1] += getActualValue(item.division, null, i);
        }
        totals.total += getActualTotal(item.division, null);
      });
    
    return totals;
  }, [revenueData, getActualValue, getActualTotal]);
  
  // 매출 계획 합계 (비교용)
  const revenuePlanTotals = useMemo(() => {
    const totals = {
      months: Array(12).fill(0),
      total: 0,
    };
    
    revenueData
      .filter(item => !item.subDivision)
      .forEach(item => {
        totals.months[0] += Number(item.month1) || 0;
        totals.months[1] += Number(item.month2) || 0;
        totals.months[2] += Number(item.month3) || 0;
        totals.months[3] += Number(item.month4) || 0;
        totals.months[4] += Number(item.month5) || 0;
        totals.months[5] += Number(item.month6) || 0;
        totals.months[6] += Number(item.month7) || 0;
        totals.months[7] += Number(item.month8) || 0;
        totals.months[8] += Number(item.month9) || 0;
        totals.months[9] += Number(item.month10) || 0;
        totals.months[10] += Number(item.month11) || 0;
        totals.months[11] += Number(item.month12) || 0;
        totals.total += Number(item.total) || 0;
      });
    
    return totals;
  }, [revenueData]);

  // 변경 이력 상세 보기
  const handleViewHistory = (history: any) => {
    setSelectedHistoryItem(history);
    setIsHistoryModalOpen(true);
  };

  // 날짜 포맷팅
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">로딩 중...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">사업계획</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              연도별 수량/매출/원가 계획 및 매출 실적을 관리합니다
            </p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* 연도 선택 */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedYear(prev => prev - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-lg min-w-[60px] text-center">
                {selectedYear}년
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedYear(prev => prev + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* 엑셀 다운로드 */}
            <Button variant="outline" onClick={handleExcelDownload} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              엑셀 다운로드
            </Button>
            
            {canEdit && (!businessPlans || businessPlans.length === 0) && (
              <Button onClick={handleSaveInitialData} className="gap-2">
                <Save className="h-4 w-4" />
                초기 데이터 저장
              </Button>
            )}
          </div>
        </div>
        
        {/* 섹션 선택 탭 */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 border border-border/40">
            <Button
              variant={activeSection === 'actual' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveSection('actual')}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              매출실적
            </Button>
            <Button
              variant={activeSection === 'plan' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveSection('plan')}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              사업계획
            </Button>
            <Button
              variant={activeSection === 'contract' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveSection('contract')}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              계약현황
            </Button>
            <Button
              variant={activeSection === 'history' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveSection('history')}
              className="gap-2"
            >
              <History className="h-4 w-4" />
              변경이력
            </Button>
          </div>
        </div>
        
        {/* 사업계획 섹션 */}
        {activeSection === 'plan' && (
          <>
            {/* 카테고리 탭 */}
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="quantity" className="gap-2">
                  <Package className="h-4 w-4" />
                  수량
                </TabsTrigger>
                <TabsTrigger value="revenue" className="gap-2">
                  <DollarSign className="h-4 w-4" />
                  매출
                </TabsTrigger>
                <TabsTrigger value="cost" className="gap-2">
                  <Calculator className="h-4 w-4" />
                  원가
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value={selectedCategory} className="mt-6">
                {/* 요약 카드 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {Object.entries(groupedData).map(([division, items]) => {
                    const mainItem = items.find(i => !i.subDivision);
                    if (!mainItem) return null;
                    const colors = DIVISION_COLORS[division];
                    return (
                      <div key={division} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colors?.gradient || 'from-gray-500 to-gray-600'} p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5`}>
                        <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10" />
                        <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5" />
                        <div className="relative">
                          <div className="text-sm text-white/80 font-medium">
                            {DIVISION_LABELS[division] || division}
                          </div>
                          <div className="text-xl font-bold text-white mt-1">
                            {formatNumber(Number(mainItem.total) || 0, selectedCategory)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-4 shadow-md">
                    <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10" />
                    <div className="relative">
                      <div className="text-sm text-white/80 font-medium">합계</div>
                      <div className="text-xl font-bold text-white mt-1">
                        {formatNumber(calculatePlanTotals.total, selectedCategory)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 데이터 테이블 */}
                <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
                  <div className="p-4 md:p-5 border-b border-border/40">
                    <h3 className="text-sm md:text-base font-semibold flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                        {CATEGORY_ICONS[selectedCategory]}
                      </div>
                      {CATEGORY_LABELS[selectedCategory]} 계획
                    </h3>
                  </div>
                  <div className="p-4 md:p-5">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/20">
                            <th className="text-left p-3 font-semibold sticky left-0 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/20 min-w-[150px]">사업부</th>
                            {Array.from({ length: 12 }, (_, i) => (
                              <th key={i} className="text-right p-3 font-medium min-w-[80px]">
                                {i + 1}월
                              </th>
                            ))}
                            <th className="text-right p-3 font-medium min-w-[100px] bg-primary/5">합계</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(groupedData).map(([division, items]) => (
                            <React.Fragment key={division}>
                          {/* 대분류 행 */}
                          {items.filter(i => !i.subDivision).map(item => {
                            const rowColors = DIVISION_COLORS[division];
                            return (
                              <tr key={`${division}-main`} className={`border-b font-medium ${rowColors?.light || 'bg-muted/30'} ${rowColors?.darkBg || ''}`}>
                                <td className={`p-3 sticky left-0 ${rowColors?.light || 'bg-muted/30'} ${rowColors?.darkBg || ''} ${rowColors?.text || ''} ${rowColors?.darkText || ''} font-semibold`}>
                                  {DIVISION_LABELS[division] || division}
                                </td>
                                {Array.from({ length: 12 }, (_, i) => {
                                  const monthKey = `month${i + 1}` as keyof typeof item;
                                  return (
                                    <td key={i} className="text-right p-3">
                                      {formatNumber(Number(item[monthKey]) || 0, selectedCategory)}
                                    </td>
                                  );
                                })}
                                <td className="text-right p-3 bg-primary/10">
                                  {formatNumber(Number(item.total) || 0, selectedCategory)}
                                </td>
                              </tr>
                            );
                          })}
                              
                              {/* 소분류 행 */}
                              {items.filter(i => i.subDivision).map(item => (
                                <tr key={`${division}-${item.subDivision}`} className="border-b text-muted-foreground">
                                  <td className="p-3 pl-8 sticky left-0 bg-background">
                                    └ {SUB_DIVISION_LABELS[item.subDivision!] || item.subDivision}
                                  </td>
                                  {Array.from({ length: 12 }, (_, i) => {
                                    const monthKey = `month${i + 1}` as keyof typeof item;
                                    return (
                                      <td key={i} className="text-right p-3">
                                        {formatNumber(Number(item[monthKey]) || 0, selectedCategory)}
                                      </td>
                                    );
                                  })}
                                  <td className="text-right p-3 bg-primary/5">
                                    {formatNumber(Number(item.total) || 0, selectedCategory)}
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          ))}
                          {/* 합계 행 */}
                          <tr className="border-t-2 font-bold bg-primary/10">
                            <td className="p-3 sticky left-0 bg-primary/10">합계</td>
                            {calculatePlanTotals.months.map((value, i) => (
                              <td key={i} className="text-right p-3">
                                {formatNumber(value, selectedCategory)}
                              </td>
                            ))}
                            <td className="text-right p-3 bg-primary/20">
                              {formatNumber(calculatePlanTotals.total, selectedCategory)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
        
        {/* 매출실적 섹션 (별도) */}
        {activeSection === 'actual' && (
          <div className="space-y-6">
            {/* 실적 입력 모드 토글 */}
            {canEdit && (
              <div className="flex items-center gap-2">
                <Switch
                  id="edit-mode"
                  checked={isEditingActual}
                  onCheckedChange={setIsEditingActual}
                />
                <Label htmlFor="edit-mode" className="text-sm">실적 입력 모드</Label>
                {isEditingActual && (
                  <Badge variant="secondary" className="ml-2">셀을 클릭하여 입력</Badge>
                )}
              </div>
            )}
            
            {/* 매출 실적 요약 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(revenueGroupedData).map(([division, items]) => {
                const mainItem = items.find(i => !i.subDivision);
                if (!mainItem) return null;
                const planTotal = Number(mainItem.total) || 0;
                const actualTotal = getActualTotal(division, null);
                const rate = calculateAchievementRate(actualTotal, planTotal);
                const colors = DIVISION_COLORS[division];
                
                return (
                  <div key={division} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colors?.gradient || 'from-gray-500 to-gray-600'} p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5`}>
                    <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10" />
                    <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5" />
                    <div className="relative">
                      <div className="text-sm text-white/80 font-medium">
                        {DIVISION_LABELS[division] || division}
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-lg font-bold text-white">{formatNumber(actualTotal, 'revenue')}</span>
                        <span className="text-xs text-white/60">/ {formatNumber(planTotal, 'revenue')}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-white/90 mt-0.5">
                        {getAchievementIcon(rate)}
                        <span>{rate}% 달성</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-4 shadow-md">
                <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10" />
                <div className="relative">
                  <div className="text-sm text-white/80 font-medium">합계</div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-lg font-bold text-white">{formatNumber(calculateActualTotals.total, 'revenue')}</span>
                    <span className="text-xs text-white/60">/ {formatNumber(revenuePlanTotals.total, 'revenue')}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-white/90 mt-0.5">
                    {getAchievementIcon(calculateAchievementRate(calculateActualTotals.total, revenuePlanTotals.total))}
                    <span>{calculateAchievementRate(calculateActualTotals.total, revenuePlanTotals.total)}% 달성</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 매출 실적 테이블 */}
            <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
              <div className="p-4 md:p-5 border-b border-border/40">
                <h3 className="text-sm md:text-base font-semibold flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                    <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  매출 실적 (계획 대비)
                  {isEditingActual && (
                    <Badge variant="secondary" className="ml-2">입력 모드</Badge>
                  )}
                </h3>
              </div>
              <div className="p-4 md:p-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
                        <th className="text-left p-3 font-semibold sticky left-0 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 min-w-[150px]">사업부</th>
                        {Array.from({ length: 12 }, (_, i) => (
                          <th key={i} className="text-right p-3 font-medium min-w-[120px]">
                            {i + 1}월
                          </th>
                        ))}
                        <th className="text-right p-3 font-medium min-w-[140px] bg-primary/5">합계</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(revenueGroupedData).map(([division, items]) => (
                        <React.Fragment key={division}>
                          {/* 대분류 행 */}
                          {items.filter(i => !i.subDivision).map(item => {
                            const planTotal = Number(item.total) || 0;
                            const actualTotal = getActualTotal(division, null);
                            const totalRate = calculateAchievementRate(actualTotal, planTotal);
                            
                            const rowColors = DIVISION_COLORS[division];
                            return (
                              <tr key={`${division}-main`} className={`border-b font-medium ${rowColors?.light || 'bg-muted/30'} ${rowColors?.darkBg || ''}`}>
                                <td className={`p-3 sticky left-0 ${rowColors?.light || 'bg-muted/30'} ${rowColors?.darkBg || ''} ${rowColors?.text || ''} ${rowColors?.darkText || ''} font-semibold`}>
                                  {DIVISION_LABELS[division] || division}
                                </td>
                                {Array.from({ length: 12 }, (_, i) => {
                                  const month = i + 1;
                                  const monthKey = `month${month}` as keyof typeof item;
                                  const planValue = Number(item[monthKey]) || 0;
                                  const actualValue = getActualValue(division, null, month);
                                  const rate = calculateAchievementRate(actualValue, planValue);
                                  const isEditing = editingCell?.division === division && editingCell?.subDivision === null && editingCell?.month === month;
                                  
                                  return (
                                    <td 
                                      key={i} 
                                      className={`text-right p-2 ${isEditingActual ? 'cursor-pointer hover:bg-primary/10' : ''}`}
                                      onClick={() => handleActualCellClick(division, null, month, actualValue)}
                                    >
                                      {isEditing ? (
                                        <div className="flex gap-1 justify-end">
                                          <Input
                                            type="number"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="h-7 w-28 text-right"
                                            autoFocus
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') handleSaveActual();
                                              if (e.key === 'Escape') setEditingCell(null);
                                            }}
                                          />
                                          <Button size="sm" className="h-7 px-2" onClick={handleSaveActual}>
                                            <Save className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="space-y-0.5">
                                          <div className="font-semibold">{formatNumber(actualValue, 'revenue')}</div>
                                          <div className="text-xs text-muted-foreground">/ {formatNumber(planValue, 'revenue')}</div>
                                          <div className={`text-xs ${getAchievementColor(rate)}`}>{rate}%</div>
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="text-right p-3 bg-primary/5">
                                  <div className="space-y-0.5">
                                    <div className="font-bold">{formatNumber(actualTotal, 'revenue')}</div>
                                    <div className="text-xs text-muted-foreground">/ {formatNumber(planTotal, 'revenue')}</div>
                                    <div className={`text-xs font-medium ${getAchievementColor(totalRate)}`}>{totalRate}%</div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          
                          {/* 소분류 행 */}
                          {items.filter(i => i.subDivision).map(item => {
                            const planTotal = Number(item.total) || 0;
                            const actualTotal = getActualTotal(division, item.subDivision);
                            const totalRate = calculateAchievementRate(actualTotal, planTotal);
                            
                            return (
                              <tr key={`${division}-${item.subDivision}`} className="border-b text-muted-foreground">
                                <td className="p-3 pl-8 sticky left-0 bg-background">
                                  └ {SUB_DIVISION_LABELS[item.subDivision!] || item.subDivision}
                                </td>
                                {Array.from({ length: 12 }, (_, i) => {
                                  const month = i + 1;
                                  const monthKey = `month${month}` as keyof typeof item;
                                  const planValue = Number(item[monthKey]) || 0;
                                  const actualValue = getActualValue(division, item.subDivision, month);
                                  const rate = calculateAchievementRate(actualValue, planValue);
                                  const isEditing = editingCell?.division === division && editingCell?.subDivision === item.subDivision && editingCell?.month === month;
                                  
                                  return (
                                    <td 
                                      key={i} 
                                      className={`text-right p-2 ${isEditingActual ? 'cursor-pointer hover:bg-primary/10' : ''}`}
                                      onClick={() => handleActualCellClick(division, item.subDivision, month, actualValue)}
                                    >
                                      {isEditing ? (
                                        <div className="flex gap-1 justify-end">
                                          <Input
                                            type="number"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="h-7 w-28 text-right"
                                            autoFocus
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') handleSaveActual();
                                              if (e.key === 'Escape') setEditingCell(null);
                                            }}
                                          />
                                          <Button size="sm" className="h-7 px-2" onClick={handleSaveActual}>
                                            <Save className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="space-y-0.5">
                                          <div>{formatNumber(actualValue, 'revenue')}</div>
                                          <div className="text-xs text-muted-foreground">/ {formatNumber(planValue, 'revenue')}</div>
                                          <div className={`text-xs ${getAchievementColor(rate)}`}>{rate}%</div>
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="text-right p-3 bg-primary/5">
                                  <div className="space-y-0.5">
                                    <div>{formatNumber(actualTotal, 'revenue')}</div>
                                    <div className="text-xs text-muted-foreground">/ {formatNumber(planTotal, 'revenue')}</div>
                                    <div className={`text-xs ${getAchievementColor(totalRate)}`}>{totalRate}%</div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                      {/* 합계 행 */}
                      <tr className="border-t-2 font-bold bg-primary/10">
                        <td className="p-3 sticky left-0 bg-primary/10">합계</td>
                        {calculateActualTotals.months.map((actualValue, i) => {
                          const planValue = revenuePlanTotals.months[i];
                          const rate = calculateAchievementRate(actualValue, planValue);
                          return (
                            <td key={i} className="text-right p-3">
                              <div className="space-y-0.5">
                                <div>{formatNumber(actualValue, 'revenue')}</div>
                                <div className="text-xs text-muted-foreground font-normal">/ {formatNumber(planValue, 'revenue')}</div>
                                <div className={`text-xs ${getAchievementColor(rate)}`}>{rate}%</div>
                              </div>
                            </td>
                          );
                        })}
                        <td className="text-right p-3 bg-primary/20">
                          <div className="space-y-0.5">
                            <div>{formatNumber(calculateActualTotals.total, 'revenue')}</div>
                            <div className="text-xs text-muted-foreground font-normal">/ {formatNumber(revenuePlanTotals.total, 'revenue')}</div>
                            <div className={`text-xs ${getAchievementColor(calculateAchievementRate(calculateActualTotals.total, revenuePlanTotals.total))}`}>
                              {calculateAchievementRate(calculateActualTotals.total, revenuePlanTotals.total)}%
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 계약현황 섹션 */}
        {activeSection === 'contract' && (
          <div className="space-y-6">
            {/* 편집 모드 토글 */}
            {canEdit && (
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Switch
                    id="contract-edit-mode"
                    checked={isEditingContract}
                    onCheckedChange={setIsEditingContract}
                  />
                  <Label htmlFor="contract-edit-mode" className="text-sm">입력 모드</Label>
                </div>
                {isEditingContract && (
                  <>
                    <Badge variant="secondary">
                      목표 셀을 클릭하여 입력 (실적은 매출관리에서 연동)
                    </Badge>
                  </>
                )}
              </div>
            )}
            
            {/* 계약현황 요약 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(() => {
                const contractGradients = ['from-cyan-500 to-blue-600', 'from-teal-500 to-emerald-600'];
                return Object.entries(CONTRACT_FRAMES).map(([channel, subChannels], idx) => {
                  const channelTotal = subChannels.reduce((sum, sub) => sum + getContractPlanTotal(channel, sub), 0);
                  const channelActual = subChannels.reduce((sum, sub) => sum + getContractActualTotal(channel, sub), 0);
                  const rate = calculateAchievementRate(channelActual, channelTotal);
                  
                  return (
                    <div key={channel} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${contractGradients[idx % contractGradients.length]} p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5`}>
                      <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10" />
                      <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5" />
                      <div className="relative">
                        <div className="text-sm text-white/80 font-medium">{channel}</div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-lg font-bold text-white">{channelActual.toLocaleString()}건</span>
                          <span className="text-xs text-white/60">/ {channelTotal.toLocaleString()}건</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-white/90 mt-0.5">
                          {getAchievementIcon(rate)}
                          <span>{rate}% 달성</span>
                        </div>
                        <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-white/80 rounded-full transition-all"
                            style={{ width: `${Math.min(rate, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-4 shadow-md">
                <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10" />
                <div className="relative">
                  <div className="text-sm text-white/80 font-medium">합계</div>
                  {(() => {
                    const totalPlan = Object.entries(CONTRACT_FRAMES).reduce((sum, [channel, subChannels]) => 
                      sum + subChannels.reduce((s, sub) => s + getContractPlanTotal(channel, sub), 0), 0
                    );
                    const totalActual = Object.entries(CONTRACT_FRAMES).reduce((sum, [channel, subChannels]) => 
                      sum + subChannels.reduce((s, sub) => s + getContractActualTotal(channel, sub), 0), 0
                    );
                    const totalRate = calculateAchievementRate(totalActual, totalPlan);
                    return (
                      <>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-lg font-bold text-white">{totalActual.toLocaleString()}건</span>
                          <span className="text-xs text-white/60">/ {totalPlan.toLocaleString()}건</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-white/90 mt-0.5">
                          {getAchievementIcon(totalRate)}
                          <span>{totalRate}% 달성</span>
                        </div>
                        <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-white/80 rounded-full transition-all"
                            style={{ width: `${Math.min(totalRate, 100)}%` }}
                          />
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
            
            {/* 시각화 차트 섹션 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 채널별 달성률 차트 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    채널별 달성률
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Object.entries(CONTRACT_FRAMES).flatMap(([channel, subChannels]) => 
                          subChannels.map(sub => ({
                            name: sub,
                            channel,
                            목표: getContractPlanTotal(channel, sub),
                            실적: getContractActualTotal(channel, sub),
                            달성률: calculateAchievementRate(getContractActualTotal(channel, sub), getContractPlanTotal(channel, sub)),
                          }))
                        )}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            name === '달성률' ? `${value}%` : `${value.toLocaleString()}건`,
                            name
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="목표" fill="#94a3b8" name="목표" />
                        <Bar dataKey="실적" fill="#3b82f6" name="실적" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* 월별 달성률 추이 차트 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    월별 달성률 추이
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={Array.from({ length: 12 }, (_, i) => {
                          const month = i + 1;
                          const monthPlan = Object.entries(CONTRACT_FRAMES).reduce((sum, [channel, subChannels]) => 
                            sum + subChannels.reduce((s, sub) => s + getContractPlanValue(channel, sub, month), 0), 0
                          );
                          const monthActual = Object.entries(CONTRACT_FRAMES).reduce((sum, [channel, subChannels]) => 
                            sum + subChannels.reduce((s, sub) => s + getContractActualValue(channel, sub, month), 0), 0
                          );
                          return {
                            month: `${month}월`,
                            목표: monthPlan,
                            실적: monthActual,
                            달성률: calculateAchievementRate(monthActual, monthPlan),
                          };
                        })}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 150]} />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            name === '달성률' ? `${value}%` : `${value.toLocaleString()}건`,
                            name
                          ]}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="목표" fill="#94a3b8" name="목표" />
                        <Bar yAxisId="left" dataKey="실적" fill="#3b82f6" name="실적" />
                        <Line yAxisId="right" type="monotone" dataKey="달성률" stroke="#22c55e" strokeWidth={2} name="달성률(%)" dot={{ fill: '#22c55e' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* 목표 테이블 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  계약현황 월별 목표
                  {isEditingContract && contractEditMode === 'target' && (
                    <Badge className="ml-2 bg-blue-500">목표 입력 모드</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-blue-50">
                        <th className="text-left p-2 font-medium sticky left-0 bg-blue-50 min-w-[80px]">채널</th>
                        <th className="text-left p-2 font-medium min-w-[90px]">세부</th>
                        {Array.from({ length: 12 }, (_, i) => (
                          <th key={i} className="text-center p-2 font-medium min-w-[50px]">
                            {i + 1}월
                          </th>
                        ))}
                        <th className="text-center p-2 font-medium min-w-[60px] bg-blue-100">합계</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(CONTRACT_FRAMES).map(([channel, subChannels]) => (
                        <React.Fragment key={channel}>
                          {subChannels.map((subChannel, idx) => {
                            const planTotal = getContractPlanTotal(channel, subChannel);
                            return (
                              <tr key={`target-${channel}-${subChannel}`} className="border-b hover:bg-blue-50/50">
                                {idx === 0 && (
                                  <td 
                                    rowSpan={subChannels.length + 1} 
                                    className="p-2 font-medium align-top sticky left-0 bg-background border-r text-xs"
                                  >
                                    {channel}
                                  </td>
                                )}
                                <td className="p-2 text-xs">{subChannel}</td>
                                {Array.from({ length: 12 }, (_, i) => {
                                  const month = i + 1;
                                  const planValue = getContractPlanValue(channel, subChannel, month);
                                  const isEditing = isEditingContract && contractEditMode === 'target' &&
                                                   editingContractCell?.channel === channel && 
                                                   editingContractCell?.subChannel === subChannel && 
                                                   editingContractCell?.month === month;
                                  
                                  return (
                                    <td 
                                      key={i} 
                                      className={`text-center p-1 font-mono text-sm ${isEditingContract && contractEditMode === 'target' ? 'cursor-pointer hover:bg-blue-100' : ''}`}
                                      onClick={() => {
                                        if (!canEdit || !isEditingContract || contractEditMode !== 'target') return;
                                        setEditingContractCell({ channel, subChannel, month });
                                        setContractEditValue(planValue.toString());
                                      }}
                                    >
                                      {isEditing ? (
                                        <Input
                                          type="number"
                                          value={contractEditValue}
                                          onChange={(e) => setContractEditValue(e.target.value)}
                                          className="h-6 w-14 text-right text-xs"
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveContractPlan();
                                            if (e.key === 'Escape') setEditingContractCell(null);
                                          }}
                                          onBlur={handleSaveContractPlan}
                                        />
                                      ) : (
                                        planValue || '-'
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="text-center p-2 bg-blue-50 font-mono font-semibold">
                                  {planTotal || 0}
                                </td>
                              </tr>
                            );
                          })}
                          {/* 채널 소계 */}
                          <tr className="border-b bg-blue-100/50 font-medium">
                            <td className="p-2 text-xs">소계</td>
                            {Array.from({ length: 12 }, (_, i) => {
                              const month = i + 1;
                              const monthTotal = subChannels.reduce((sum, sub) => sum + getContractPlanValue(channel, sub, month), 0);
                              return (
                                <td key={i} className="text-center p-1 font-mono text-sm">
                                  {monthTotal || '-'}
                                </td>
                              );
                            })}
                            <td className="text-center p-2 bg-blue-100 font-mono font-bold">
                              {subChannels.reduce((sum, sub) => sum + getContractPlanTotal(channel, sub), 0) || 0}
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                      {/* 총합계 */}
                      <tr className="border-t-2 font-bold bg-blue-200/50">
                        <td className="p-2 sticky left-0 bg-blue-200/50" colSpan={2}>합계</td>
                        {Array.from({ length: 12 }, (_, i) => {
                          const month = i + 1;
                          const monthTotal = Object.entries(CONTRACT_FRAMES).reduce((sum, [ch, subs]) => 
                            sum + subs.reduce((s, sub) => s + getContractPlanValue(ch, sub, month), 0), 0
                          );
                          return (
                            <td key={i} className="text-center p-1 font-mono">
                              {monthTotal || '-'}
                            </td>
                          );
                        })}
                        <td className="text-center p-2 bg-blue-200 font-mono">
                          {Object.entries(CONTRACT_FRAMES).reduce((sum, [ch, subs]) => 
                            sum + subs.reduce((s, sub) => s + getContractPlanTotal(ch, sub), 0), 0
                          ) || 0}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            
            {/* 실적 테이블 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  계약현황 월별 실적
                  <Badge variant="outline" className="ml-2 text-xs font-normal">
                    매출관리 연동
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  실적 데이터는 매출관리 페이지의 계약현황에서 자동으로 연동됩니다.
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-green-50">
                        <th className="text-left p-2 font-medium sticky left-0 bg-green-50 min-w-[80px]">채널</th>
                        <th className="text-left p-2 font-medium min-w-[90px]">세부</th>
                        {Array.from({ length: 12 }, (_, i) => (
                          <th key={i} className="text-center p-2 font-medium min-w-[50px]">
                            {i + 1}월
                          </th>
                        ))}
                        <th className="text-center p-2 font-medium min-w-[60px] bg-green-100">합계</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(CONTRACT_FRAMES).map(([channel, subChannels]) => (
                        <React.Fragment key={channel}>
                          {subChannels.map((subChannel, idx) => {
                            const actualTotal = getContractActualTotal(channel, subChannel);
                            return (
                              <tr key={`actual-${channel}-${subChannel}`} className="border-b hover:bg-green-50/50">
                                {idx === 0 && (
                                  <td 
                                    rowSpan={subChannels.length + 1} 
                                    className="p-2 font-medium align-top sticky left-0 bg-background border-r text-xs"
                                  >
                                    {channel}
                                  </td>
                                )}
                                <td className="p-2 text-xs">{subChannel}</td>
                                {Array.from({ length: 12 }, (_, i) => {
                                  const month = i + 1;
                                  const actualValue = getContractActualValue(channel, subChannel, month);
                                  const isEditing = isEditingContract && contractEditMode === 'actual' &&
                                                   editingContractCell?.channel === channel && 
                                                   editingContractCell?.subChannel === subChannel && 
                                                   editingContractCell?.month === month;
                                  
                                  return (
                                    <td 
                                      key={i} 
                                      className="text-center p-1 font-mono text-sm"
                                    >
                                      {actualValue || '-'}
                                    </td>
                                  );
                                })}
                                <td className="text-center p-2 bg-green-50 font-mono font-semibold">
                                  {actualTotal || 0}
                                </td>
                              </tr>
                            );
                          })}
                          {/* 채널 소계 */}
                          <tr className="border-b bg-green-100/50 font-medium">
                            <td className="p-2 text-xs">소계</td>
                            {Array.from({ length: 12 }, (_, i) => {
                              const month = i + 1;
                              const monthTotal = subChannels.reduce((sum, sub) => sum + getContractActualValue(channel, sub, month), 0);
                              return (
                                <td key={i} className="text-center p-1 font-mono text-sm">
                                  {monthTotal || '-'}
                                </td>
                              );
                            })}
                            <td className="text-center p-2 bg-green-100 font-mono font-bold">
                              {subChannels.reduce((sum, sub) => sum + getContractActualTotal(channel, sub), 0) || 0}
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                      {/* 총합계 */}
                      <tr className="border-t-2 font-bold bg-green-200/50">
                        <td className="p-2 sticky left-0 bg-green-200/50" colSpan={2}>합계</td>
                        {Array.from({ length: 12 }, (_, i) => {
                          const month = i + 1;
                          const monthTotal = Object.entries(CONTRACT_FRAMES).reduce((sum, [ch, subs]) => 
                            sum + subs.reduce((s, sub) => s + getContractActualValue(ch, sub, month), 0), 0
                          );
                          return (
                            <td key={i} className="text-center p-1 font-mono">
                              {monthTotal || '-'}
                            </td>
                          );
                        })}
                        <td className="text-center p-2 bg-green-200 font-mono">
                          {Object.entries(CONTRACT_FRAMES).reduce((sum, [ch, subs]) => 
                            sum + subs.reduce((s, sub) => s + getContractActualTotal(ch, sub), 0), 0
                          ) || 0}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            
            {/* 달성률 평가 테이블 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Percent className="h-4 w-4 text-purple-500" />
                  계약현황 월별 달성률 평가
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-purple-50">
                        <th className="text-left p-2 font-medium sticky left-0 bg-purple-50 min-w-[80px]">채널</th>
                        <th className="text-left p-2 font-medium min-w-[90px]">세부</th>
                        {Array.from({ length: 12 }, (_, i) => (
                          <th key={i} className="text-center p-2 font-medium min-w-[50px]">
                            {i + 1}월
                          </th>
                        ))}
                        <th className="text-center p-2 font-medium min-w-[60px] bg-purple-100">평균</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(CONTRACT_FRAMES).map(([channel, subChannels]) => (
                        <React.Fragment key={channel}>
                          {subChannels.map((subChannel, idx) => {
                            const planTotal = getContractPlanTotal(channel, subChannel);
                            const actualTotal = getContractActualTotal(channel, subChannel);
                            const totalRate = calculateAchievementRate(actualTotal, planTotal);
                            return (
                              <tr key={`rate-${channel}-${subChannel}`} className="border-b hover:bg-purple-50/50">
                                {idx === 0 && (
                                  <td 
                                    rowSpan={subChannels.length + 1} 
                                    className="p-2 font-medium align-top sticky left-0 bg-background border-r text-xs"
                                  >
                                    {channel}
                                  </td>
                                )}
                                <td className="p-2 text-xs">{subChannel}</td>
                                {Array.from({ length: 12 }, (_, i) => {
                                  const month = i + 1;
                                  const planValue = getContractPlanValue(channel, subChannel, month);
                                  const actualValue = getContractActualValue(channel, subChannel, month);
                                  const rate = calculateAchievementRate(actualValue, planValue);
                                  
                                  return (
                                    <td key={i} className="text-center p-1">
                                      {planValue > 0 ? (
                                        <span className={`font-mono text-sm font-semibold ${getAchievementColor(rate)}`}>
                                          {rate}%
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="text-center p-2 bg-purple-50">
                                  {planTotal > 0 ? (
                                    <span className={`font-mono font-bold ${getAchievementColor(totalRate)}`}>
                                      {totalRate}%
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {/* 채널 소계 */}
                          <tr className="border-b bg-purple-100/50 font-medium">
                            <td className="p-2 text-xs">소계</td>
                            {Array.from({ length: 12 }, (_, i) => {
                              const month = i + 1;
                              const monthPlan = subChannels.reduce((sum, sub) => sum + getContractPlanValue(channel, sub, month), 0);
                              const monthActual = subChannels.reduce((sum, sub) => sum + getContractActualValue(channel, sub, month), 0);
                              const monthRate = calculateAchievementRate(monthActual, monthPlan);
                              return (
                                <td key={i} className="text-center p-1">
                                  {monthPlan > 0 ? (
                                    <span className={`font-mono text-sm ${getAchievementColor(monthRate)}`}>
                                      {monthRate}%
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="text-center p-2 bg-purple-100">
                              {(() => {
                                const chPlan = subChannels.reduce((sum, sub) => sum + getContractPlanTotal(channel, sub), 0);
                                const chActual = subChannels.reduce((sum, sub) => sum + getContractActualTotal(channel, sub), 0);
                                const chRate = calculateAchievementRate(chActual, chPlan);
                                return chPlan > 0 ? (
                                  <span className={`font-mono font-bold ${getAchievementColor(chRate)}`}>
                                    {chRate}%
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                );
                              })()}
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                      {/* 총합계 */}
                      <tr className="border-t-2 font-bold bg-purple-200/50">
                        <td className="p-2 sticky left-0 bg-purple-200/50" colSpan={2}>합계</td>
                        {Array.from({ length: 12 }, (_, i) => {
                          const month = i + 1;
                          const monthPlan = Object.entries(CONTRACT_FRAMES).reduce((sum, [ch, subs]) => 
                            sum + subs.reduce((s, sub) => s + getContractPlanValue(ch, sub, month), 0), 0
                          );
                          const monthActual = Object.entries(CONTRACT_FRAMES).reduce((sum, [ch, subs]) => 
                            sum + subs.reduce((s, sub) => s + getContractActualValue(ch, sub, month), 0), 0
                          );
                          const monthRate = calculateAchievementRate(monthActual, monthPlan);
                          return (
                            <td key={i} className="text-center p-1">
                              {monthPlan > 0 ? (
                                <span className={`font-mono ${getAchievementColor(monthRate)}`}>
                                  {monthRate}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="text-center p-2 bg-purple-200">
                          {(() => {
                            const totalPlan = Object.entries(CONTRACT_FRAMES).reduce((sum, [ch, subs]) => 
                              sum + subs.reduce((s, sub) => s + getContractPlanTotal(ch, sub), 0), 0
                            );
                            const totalActual = Object.entries(CONTRACT_FRAMES).reduce((sum, [ch, subs]) => 
                              sum + subs.reduce((s, sub) => s + getContractActualTotal(ch, sub), 0), 0
                            );
                            const totalRate = calculateAchievementRate(totalActual, totalPlan);
                            return totalPlan > 0 ? (
                              <span className={`font-mono font-bold ${getAchievementColor(totalRate)}`}>
                                {totalRate}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            );
                          })()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            
            {/* 안내 메시지 */}
            <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
              <p>ℹ️ <strong>입력 모드</strong>를 켜고 <strong>목표</strong> 또는 <strong>실적</strong> 버튼을 선택한 후, 해당 테이블의 셀을 클릭하여 값을 입력할 수 있습니다.</p>
              <p className="mt-1">달성률은 실적/목표 × 100으로 자동 계산되며, <span className="text-green-600 font-medium">100% 이상</span>은 초록색, <span className="text-yellow-600 font-medium">80~100%</span>는 노란색, <span className="text-red-600 font-medium">80% 미만</span>은 빨간색으로 표시됩니다.</p>
            </div>
          </div>
        )}
        
        {/* 변경 이력 섹션 */}
        {activeSection === 'history' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-4 w-4" />
                  사업계획 변경 이력
                </CardTitle>
              </CardHeader>
              <CardContent>
                {historyData && historyData.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>변경일시</TableHead>
                        <TableHead>카테고리</TableHead>
                        <TableHead>사업부</TableHead>
                        <TableHead>세부</TableHead>
                        <TableHead>버전</TableHead>
                        <TableHead>변경사유</TableHead>
                        <TableHead className="text-right">상세</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyData.map((history) => (
                        <TableRow key={history.id}>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {formatDate(history.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {CATEGORY_LABELS[history.category] || history.category}
                            </Badge>
                          </TableCell>
                          <TableCell>{DIVISION_LABELS[history.division] || history.division}</TableCell>
                          <TableCell>
                            {history.subDivision 
                              ? SUB_DIVISION_LABELS[history.subDivision] || history.subDivision 
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge>v{history.version}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {history.changeReason || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewHistory(history)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>변경 이력이 없습니다.</p>
                    <p className="text-sm mt-1">사업계획이 수정되면 이전 데이터가 여기에 기록됩니다.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      {/* 변경 이력 상세 모달 */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              변경 이력 상세 (v{selectedHistoryItem?.version})
            </DialogTitle>
          </DialogHeader>
          
          {selectedHistoryItem && (
            <div className="space-y-4">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-muted-foreground">변경일시</Label>
                  <p className="font-medium">{formatDate(selectedHistoryItem.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">카테고리</Label>
                  <p className="font-medium">{CATEGORY_LABELS[selectedHistoryItem.category] || selectedHistoryItem.category}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">사업부</Label>
                  <p className="font-medium">{DIVISION_LABELS[selectedHistoryItem.division] || selectedHistoryItem.division}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">세부</Label>
                  <p className="font-medium">
                    {selectedHistoryItem.subDivision 
                      ? SUB_DIVISION_LABELS[selectedHistoryItem.subDivision] || selectedHistoryItem.subDivision 
                      : '-'}
                  </p>
                </div>
              </div>
              
              {/* 변경 사유 */}
              {selectedHistoryItem.changeReason && (
                <div>
                  <Label className="text-muted-foreground">변경 사유</Label>
                  <p className="mt-1 p-3 bg-muted rounded-md">{selectedHistoryItem.changeReason}</p>
                </div>
              )}
              
              {/* 월별 데이터 */}
              <div>
                <Label className="text-muted-foreground mb-2 block">변경 전 월별 데이터</Label>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Array.from({ length: 12 }, (_, i) => (
                          <TableHead key={i} className="text-center min-w-[80px]">{i + 1}월</TableHead>
                        ))}
                        <TableHead className="text-center min-w-[100px] bg-muted">합계</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        {Array.from({ length: 12 }, (_, i) => {
                          const monthKey = `month${i + 1}` as keyof typeof selectedHistoryItem;
                          return (
                            <TableCell key={i} className="text-right font-mono">
                              {formatNumber(Number(selectedHistoryItem[monthKey]) || 0, selectedHistoryItem.category)}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right font-mono font-bold bg-muted">
                          {formatNumber(Number(selectedHistoryItem.total) || 0, selectedHistoryItem.category)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryModalOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
