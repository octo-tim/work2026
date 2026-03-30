/**
 * VisionPage - 비전목표 페이지
 * (주)옥토아이앤씨 2026년 비전 및 사업목표
 */

import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { 
  Target,
  TrendingUp,
  Factory,
  Users,
  ShoppingCart,
  Lightbulb,
  Building2,
  Rocket,
  Award,
  BarChart3,
  Package,
  Megaphone,
  Calendar,
  Edit,
  Plus,
  Trash2,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

type Quarter = "Q1" | "Q2" | "Q3" | "Q4";
type OverallRating = "excellent" | "good" | "fair" | "poor";

interface ReviewFormData {
  year: number;
  quarter: Quarter;
  salesTarget: number;
  salesActual: number;
  profitTarget: number;
  profitActual: number;
  strategy1Progress: number;
  strategy2Progress: number;
  strategy3Progress: number;
  strategy4Progress: number;
  achievements: string;
  improvements: string;
  nextQuarterPlan: string;
  overallRating: OverallRating;
  overallComment: string;
}

const RATING_LABELS: Record<OverallRating, { label: string; color: string; icon: typeof CheckCircle }> = {
  excellent: { label: '매우 우수', color: 'text-green-600 bg-green-100', icon: CheckCircle },
  good: { label: '우수', color: 'text-blue-600 bg-blue-100', icon: CheckCircle },
  fair: { label: '보통', color: 'text-amber-600 bg-amber-100', icon: Clock },
  poor: { label: '미흡', color: 'text-red-600 bg-red-100', icon: AlertCircle },
};

const QUARTER_LABELS: Record<Quarter, string> = {
  Q1: '1분기 (1~3월)',
  Q2: '2분기 (4~6월)',
  Q3: '3분기 (7~9월)',
  Q4: '4분기 (10~12월)',
};

const STRATEGY_LABELS = [
  '시공 시장 경쟁력 유지',
  '셀프 시공 시장 확대',
  '제품 차별화 지속',
  '신규 영업 채널 강화',
];

export default function VisionPage() {
  const [selectedYear] = useState(2026);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<any>(null);
  const [formData, setFormData] = useState<ReviewFormData>({
    year: 2026,
    quarter: 'Q1',
    salesTarget: 3750000000,
    salesActual: 0,
    profitTarget: 375000000,
    profitActual: 0,
    strategy1Progress: 0,
    strategy2Progress: 0,
    strategy3Progress: 0,
    strategy4Progress: 0,
    achievements: '',
    improvements: '',
    nextQuarterPlan: '',
    overallRating: 'fair',
    overallComment: '',
  });

  const utils = trpc.useUtils();
  const { data: reviews = [], isLoading } = trpc.quarterlyReview.list.useQuery({ year: selectedYear });
  
  const createMutation = trpc.quarterlyReview.create.useMutation({
    onSuccess: () => {
      utils.quarterlyReview.list.invalidate();
      setIsModalOpen(false);
      toast.success('분기별 리뷰가 등록되었습니다.');
    },
    onError: (error) => {
      toast.error(`등록 실패: ${error.message}`);
    },
  });

  const updateMutation = trpc.quarterlyReview.update.useMutation({
    onSuccess: () => {
      utils.quarterlyReview.list.invalidate();
      setIsModalOpen(false);
      setEditingReview(null);
      toast.success('분기별 리뷰가 수정되었습니다.');
    },
    onError: (error) => {
      toast.error(`수정 실패: ${error.message}`);
    },
  });

  const deleteMutation = trpc.quarterlyReview.delete.useMutation({
    onSuccess: () => {
      utils.quarterlyReview.list.invalidate();
      toast.success('분기별 리뷰가 삭제되었습니다.');
    },
    onError: (error) => {
      toast.error(`삭제 실패: ${error.message}`);
    },
  });

  const handleOpenModal = (quarter?: Quarter, review?: any) => {
    if (review) {
      setEditingReview(review);
      setFormData({
        year: review.year,
        quarter: review.quarter,
        salesTarget: review.salesTarget || 0,
        salesActual: review.salesActual || 0,
        profitTarget: review.profitTarget || 0,
        profitActual: review.profitActual || 0,
        strategy1Progress: review.strategy1Progress || 0,
        strategy2Progress: review.strategy2Progress || 0,
        strategy3Progress: review.strategy3Progress || 0,
        strategy4Progress: review.strategy4Progress || 0,
        achievements: review.achievements || '',
        improvements: review.improvements || '',
        nextQuarterPlan: review.nextQuarterPlan || '',
        overallRating: review.overallRating || 'fair',
        overallComment: review.overallComment || '',
      });
    } else {
      setEditingReview(null);
      setFormData({
        year: selectedYear,
        quarter: quarter || 'Q1',
        salesTarget: 3750000000,
        salesActual: 0,
        profitTarget: 375000000,
        profitActual: 0,
        strategy1Progress: 0,
        strategy2Progress: 0,
        strategy3Progress: 0,
        strategy4Progress: 0,
        achievements: '',
        improvements: '',
        nextQuarterPlan: '',
        overallRating: 'fair',
        overallComment: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (editingReview) {
      updateMutation.mutate({
        id: editingReview.id,
        ...formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      deleteMutation.mutate({ id });
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 100000000) {
      return `${(value / 100000000).toFixed(1)}억 원`;
    }
    if (value >= 10000) {
      return `${(value / 10000).toFixed(0)}만 원`;
    }
    return `${value.toLocaleString()} 원`;
  };

  const getReviewByQuarter = (quarter: Quarter) => {
    return reviews.find(r => r.quarter === quarter);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-8 max-w-7xl mx-auto">
        {/* Vision Section */}
        <section className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-8 border border-primary/20">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Target className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-medium text-primary mb-1">1. 비전 (Vision)</h1>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                "매트 시장을 선도하는 제조혁신 기업"
              </h2>
              <p className="text-muted-foreground italic">Innovation for Future Growth</p>
            </div>
          </div>
          
          {/* 3대 핵심 가치 */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">3대 핵심 가치</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card rounded-xl p-5 border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Factory className="w-5 h-5 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-foreground">제조 혁신</h4>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  생산설비 증설 및 신규 생산라인 기반으로 제품 규격/원가/품질 경쟁력을 구조적으로 강화한다.
                </p>
              </div>
              
              <div className="bg-card rounded-xl p-5 border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Award className="w-5 h-5 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-foreground">시장 선도</h4>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  "단일 브랜드 1등"이 어려운 파편화 시장을 세분화/포트폴리오로 커버하여 리더십을 만든다.
                </p>
              </div>
              
              <div className="bg-card rounded-xl p-5 border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-amber-600" />
                  </div>
                  <h4 className="font-semibold text-foreground">고객 중심</h4>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  가격·소재·시공방식·채널 등 복잡한 구매요인을 "선택 가능한 라인업/채널"로 풀어 고객 니즈를 흡수한다 (옴니채널 + 시공/DIY 동시 대응).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2026년 사업목표 */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">2. 2026년 사업목표 (Business Goals)</h2>
              <p className="text-sm text-muted-foreground">
                전년(2025년 예상 매출 85억) 대비 약 1.7배의 퀀텀 점프 달성
              </p>
            </div>
          </div>

          {/* (1) 재무적 목표 */}
          <div className="bg-card rounded-xl border border-border p-6 mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              (1) 재무적 목표 (Financial Targets)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 매출액 & 영업이익 */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-primary/10 to-transparent rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">매출액</span>
                    <span className="text-2xl font-bold text-primary">150억 원</span>
                  </div>
                  <Progress value={0} className="h-2" />
                </div>
                
                <div className="bg-gradient-to-r from-green-500/10 to-transparent rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">영업이익</span>
                    <span className="text-2xl font-bold text-green-600">15억 원</span>
                  </div>
                  <p className="text-xs text-muted-foreground">영업이익률 약 10%</p>
                </div>
              </div>
              
              {/* 사업 부문별 매출 구성 */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">사업 부문별 매출 구성</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">시공사업</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">월 6억</span>
                      <span className="text-xs text-muted-foreground ml-1">(본사 4억, 지사 2억)</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-green-500" />
                      <span className="text-sm">온라인 판매</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">월 4억</span>
                      <span className="text-xs text-muted-foreground ml-1">(봄봄, 슈슈비)</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-amber-500" />
                      <span className="text-sm">OEM 공급</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">월 2억</span>
                      <span className="text-xs text-muted-foreground ml-1">(리코코, 기타)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* (2) 4대 핵심 전략 */}
          <div className="bg-card rounded-xl border border-border p-6 mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary" />
              (2) 2026년 4대 핵심 전략 (Key Strategies)
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              성장 목표 달성을 위해 다음 4가지 세분 전략을 중점적으로 추진합니다.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">시공 시장 경쟁력 유지</h4>
                  <p className="text-sm text-muted-foreground">
                    신규 생산라인을 활용한 대형 규격(100cm, 120cm) 매트 출시로 시공 효율성 및 심미성 강화
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4 p-4 bg-green-50 rounded-lg border border-green-100">
                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">셀프 시공 시장 확대</h4>
                  <p className="text-sm text-muted-foreground">
                    클립매트 시장 점유율 확대 및 DIY 트렌드에 대응하는 간편 시공 제품 마케팅 강화
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4 p-4 bg-amber-50 rounded-lg border border-amber-100">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">제품 차별화 지속</h4>
                  <p className="text-sm text-muted-foreground">
                    디자인 및 기능 혁신(항균, 친환경 소재)을 통한 프리미엄 라인업 확대
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
                <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  4
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">신규 영업 채널 강화</h4>
                  <p className="text-sm text-muted-foreground">
                    B2B(인테리어 업체, 건설사) 및 해외 시장 진출을 통한 매출 다변화
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* (3) 주요 성장 요인 */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              (3) 주요 성장 요인 (Growth Drivers)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                  <Factory className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">생산 능력 확대</h4>
                <p className="text-sm text-muted-foreground">
                  신규 생산라인 가동으로 생산량 2배 증가 및 원가 절감
                </p>
              </div>
              
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <Award className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">브랜드 포트폴리오 효과</h4>
                <p className="text-sm text-muted-foreground">
                  브랜드별 차별화 전략으로 시장 커버리지 확대
                </p>
              </div>
              
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                  <Megaphone className="w-6 h-6 text-amber-600" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">신제품 효과</h4>
                <p className="text-sm text-muted-foreground">
                  시장 트렌드를 주도할 클립매트 시장 확대를 통한 매출 견인
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 분기별 리뷰 섹션 */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">3. 분기별 목표 달성 리뷰</h2>
                <p className="text-sm text-muted-foreground">
                  분기별 목표 달성 현황을 점검하고 기록합니다
                </p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="Q1" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="Q1">1분기</TabsTrigger>
              <TabsTrigger value="Q2">2분기</TabsTrigger>
              <TabsTrigger value="Q3">3분기</TabsTrigger>
              <TabsTrigger value="Q4">4분기</TabsTrigger>
            </TabsList>

            {(['Q1', 'Q2', 'Q3', 'Q4'] as Quarter[]).map((quarter) => {
              const review = getReviewByQuarter(quarter);
              return (
                <TabsContent key={quarter} value={quarter}>
                  {review ? (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <span>{QUARTER_LABELS[quarter]}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${RATING_LABELS[review.overallRating as OverallRating].color}`}>
                            {RATING_LABELS[review.overallRating as OverallRating].label}
                          </span>
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenModal(quarter, review)}>
                            <Edit className="w-4 h-4 mr-1" />
                            수정
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(review.id)}>
                            <Trash2 className="w-4 h-4 mr-1" />
                            삭제
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* 재무 실적 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-muted/30 rounded-lg p-4">
                            <h4 className="text-sm font-semibold mb-3">매출 실적</h4>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-muted-foreground">목표</span>
                              <span className="font-semibold">{formatCurrency(review.salesTarget || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-muted-foreground">실적</span>
                              <span className="font-semibold text-primary">{formatCurrency(review.salesActual || 0)}</span>
                            </div>
                            <Progress 
                              value={review.salesTarget ? ((review.salesActual || 0) / review.salesTarget) * 100 : 0} 
                              className="h-2" 
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              달성률: {review.salesTarget ? (((review.salesActual || 0) / review.salesTarget) * 100).toFixed(1) : 0}%
                            </p>
                          </div>
                          
                          <div className="bg-muted/30 rounded-lg p-4">
                            <h4 className="text-sm font-semibold mb-3">영업이익 실적</h4>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-muted-foreground">목표</span>
                              <span className="font-semibold">{formatCurrency(review.profitTarget || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-muted-foreground">실적</span>
                              <span className="font-semibold text-green-600">{formatCurrency(review.profitActual || 0)}</span>
                            </div>
                            <Progress 
                              value={review.profitTarget ? ((review.profitActual || 0) / review.profitTarget) * 100 : 0} 
                              className="h-2" 
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              달성률: {review.profitTarget ? (((review.profitActual || 0) / review.profitTarget) * 100).toFixed(1) : 0}%
                            </p>
                          </div>
                        </div>

                        {/* 전략별 진행률 */}
                        <div className="bg-muted/30 rounded-lg p-4">
                          <h4 className="text-sm font-semibold mb-3">4대 핵심 전략 진행률</h4>
                          <div className="space-y-3">
                            {STRATEGY_LABELS.map((label, index) => {
                              const progress = [review.strategy1Progress, review.strategy2Progress, review.strategy3Progress, review.strategy4Progress][index] || 0;
                              return (
                                <div key={index}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm">{index + 1}. {label}</span>
                                    <span className="text-sm font-semibold">{progress}%</span>
                                  </div>
                                  <Progress value={progress} className="h-2" />
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* 주요 성과 / 개선사항 / 다음 분기 계획 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                            <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              주요 성과
                            </h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {review.achievements || '등록된 내용이 없습니다.'}
                            </p>
                          </div>
                          
                          <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                            <h4 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" />
                              개선 필요 사항
                            </h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {review.improvements || '등록된 내용이 없습니다.'}
                            </p>
                          </div>
                          
                          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                            <h4 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1">
                              <Rocket className="w-4 h-4" />
                              다음 분기 계획
                            </h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {review.nextQuarterPlan || '등록된 내용이 없습니다.'}
                            </p>
                          </div>
                        </div>

                        {/* 종합 코멘트 */}
                        {review.overallComment && (
                          <div className="bg-muted/30 rounded-lg p-4">
                            <h4 className="text-sm font-semibold mb-2">종합 코멘트</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {review.overallComment}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          {QUARTER_LABELS[quarter]} 리뷰가 없습니다
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          분기별 목표 달성 현황을 기록해 주세요
                        </p>
                        <Button onClick={() => handleOpenModal(quarter)}>
                          <Plus className="w-4 h-4 mr-1" />
                          리뷰 작성
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </section>
      </div>

      {/* 리뷰 입력/수정 모달 */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingReview ? '분기별 리뷰 수정' : '분기별 리뷰 작성'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* 분기 선택 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>연도</Label>
                <Input value={formData.year} disabled />
              </div>
              <div>
                <Label>분기</Label>
                <Select 
                  value={formData.quarter} 
                  onValueChange={(value) => setFormData({ ...formData, quarter: value as Quarter })}
                  disabled={!!editingReview}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Q1">1분기 (1~3월)</SelectItem>
                    <SelectItem value="Q2">2분기 (4~6월)</SelectItem>
                    <SelectItem value="Q3">3분기 (7~9월)</SelectItem>
                    <SelectItem value="Q4">4분기 (10~12월)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 재무 실적 */}
            <div>
              <h4 className="text-sm font-semibold mb-3">재무 실적</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>매출 목표 (원)</Label>
                  <Input 
                    type="number" 
                    value={formData.salesTarget}
                    onChange={(e) => setFormData({ ...formData, salesTarget: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>매출 실적 (원)</Label>
                  <Input 
                    type="number" 
                    value={formData.salesActual}
                    onChange={(e) => setFormData({ ...formData, salesActual: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>영업이익 목표 (원)</Label>
                  <Input 
                    type="number" 
                    value={formData.profitTarget}
                    onChange={(e) => setFormData({ ...formData, profitTarget: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>영업이익 실적 (원)</Label>
                  <Input 
                    type="number" 
                    value={formData.profitActual}
                    onChange={(e) => setFormData({ ...formData, profitActual: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            {/* 전략별 진행률 */}
            <div>
              <h4 className="text-sm font-semibold mb-3">4대 핵심 전략 진행률 (%)</h4>
              <div className="grid grid-cols-2 gap-4">
                {STRATEGY_LABELS.map((label, index) => (
                  <div key={index}>
                    <Label>{index + 1}. {label}</Label>
                    <Input 
                      type="number" 
                      min={0}
                      max={100}
                      value={[formData.strategy1Progress, formData.strategy2Progress, formData.strategy3Progress, formData.strategy4Progress][index]}
                      onChange={(e) => {
                        const key = `strategy${index + 1}Progress` as keyof ReviewFormData;
                        setFormData({ ...formData, [key]: Number(e.target.value) });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 주요 성과 */}
            <div>
              <Label>주요 성과</Label>
              <Textarea 
                rows={3}
                placeholder="이번 분기 주요 성과를 입력하세요"
                value={formData.achievements}
                onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
              />
            </div>

            {/* 개선 필요 사항 */}
            <div>
              <Label>개선 필요 사항</Label>
              <Textarea 
                rows={3}
                placeholder="개선이 필요한 사항을 입력하세요"
                value={formData.improvements}
                onChange={(e) => setFormData({ ...formData, improvements: e.target.value })}
              />
            </div>

            {/* 다음 분기 계획 */}
            <div>
              <Label>다음 분기 계획</Label>
              <Textarea 
                rows={3}
                placeholder="다음 분기 계획을 입력하세요"
                value={formData.nextQuarterPlan}
                onChange={(e) => setFormData({ ...formData, nextQuarterPlan: e.target.value })}
              />
            </div>

            {/* 종합 평가 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>종합 평가</Label>
                <Select 
                  value={formData.overallRating} 
                  onValueChange={(value) => setFormData({ ...formData, overallRating: value as OverallRating })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">매우 우수</SelectItem>
                    <SelectItem value="good">우수</SelectItem>
                    <SelectItem value="fair">보통</SelectItem>
                    <SelectItem value="poor">미흡</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 종합 코멘트 */}
            <div>
              <Label>종합 코멘트</Label>
              <Textarea 
                rows={3}
                placeholder="종합 코멘트를 입력하세요"
                value={formData.overallComment}
                onChange={(e) => setFormData({ ...formData, overallComment: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              <X className="w-4 h-4 mr-1" />
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              <Save className="w-4 h-4 mr-1" />
              {editingReview ? '수정' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
