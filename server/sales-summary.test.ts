import { describe, expect, it, vi } from "vitest";

/**
 * 매출 집계 로직 테스트
 * 
 * 핵심 테스트: 프론트엔드에서 DB 데이터 기반으로 dynamicSalesFrames를 
 * 자동 업데이트하는 로직이 올바르게 동작하는지 검증
 * 
 * 문제 배경: SALES_FRAMES에 하드코딩된 브랜드 목록만 있어서
 * 신규 브랜드(시공외주, 피코베리)가 집계에서 누락되는 버그
 */

// SALES_FRAMES 기본 구조 시뮬레이션
const SALES_FRAMES = {
  제조공급: {
    division: 'manufacturing',
    label: '브랜드',
    items: ['리코코', '크림하우스', '기타'],
  },
  봄봄시공: {
    division: 'bombom',
    label: '거래처그룹',
    items: ['본사', '지사'],
  },
  온라인판매: {
    division: 'online',
    label: '브랜드',
    items: ['봄봄', '슈슈비', '기타'],
  },
  리코코: {
    division: 'ricoco',
    label: '매출구분',
    items: ['시공매출', '온라인매출'],
  },
};

// DB에서 반환되는 salesData 시뮬레이션
const mockSalesData = [
  { division: 'manufacturing', productGroup: '리코코', week1Sales: 28952000, week2Sales: 0, week3Sales: 0, week4Sales: 0 },
  { division: 'manufacturing', productGroup: '크림하우스', week1Sales: 8477000, week2Sales: 5017600, week3Sales: 5390000, week4Sales: 3900400 },
  { division: 'manufacturing', productGroup: '기타', week1Sales: 1074500, week2Sales: 1080682, week3Sales: 137135, week4Sales: 12045500 },
  { division: 'manufacturing', productGroup: '시공외주', week1Sales: 2976364, week2Sales: 3784145, week3Sales: 1079636, week4Sales: 2596363 },
  { division: 'manufacturing', productGroup: '피코베리', week1Sales: 0, week2Sales: 0, week3Sales: 0, week4Sales: 37410000 },
  { division: 'bombom', productGroup: '본사', week1Sales: 112774901, week2Sales: 105400450, week3Sales: 57254084, week4Sales: 65769538 },
  { division: 'bombom', productGroup: '지사', week1Sales: 36127730, week2Sales: 47128846, week3Sales: 8171819, week4Sales: 30900004 },
];

/**
 * dynamicSalesFrames 업데이트 로직 (SalesPage.tsx의 useEffect에서 추출)
 * salesData가 로드될 때 DB에 존재하는 productGroup을 자동으로 반영
 */
function updateDynamicSalesFrames(
  currentFrames: typeof SALES_FRAMES,
  salesData: typeof mockSalesData
): typeof SALES_FRAMES {
  const updated = { ...currentFrames };
  Object.entries(updated).forEach(([sectionName, config]) => {
    const dbItems = salesData
      .filter((s) => s.division === config.division)
      .map((s) => s.productGroup as string);
    
    // DB에 있지만 현재 items에 없는 항목 추가
    const newItems = [...config.items];
    dbItems.forEach((item: string) => {
      if (!newItems.includes(item)) {
        newItems.push(item);
      }
    });
    
    if (newItems.length !== config.items.length) {
      (updated as any)[sectionName] = {
        ...config,
        items: newItems
      };
    }
  });
  return updated;
}

/**
 * 섹션별 합계 계산 로직 (SalesPage.tsx의 calculateSectionTotals에서 추출)
 */
function calculateSectionTotals(
  division: string,
  items: string[],
  salesData: typeof mockSalesData
) {
  let week1 = 0, week2 = 0, week3 = 0, week4 = 0;
  
  items.forEach(item => {
    const record = salesData.find(s => s.division === division && s.productGroup === item);
    if (record) {
      week1 += record.week1Sales ?? 0;
      week2 += record.week2Sales ?? 0;
      week3 += record.week3Sales ?? 0;
      week4 += record.week4Sales ?? 0;
    }
  });

  const cumulative = week1 + week2 + week3 + week4;
  return { week1, week2, week3, week4, cumulative };
}

describe("매출 집계 - 신규 브랜드 반영 테스트", () => {
  it("SALES_FRAMES 기본값에는 제조공급 브랜드가 3개만 있다", () => {
    expect(SALES_FRAMES.제조공급.items).toEqual(['리코코', '크림하우스', '기타']);
    expect(SALES_FRAMES.제조공급.items.length).toBe(3);
  });

  it("DB 데이터 기반으로 dynamicSalesFrames를 업데이트하면 신규 브랜드가 추가된다", () => {
    const updated = updateDynamicSalesFrames(SALES_FRAMES, mockSalesData);
    
    // 제조공급에 시공외주, 피코베리가 추가되어야 함
    expect(updated.제조공급.items).toContain('시공외주');
    expect(updated.제조공급.items).toContain('피코베리');
    expect(updated.제조공급.items.length).toBe(5);
    
    // 기존 항목은 유지
    expect(updated.제조공급.items).toContain('리코코');
    expect(updated.제조공급.items).toContain('크림하우스');
    expect(updated.제조공급.items).toContain('기타');
  });

  it("봄봄시공은 DB에 추가 항목이 없으므로 변경되지 않는다", () => {
    const updated = updateDynamicSalesFrames(SALES_FRAMES, mockSalesData);
    expect(updated.봄봄시공.items).toEqual(['본사', '지사']);
  });

  it("기본 SALES_FRAMES로 집계하면 신규 브랜드 매출이 누락된다", () => {
    const totals = calculateSectionTotals(
      'manufacturing',
      SALES_FRAMES.제조공급.items, // 기본 3개만
      mockSalesData
    );
    
    // 리코코(28,952,000) + 크림하우스(22,785,000) + 기타(14,337,817) = 66,074,817
    expect(totals.cumulative).toBe(66074817);
  });

  it("업데이트된 dynamicSalesFrames로 집계하면 모든 브랜드가 포함된다", () => {
    const updated = updateDynamicSalesFrames(SALES_FRAMES, mockSalesData);
    const totals = calculateSectionTotals(
      'manufacturing',
      updated.제조공급.items, // 5개 전체
      mockSalesData
    );
    
    // 리코코(28,952,000) + 크림하우스(22,785,000) + 기타(14,337,817) + 시공외주(10,436,508) + 피코베리(37,410,000) = 113,921,325
    expect(totals.cumulative).toBe(113921325);
  });

  it("신규 브랜드 누락 금액이 정확히 47,846,508원이다", () => {
    const oldTotals = calculateSectionTotals(
      'manufacturing',
      SALES_FRAMES.제조공급.items,
      mockSalesData
    );
    
    const updated = updateDynamicSalesFrames(SALES_FRAMES, mockSalesData);
    const newTotals = calculateSectionTotals(
      'manufacturing',
      updated.제조공급.items,
      mockSalesData
    );
    
    const missingAmount = newTotals.cumulative - oldTotals.cumulative;
    // 시공외주(10,436,508) + 피코베리(37,410,000) = 47,846,508
    expect(missingAmount).toBe(47846508);
  });

  it("DB에 데이터가 없는 사업부는 기본 항목이 유지된다", () => {
    // 온라인판매와 리코코는 mockSalesData에 없음
    const updated = updateDynamicSalesFrames(SALES_FRAMES, mockSalesData);
    expect(updated.온라인판매.items).toEqual(['봄봄', '슈슈비', '기타']);
    expect(updated.리코코.items).toEqual(['시공매출', '온라인매출']);
  });

  it("중복 항목이 추가되지 않는다", () => {
    // 두 번 업데이트해도 중복 없음
    const firstUpdate = updateDynamicSalesFrames(SALES_FRAMES, mockSalesData);
    const secondUpdate = updateDynamicSalesFrames(firstUpdate, mockSalesData);
    
    expect(secondUpdate.제조공급.items.length).toBe(5);
    expect(new Set(secondUpdate.제조공급.items).size).toBe(5);
  });
});
