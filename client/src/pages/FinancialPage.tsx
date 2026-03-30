/**
 * Financial Page - 재무현황
 * 주단위 현금 입금/출금/잔액 관리
 * 소유자(owner)만 접근 가능
 */

import { useState, useMemo, useCallback } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Settings2,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// 숫자 포맷
const formatNumber = (num: number) => {
  if (num === 0) return '0';
  return num.toLocaleString('ko-KR');
};

// 숫자 입력 파싱
const parseNumberInput = (value: string): number => {
  const cleaned = value.replace(/[^0-9-]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};

const CHART_COLORS = {
  income: '#10b981',
  expense: '#ef4444',
  balance: '#6366f1',
};

const WEEKS = [1, 2, 3, 4, 5];

export default function FinancialPage() {
  const { user, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();

  // 현재 연/월
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  // 모달 상태
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<any>(null);

  // 폼 상태
  const [formData, setFormData] = useState({
    week: 1,
    category: '',
    type: 'income' as 'income' | 'expense',
    amount: 0,
    description: '',
  });
  const [balanceAmount, setBalanceAmount] = useState(0);

  // 업로드 모달 상태
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<Array<{
    week: number;
    category: string;
    type: 'income' | 'expense';
    amount: number;
    description?: string;
  }>>([]);
  const [uploadFileName, setUploadFileName] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [uploadError, setUploadError] = useState('');

  // 데이터 조회
  const { data: records, isLoading: recordsLoading, error: recordsError } = trpc.financial.getRecords.useQuery(
    { year, month },
    { retry: 1 }
  );
  const { data: balance, isLoading: balanceLoading, error: balanceError } = trpc.financial.getBalance.useQuery(
    { year, month },
    { retry: 1 }
  );

  // Mutations
  const createMutation = trpc.financial.createRecord.useMutation({
    onSuccess: () => {
      utils.financial.getRecords.invalidate({ year, month });
      toast.success('항목이 추가되었습니다.');
      setIsRecordModalOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.financial.updateRecord.useMutation({
    onSuccess: () => {
      utils.financial.getRecords.invalidate({ year, month });
      toast.success('항목이 수정되었습니다.');
      setIsRecordModalOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.financial.deleteRecord.useMutation({
    onSuccess: () => {
      utils.financial.getRecords.invalidate({ year, month });
      toast.success('항목이 삭제되었습니다.');
      setIsDeleteDialogOpen(false);
      setDeletingRecord(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const setBalanceMutation = trpc.financial.setBalance.useMutation({
    onSuccess: () => {
      utils.financial.getBalance.invalidate({ year, month });
      toast.success('기초잔액이 설정되었습니다.');
      setIsBalanceModalOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const bulkUploadMutation = trpc.financial.bulkUpload.useMutation({
    onSuccess: (result) => {
      utils.financial.getRecords.invalidate({ year, month });
      toast.success(`${result.count}건의 데이터가 업로드되었습니다.`);
      setIsUploadModalOpen(false);
      setUploadPreview([]);
      setUploadFileName('');
      setUploadError('');
    },
    onError: (err) => toast.error(err.message),
  });

  // 폼 초기화
  const resetForm = useCallback(() => {
    setFormData({ week: 1, category: '', type: 'income', amount: 0, description: '' });
    setEditingRecord(null);
  }, []);

  // 월 이동
  const goToPrevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  };
  const goToNextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  };

  // 주차별 집계
  const weeklyData = useMemo(() => {
    if (!records) return [];
    return WEEKS.map(week => {
      const weekRecords = records.filter((r: any) => r.week === week);
      const income = weekRecords.filter((r: any) => r.type === 'income').reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
      const expense = weekRecords.filter((r: any) => r.type === 'expense').reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
      return { week, income, expense, net: income - expense, records: weekRecords };
    });
  }, [records]);

  // 전체 집계
  const totals = useMemo(() => {
    const openingBal = balance?.openingBalance || 0;
    let totalIncome = 0;
    let totalExpense = 0;
    weeklyData.forEach(w => {
      totalIncome += w.income;
      totalExpense += w.expense;
    });
    return {
      openingBalance: openingBal,
      totalIncome,
      totalExpense,
      netChange: totalIncome - totalExpense,
      closingBalance: openingBal + totalIncome - totalExpense,
    };
  }, [weeklyData, balance]);

  // 주차별 누적 잔액
  const weeklyBalances = useMemo(() => {
    let running = totals.openingBalance;
    return weeklyData.map(w => {
      running += w.net;
      return { ...w, runningBalance: running };
    });
  }, [weeklyData, totals.openingBalance]);

  // 차트 데이터
  const chartData = useMemo(() => {
    return weeklyBalances.map(w => ({
      name: `${w.week}주차`,
      입금: w.income,
      출금: w.expense,
      잔액: w.runningBalance,
    }));
  }, [weeklyBalances]);

  // 입금/출금 비율 차트
  const pieData = useMemo(() => {
    if (totals.totalIncome === 0 && totals.totalExpense === 0) return [];
    return [
      { name: '입금', value: totals.totalIncome, color: CHART_COLORS.income },
      { name: '출금', value: totals.totalExpense, color: CHART_COLORS.expense },
    ];
  }, [totals]);

  // 항목 추가/수정 모달 열기
  const openAddModal = (week?: number) => {
    resetForm();
    if (week) setFormData(prev => ({ ...prev, week }));
    setIsRecordModalOpen(true);
  };

  const openEditModal = (record: any) => {
    setEditingRecord(record);
    setFormData({
      week: record.week,
      category: record.category,
      type: record.type,
      amount: record.amount,
      description: record.description || '',
    });
    setIsRecordModalOpen(true);
  };

  // 기초잔액 설정 모달
  const openBalanceModal = () => {
    setBalanceAmount(balance?.openingBalance || 0);
    setIsBalanceModalOpen(true);
  };

  // 엑셀 파일 파싱 - EBS003M 형식
  // 1행: 회사명/기간 정보, 2행: 헤더, 3행~: 데이터
  // A:일자, B:구분(입금/출금), C:계좌번호, D:계좌명, E:거래처코드, F:거래처명, G:입금처(출금처), H:금액
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);
    setUploadError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (rows.length < 3) {
          setUploadError('데이터가 없습니다.');
          return;
        }

        const parsed: Array<{
          week: number;
          category: string;
          type: 'income' | 'expense';
          amount: number;
          description?: string;
        }> = [];

        // EBS003M 형식 자동 감지
        // 헤더 행 찾기: '일자', '구분', '금액' 키워드로 컬럼 매핑
        let headerIdx = -1;
        let dateCol = -1;
        let typeCol = -1;     // 입금/출금 구분 컬럼
        let accountCol = -1;  // 계좌명 컬럼
        let amountCol = -1;   // 금액 컬럼
        let memoCol = -1;     // 입금처(출금처) 컬럼

        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const row = rows[i];
          if (!row) continue;
          
          let foundDate = false;
          let foundType = false;
          let foundAmount = false;
          
          for (let j = 0; j < row.length; j++) {
            const cell = String(row[j] || '').trim();
            if (cell === '일자' || cell === '날짜' || cell === '일') {
              dateCol = j;
              foundDate = true;
            }
            if (cell === '구분') {
              typeCol = j;
              foundType = true;
            }
            if (cell === '계좌명' || cell === '계좌') {
              accountCol = j;
            }
            if (cell === '금액' || cell === '입출금액') {
              amountCol = j;
              foundAmount = true;
            }
            if (cell.includes('입금처') || cell.includes('출금처') || cell === '적요' || cell === '메모' || cell === '비고') {
              memoCol = j;
            }
          }
          
          // EBS003M 형식: 일자 + 구분 + 금액 컬럼이 모두 있으면 헤더
          if (foundDate && foundType && foundAmount) {
            headerIdx = i;
            break;
          }
          // 대체 형식: 일자 + 입금/출금 별도 컬럼
          if (foundDate && !foundType) {
            let incomeCol2 = -1, expenseCol2 = -1;
            for (let j = 0; j < row.length; j++) {
              const cell = String(row[j] || '').trim();
              if (cell === '입금' || cell === '입금액') incomeCol2 = j;
              if (cell === '출금' || cell === '출금액') expenseCol2 = j;
            }
            if (incomeCol2 >= 0 || expenseCol2 >= 0) {
              // 입금/출금 별도 컬럼 형식 - 기존 로직 사용
              headerIdx = i;
              break;
            }
          }
        }

        if (headerIdx < 0) {
          setUploadError('엑셀 파일에서 헤더를 찾을 수 없습니다. EBS003M 형식의 파일을 업로드해주세요.');
          return;
        }

        // 데이터 행 파싱
        for (let i = headerIdx + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const dateVal = row[dateCol];
          if (!dateVal) continue;

          // 날짜 파싱
          let dateObj: Date | null = null;
          const dateStr = String(dateVal).trim();
          
          // 타임스탬프 행 건너뛰기 (마지막 행에 '오전'/'오후' 포함)
          if (dateStr.includes('오전') || dateStr.includes('오후') || dateStr.includes('AM') || dateStr.includes('PM')) {
            continue;
          }

          if (typeof dateVal === 'number') {
            // 엑셀 시리얼 날짜
            dateObj = new Date((dateVal - 25569) * 86400 * 1000);
          } else {
            const match = dateStr.match(/(\d{4})[-/.]\s*(\d{1,2})[-/.]\s*(\d{1,2})/);
            if (match) {
              dateObj = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
            }
          }

          if (!dateObj || isNaN(dateObj.getTime())) continue;

          // 주차 계산 (1일~7일: 1주차, 8일~14일: 2주차, ...)
          const day = dateObj.getDate();
          const week = Math.min(Math.ceil(day / 7), 5);

          // 구분(입금/출금) 및 금액 파싱
          let txType: 'income' | 'expense' | null = null;
          let amount = 0;
          let account = '기타';
          let memo = '';

          if (typeCol >= 0 && amountCol >= 0) {
            // EBS003M 형식: B열=구분, H열=금액
            const typeStr = String(row[typeCol] || '').trim();
            if (typeStr === '입금') txType = 'income';
            else if (typeStr === '출금') txType = 'expense';
            else continue; // 입금/출금이 아닌 행 건너뛰기

            amount = Number(row[amountCol]) || 0;
            account = accountCol >= 0 ? String(row[accountCol] || '').trim() : '기타';
            memo = memoCol >= 0 ? String(row[memoCol] || '').trim() : '';
          } else {
            // 대체 형식: 입금/출금 별도 컬럼
            const headerRow = rows[headerIdx];
            let incomeCol2 = -1, expenseCol2 = -1;
            for (let j = 0; j < headerRow.length; j++) {
              const cell = String(headerRow[j] || '').trim();
              if (cell === '입금' || cell === '입금액' || cell.includes('입금')) incomeCol2 = j;
              if (cell === '출금' || cell === '출금액' || cell.includes('출금')) expenseCol2 = j;
              if (cell.includes('계좌') || cell.includes('계정')) accountCol = j;
              if (cell.includes('메모') || cell.includes('적요') || cell.includes('비고')) memoCol = j;
            }
            const income = incomeCol2 >= 0 ? Number(row[incomeCol2]) || 0 : 0;
            const expense = expenseCol2 >= 0 ? Number(row[expenseCol2]) || 0 : 0;
            account = accountCol >= 0 ? String(row[accountCol] || '').trim() : '기타';
            memo = memoCol >= 0 ? String(row[memoCol] || '').trim() : '';

            if (income > 0) {
              parsed.push({ week, category: account || '기타', type: 'income', amount: income, description: memo || undefined });
            }
            if (expense > 0) {
              parsed.push({ week, category: account || '기타', type: 'expense', amount: expense, description: memo || undefined });
            }
            continue;
          }

          if (amount > 0 && txType) {
            parsed.push({
              week,
              category: account || '기타',
              type: txType,
              amount,
              description: memo || undefined,
            });
          }
        }

        if (parsed.length === 0) {
          setUploadError('파싱 가능한 데이터가 없습니다. EBS003M 형식의 엑셀 파일인지 확인해주세요.');
          return;
        }

        // 계좌별/주차별로 집계
        const aggregated = new Map<string, typeof parsed[0]>();
        parsed.forEach(item => {
          const key = `${item.week}-${item.category}-${item.type}`;
          const existing = aggregated.get(key);
          if (existing) {
            existing.amount += item.amount;
          } else {
            aggregated.set(key, { ...item });
          }
        });

        setUploadPreview(Array.from(aggregated.values()));
      } catch (err) {
        setUploadError('파일을 읽을 수 없습니다. 엑셀 파일(.xlsx, .xls)인지 확인해주세요.');
      }
    };
    reader.readAsArrayBuffer(file);
    // 파일 입력 초기화
    e.target.value = '';
  }, []);

  // 업로드 실행
  const handleUploadSubmit = () => {
    if (uploadPreview.length === 0) {
      toast.error('업로드할 데이터가 없습니다.');
      return;
    }
    bulkUploadMutation.mutate({
      year,
      month,
      replaceExisting,
      records: uploadPreview,
    });
  };

  // 업로드 미리보기 집계
  const uploadSummary = useMemo(() => {
    if (uploadPreview.length === 0) return null;
    const totalIncome = uploadPreview.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
    const totalExpense = uploadPreview.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
    const weeks = Array.from(new Set(uploadPreview.map(r => r.week))).sort();
    const categories = Array.from(new Set(uploadPreview.map(r => r.category)));
    return { totalIncome, totalExpense, weeks, categories, count: uploadPreview.length };
  }, [uploadPreview]);

  // 폼 제출
  const handleSubmit = () => {
    if (!formData.category.trim()) {
      toast.error('항목명을 입력해주세요.');
      return;
    }
    if (formData.amount <= 0) {
      toast.error('금액을 입력해주세요.');
      return;
    }

    if (editingRecord) {
      updateMutation.mutate({
        id: editingRecord.id,
        ...formData,
      });
    } else {
      createMutation.mutate({
        year,
        month,
        ...formData,
      });
    }
  };

  const isLoading = recordsLoading || balanceLoading || authLoading;

  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  // 에러 상태 표시
  const apiError = recordsError || balanceError;
  if (apiError && !records) {
    const isForbidden = apiError.message?.includes('소유자만') || apiError.data?.code === 'FORBIDDEN';
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground mb-2">
              {isForbidden ? '접근 권한이 없습니다' : '데이터를 불러올 수 없습니다'}
            </h2>
            <p className="text-muted-foreground">
              {isForbidden 
                ? '재무현황은 소유자만 조회할 수 있습니다.' 
                : `오류: ${apiError.message}`}
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 pb-12">
        {/* 헤더 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Wallet className="w-7 h-7 text-indigo-600" />
              재무현황
            </h1>
            <p className="text-sm text-muted-foreground mt-1">주단위 현금 입금/출금 및 잔액 관리</p>
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setUploadPreview([]);
                setUploadFileName('');
                setUploadError('');
                setIsUploadModalOpen(true);
              }}
              className="gap-1.5"
            >
              <Upload className="w-4 h-4" />
              엑셀 업로드
            </Button>

            {/* 월 선택 */}
            <Button variant="outline" size="icon" onClick={goToPrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="px-4 py-2 bg-card border border-border rounded-lg min-w-[140px] text-center">
              <span className="font-semibold text-foreground">{year}년 {month}월</span>
            </div>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-950/40 dark:to-gray-950/30 rounded-xl border border-slate-200/60 dark:border-slate-800/60 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">기초잔액</span>
            </div>
            <div className="text-lg font-bold font-mono text-slate-800 dark:text-slate-200">
              {formatNumber(totals.openingBalance)}
            </div>
            <Button variant="ghost" size="sm" className="mt-1 h-6 text-xs px-2" onClick={openBalanceModal}>
              <Settings2 className="w-3 h-3 mr-1" />설정
            </Button>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/30 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">총 입금</span>
            </div>
            <div className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-300">
              +{formatNumber(totals.totalIncome)}
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/40 dark:to-rose-950/30 rounded-xl border border-red-200/60 dark:border-red-800/60 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-xs font-medium text-red-600 dark:text-red-400">총 출금</span>
            </div>
            <div className="text-lg font-bold font-mono text-red-700 dark:text-red-300">
              -{formatNumber(totals.totalExpense)}
            </div>
          </div>

          <div className={`bg-gradient-to-br ${totals.netChange >= 0 ? 'from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 border-blue-200/60 dark:border-blue-800/60' : 'from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/30 border-orange-200/60 dark:border-orange-800/60'} rounded-xl border p-4 shadow-sm`}>
            <div className="flex items-center gap-2 mb-2">
              {totals.netChange >= 0 ? (
                <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              )}
              <span className={`text-xs font-medium ${totals.netChange >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>순변동</span>
            </div>
            <div className={`text-lg font-bold font-mono ${totals.netChange >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>
              {totals.netChange >= 0 ? '+' : ''}{formatNumber(totals.netChange)}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/30 rounded-xl border border-indigo-200/60 dark:border-indigo-800/60 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">기말잔액</span>
            </div>
            <div className="text-lg font-bold font-mono text-indigo-700 dark:text-indigo-300">
              {formatNumber(totals.closingBalance)}
            </div>
          </div>
        </div>

        {/* 차트 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 주차별 입출금 차트 */}
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border/60 shadow-sm p-6">
            <h3 className="text-base font-semibold text-foreground mb-4">주차별 입출금 현황</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => formatNumber(value) + '원'}
                  />
                  <Legend />
                  <Bar dataKey="입금" fill={CHART_COLORS.income} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="출금" fill={CHART_COLORS.expense} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 입출금 비율 */}
          <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6">
            <h3 className="text-base font-semibold text-foreground mb-4">입출금 비율</h3>
            {pieData.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatNumber(value) + '원'} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                데이터가 없습니다
              </div>
            )}
          </div>
        </div>

        {/* 주차별 상세 테이블 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">주차별 상세 내역</h3>
            <Button onClick={() => openAddModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="w-4 h-4 mr-1" />
              항목 추가
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[80px] text-center">주차</TableHead>
                      <TableHead className="w-[80px] text-center">구분</TableHead>
                      <TableHead className="min-w-[150px]">항목</TableHead>
                      <TableHead className="text-right min-w-[120px]">금액</TableHead>
                      <TableHead className="min-w-[150px]">비고</TableHead>
                      <TableHead className="w-[100px] text-center">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weeklyBalances.map((weekData) => {
                      const weekRecords = weekData.records;
                      const hasRecords = weekRecords.length > 0;

                      return (
                        <> 
                          {/* 주차 헤더 */}
                          <TableRow key={`week-header-${weekData.week}`} className="bg-muted/30 border-t-2 border-border/40">
                            <TableCell colSpan={3} className="font-semibold text-foreground">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                                  {weekData.week}
                                </span>
                                {weekData.week}주차
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              <span className="text-emerald-600 dark:text-emerald-400 text-xs">+{formatNumber(weekData.income)}</span>
                              <span className="mx-1 text-muted-foreground">/</span>
                              <span className="text-red-600 dark:text-red-400 text-xs">-{formatNumber(weekData.expense)}</span>
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                              잔액: {formatNumber(weekData.runningBalance)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openAddModal(weekData.week)}>
                                <Plus className="w-3 h-3" />
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* 개별 레코드 */}
                          {hasRecords ? (
                            weekRecords.map((record: any) => (
                              <TableRow key={record.id} className="hover:bg-muted/20">
                                <TableCell className="text-center text-muted-foreground text-sm">
                                  {record.week}주
                                </TableCell>
                                <TableCell className="text-center">
                                  {record.type === 'income' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                                      <ArrowUpCircle className="w-3 h-3" />입금
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-medium">
                                      <ArrowDownCircle className="w-3 h-3" />출금
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium text-foreground">{record.category}</TableCell>
                                <TableCell className={`text-right font-mono ${record.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {record.type === 'income' ? '+' : '-'}{formatNumber(record.amount)}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{record.description || '-'}</TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditModal(record)}>
                                      <Pencil className="w-3 h-3 text-muted-foreground" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setDeletingRecord(record); setIsDeleteDialogOpen(true); }}>
                                      <Trash2 className="w-3 h-3 text-red-500" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow key={`week-empty-${weekData.week}`}>
                              <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-3">
                                등록된 내역이 없습니다
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}

                    {/* 합계 행 */}
                    <TableRow className="bg-gradient-to-r from-indigo-100 to-blue-100 dark:from-indigo-900/50 dark:to-blue-900/40 font-semibold border-t-2 border-indigo-300 dark:border-indigo-600">
                      <TableCell colSpan={3} className="font-bold text-foreground">합계</TableCell>
                      <TableCell className="text-right font-mono">
                        <div className="space-y-0.5">
                          <div className="text-emerald-600 dark:text-emerald-400">+{formatNumber(totals.totalIncome)}</div>
                          <div className="text-red-600 dark:text-red-400">-{formatNumber(totals.totalExpense)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-indigo-700 dark:text-indigo-300 text-base">
                        기말잔액: {formatNumber(totals.closingBalance)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* 항목 추가/수정 모달 */}
        <Dialog open={isRecordModalOpen} onOpenChange={setIsRecordModalOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{editingRecord ? '항목 수정' : '항목 추가'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>주차</Label>
                  <Select value={String(formData.week)} onValueChange={(v) => setFormData(prev => ({ ...prev, week: Number(v) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKS.map(w => (
                        <SelectItem key={w} value={String(w)}>{w}주차</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>구분</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData(prev => ({ ...prev, type: v as 'income' | 'expense' }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">입금</SelectItem>
                      <SelectItem value="expense">출금</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>항목명</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="예: 매출입금, 급여, 임대료 등"
                />
              </div>
              <div>
                <Label>금액 (원)</Label>
                <Input
                  value={formData.amount ? formatNumber(formData.amount) : ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: parseNumberInput(e.target.value) }))}
                  placeholder="0"
                  className="font-mono text-right"
                />
              </div>
              <div>
                <Label>비고</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="메모 (선택사항)"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsRecordModalOpen(false); resetForm(); }}>
                취소
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                {editingRecord ? '수정' : '추가'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 기초잔액 설정 모달 */}
        <Dialog open={isBalanceModalOpen} onOpenChange={setIsBalanceModalOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>{year}년 {month}월 기초잔액 설정</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>기초잔액 (원)</Label>
                <Input
                  value={balanceAmount ? formatNumber(balanceAmount) : ''}
                  onChange={(e) => setBalanceAmount(parseNumberInput(e.target.value))}
                  placeholder="0"
                  className="font-mono text-right text-lg"
                />
                <p className="text-xs text-muted-foreground mt-1">해당 월 시작 시점의 현금 잔액을 입력하세요.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBalanceModalOpen(false)}>취소</Button>
              <Button onClick={() => setBalanceMutation.mutate({ year, month, openingBalance: balanceAmount })} disabled={setBalanceMutation.isPending}>
                {setBalanceMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                저장
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 삭제 확인 다이얼로그 */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>항목 삭제</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-4">
              "{deletingRecord?.category}" 항목을 삭제하시겠습니까?<br />
              이 작업은 되돌릴 수 없습니다.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setDeletingRecord(null); }}>취소</Button>
              <Button variant="destructive" onClick={() => deletingRecord && deleteMutation.mutate({ id: deletingRecord.id })} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                삭제
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 엑셀 업로드 모달 */}
        <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                엑셀 입출금 데이터 업로드
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p><strong>{year}년 {month}월</strong>에 입출금 데이터를 업로드합니다.</p>
                <p className="mt-1">EBS003M 형식의 엑셀 파일을 업로드해주세요. (일자, 구분, 계좌명, 금액 열 포함)</p>
              </div>

              {/* 파일 선택 */}
              <div>
                <Label htmlFor="excel-file" className="text-sm font-medium">엑셀 파일 선택 (.xlsx, .xls)</Label>
                <div className="mt-1.5">
                  <input
                    id="excel-file"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                  />
                </div>
                {uploadFileName && (
                  <p className="text-xs text-muted-foreground mt-1">선택된 파일: {uploadFileName}</p>
                )}
              </div>

              {/* 에러 표시 */}
              {uploadError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-300">{uploadError}</p>
                </div>
              )}

              {/* 미리보기 */}
              {uploadSummary && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 text-center">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">총 입금</p>
                      <p className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-300">+{formatNumber(uploadSummary.totalIncome)}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-center">
                      <p className="text-xs text-red-600 dark:text-red-400">총 출금</p>
                      <p className="text-sm font-bold font-mono text-red-700 dark:text-red-300">-{formatNumber(uploadSummary.totalExpense)}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                      <p className="text-xs text-blue-600 dark:text-blue-400">항목 수</p>
                      <p className="text-sm font-bold font-mono text-blue-700 dark:text-blue-300">{uploadSummary.count}건</p>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <p>주차: {uploadSummary.weeks.map(w => `${w}주차`).join(', ')}</p>
                    <p>계좌: {uploadSummary.categories.slice(0, 5).join(', ')}{uploadSummary.categories.length > 5 ? ` 외 ${uploadSummary.categories.length - 5}건` : ''}</p>
                  </div>

                  {/* 상세 미리보기 테이블 */}
                  <div className="max-h-[200px] overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">주차</TableHead>
                          <TableHead className="text-xs">계좌</TableHead>
                          <TableHead className="text-xs">구분</TableHead>
                          <TableHead className="text-xs text-right">금액</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uploadPreview.slice(0, 20).map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs">{item.week}주차</TableCell>
                            <TableCell className="text-xs">{item.category}</TableCell>
                            <TableCell className="text-xs">
                              <span className={item.type === 'income' ? 'text-emerald-600' : 'text-red-600'}>
                                {item.type === 'income' ? '입금' : '출금'}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-right font-mono">
                              {formatNumber(item.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {uploadPreview.length > 20 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-xs text-center text-muted-foreground">
                              ... 외 {uploadPreview.length - 20}건 더
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* 기존 데이터 처리 옵션 */}
                  <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <div className="flex-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={replaceExisting}
                          onChange={(e) => setReplaceExisting(e.target.checked)}
                          className="rounded border-amber-300"
                        />
                        <span className="text-sm text-amber-800 dark:text-amber-200">
                          기존 {month}월 데이터를 삭제하고 업로드
                        </span>
                      </label>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                        선택 해제 시 기존 데이터에 추가됩니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>취소</Button>
              <Button
                onClick={handleUploadSubmit}
                disabled={uploadPreview.length === 0 || bulkUploadMutation.isPending}
                className="gap-1.5"
              >
                {bulkUploadMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <Upload className="w-4 h-4" />
                {uploadPreview.length}건 업로드
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
