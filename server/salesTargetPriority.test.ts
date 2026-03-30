import { describe, it, expect } from 'vitest';

/**
 * 매출관리 달성률 계산 로직 테스트
 * 
 * 핵심 규칙:
 * - 개별 항목(productGroup)의 monthlyTarget이 있으면 우선 사용
 * - 개별 항목 monthlyTarget이 0이면 사업계획 대분류 목표로 폴백
 * - 합계 행: 개별 항목 monthlyTarget 합산이 있으면 우선, 없으면 사업계획 대분류 목표
 */

// 프론트엔드 calculateAchievementRate 로직 재현
function calculateAchievementRate(
  division: string,
  productGroup: string,
  salesData: Array<{ division: string; productGroup: string; monthlyTarget: number; cumulativeSales: number }>,
  businessPlanTargets: Record<string, number>
): string {
  const record = salesData.find(s => s.division === division && s.productGroup === productGroup);
  const recordTarget = record?.monthlyTarget ?? 0;
  const target = recordTarget > 0 ? recordTarget : (businessPlanTargets[division] || 0);
  if (target === 0) return '0.0';
  const cumulative = record?.cumulativeSales ?? 0;
  return ((cumulative / target) * 100).toFixed(1);
}

// 프론트엔드 calculateSectionTotals 로직 재현
function calculateSectionTotals(
  division: string,
  items: string[],
  salesData: Array<{ division: string; productGroup: string; monthlyTarget: number; cumulativeSales: number }>,
  businessPlanTargets: Record<string, number>
): { target: number; cumulative: number; rate: string } {
  let itemTargetSum = 0;
  let cumulative = 0;
  items.forEach(item => {
    const record = salesData.find(s => s.division === division && s.productGroup === item);
    itemTargetSum += record?.monthlyTarget ?? 0;
    cumulative += record?.cumulativeSales ?? 0;
  });
  const target = itemTargetSum > 0 ? itemTargetSum : (businessPlanTargets[division] || 0);
  const rate = target > 0 ? ((cumulative / target) * 100).toFixed(1) : '0.0';
  return { target, cumulative, rate };
}

// 서버 getWeeklySalesSummary 목표 계산 로직 재현
function calculateDivisionTarget(
  division: string,
  itemMonthlyTargetSum: number,
  businessPlanTarget: number
): number {
  return itemMonthlyTargetSum > 0 ? itemMonthlyTargetSum : businessPlanTarget;
}

describe('Sales Target Priority Logic', () => {
  describe('calculateAchievementRate - 개별 항목 달성률', () => {
    it('개별 항목 monthlyTarget이 있으면 해당 목표로 달성률 계산', () => {
      const salesData = [
        { division: 'bombom', productGroup: '본사', monthlyTarget: 400000000, cumulativeSales: 194836800 },
        { division: 'bombom', productGroup: '지사', monthlyTarget: 278800000, cumulativeSales: 90130455 },
      ];
      const businessPlanTargets = { bombom: 678800000 };

      const rateHQ = calculateAchievementRate('bombom', '본사', salesData, businessPlanTargets);
      const rateBranch = calculateAchievementRate('bombom', '지사', salesData, businessPlanTargets);

      // 본사: 194,836,800 / 400,000,000 = 48.7%
      expect(rateHQ).toBe('48.7');
      // 지사: 90,130,455 / 278,800,000 = 32.3%
      expect(rateBranch).toBe('32.3');
    });

    it('개별 항목 monthlyTarget이 0이면 사업계획 대분류 목표로 폴백', () => {
      const salesData = [
        { division: 'ricoco', productGroup: '시공매출', monthlyTarget: 0, cumulativeSales: 15194270 },
        { division: 'ricoco', productGroup: '온라인매출', monthlyTarget: 0, cumulativeSales: 5495700 },
      ];
      const businessPlanTargets = { ricoco: 150000000 };

      const rate1 = calculateAchievementRate('ricoco', '시공매출', salesData, businessPlanTargets);
      const rate2 = calculateAchievementRate('ricoco', '온라인매출', salesData, businessPlanTargets);

      // 시공매출: 15,194,270 / 150,000,000 = 10.1%
      expect(rate1).toBe('10.1');
      // 온라인매출: 5,495,700 / 150,000,000 = 3.7%
      expect(rate2).toBe('3.7');
    });

    it('모든 목표가 0이면 0.0% 반환', () => {
      const salesData = [
        { division: 'test', productGroup: '항목1', monthlyTarget: 0, cumulativeSales: 1000000 },
      ];
      const businessPlanTargets: Record<string, number> = {};

      const rate = calculateAchievementRate('test', '항목1', salesData, businessPlanTargets);
      expect(rate).toBe('0.0');
    });
  });

  describe('calculateSectionTotals - 사업부 합계 달성률', () => {
    it('개별 항목 monthlyTarget 합산이 있으면 합산을 사업부 목표로 사용', () => {
      const salesData = [
        { division: 'bombom', productGroup: '본사', monthlyTarget: 400000000, cumulativeSales: 194836800 },
        { division: 'bombom', productGroup: '지사', monthlyTarget: 278800000, cumulativeSales: 90130455 },
      ];
      const businessPlanTargets = { bombom: 678800000 };

      const totals = calculateSectionTotals('bombom', ['본사', '지사'], salesData, businessPlanTargets);

      // 합산 목표: 400,000,000 + 278,800,000 = 678,800,000
      expect(totals.target).toBe(678800000);
      // 합산 실적: 194,836,800 + 90,130,455 = 284,967,255
      expect(totals.cumulative).toBe(284967255);
      // 달성률: 284,967,255 / 678,800,000 = 42.0%
      expect(totals.rate).toBe('42.0');
    });

    it('개별 항목 monthlyTarget 합산이 0이면 사업계획 대분류 목표로 폴백', () => {
      const salesData = [
        { division: 'ricoco', productGroup: '시공매출', monthlyTarget: 0, cumulativeSales: 15194270 },
        { division: 'ricoco', productGroup: '온라인매출', monthlyTarget: 0, cumulativeSales: 5495700 },
      ];
      const businessPlanTargets = { ricoco: 150000000 };

      const totals = calculateSectionTotals('ricoco', ['시공매출', '온라인매출'], salesData, businessPlanTargets);

      // 사업계획 목표: 150,000,000
      expect(totals.target).toBe(150000000);
      // 합산 실적: 15,194,270 + 5,495,700 = 20,689,970
      expect(totals.cumulative).toBe(20689970);
      // 달성률: 20,689,970 / 150,000,000 = 13.8%
      expect(totals.rate).toBe('13.8');
    });

    it('일부 항목만 monthlyTarget이 있는 경우 합산이 0보다 크므로 합산 사용', () => {
      const salesData = [
        { division: 'manufacturing', productGroup: '크림하우스', monthlyTarget: 50000000, cumulativeSales: 13788600 },
        { division: 'manufacturing', productGroup: '기타', monthlyTarget: 0, cumulativeSales: 1471136 },
        { division: 'manufacturing', productGroup: '리코코', monthlyTarget: 0, cumulativeSales: 0 },
      ];
      const businessPlanTargets = { manufacturing: 99220600 };

      const totals = calculateSectionTotals('manufacturing', ['크림하우스', '기타', '리코코'], salesData, businessPlanTargets);

      // 합산 목표: 50,000,000 + 0 + 0 = 50,000,000 (> 0이므로 합산 사용)
      expect(totals.target).toBe(50000000);
      expect(totals.cumulative).toBe(15259736);
    });
  });

  describe('서버 calculateDivisionTarget - 사업부 목표 우선순위', () => {
    it('개별 항목 합산이 있으면 우선 사용', () => {
      const target = calculateDivisionTarget('bombom', 678800000, 678800000);
      expect(target).toBe(678800000);
    });

    it('개별 항목 합산이 0이면 사업계획 목표 사용', () => {
      const target = calculateDivisionTarget('ricoco', 0, 150000000);
      expect(target).toBe(150000000);
    });

    it('모두 0이면 0 반환', () => {
      const target = calculateDivisionTarget('unknown', 0, 0);
      expect(target).toBe(0);
    });
  });
});
