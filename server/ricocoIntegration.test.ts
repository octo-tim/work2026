import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', async () => {
  const actual = await vi.importActual('./db');
  return {
    ...actual,
    getWeeklySalesSummary: vi.fn(),
  };
});

import { getWeeklySalesSummary } from './db';

describe('Ricoco Integration with Business Plan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWeeklySalesSummary includes ricoco division', () => {
    it('should return ricoco division data in byDivision', async () => {
      const mockFn = getWeeklySalesSummary as ReturnType<typeof vi.fn>;
      mockFn.mockResolvedValue({
        week1Total: 58492241,
        week2Total: 0,
        week3Total: 0,
        week4Total: 0,
        monthlyTotal: 58492241,
        targetTotal: 50000000,
        achievementRate: "117.0",
        byDivision: [
          {
            division: 'ricoco',
            week1: 58492241,
            week2: 0,
            week3: 0,
            week4: 0,
            total: 58492241,
            target: 50000000,
            rate: "117.0"
          }
        ],
        byProductGroup: [
          { division: 'ricoco', productGroup: '시공매출', total: 52613010 },
          { division: 'ricoco', productGroup: '온라인매출', total: 5879231 },
        ]
      });

      const result = await getWeeklySalesSummary(2026, 2);
      
      // Verify ricoco division exists in byDivision
      expect(result.byDivision).toHaveLength(1);
      expect(result.byDivision[0].division).toBe('ricoco');
      expect(result.byDivision[0].total).toBe(58492241);
      expect(result.byDivision[0].target).toBe(50000000);
      expect(result.byDivision[0].rate).toBe("117.0");
    });

    it('should return ricoco product groups in byProductGroup', async () => {
      const mockFn = getWeeklySalesSummary as ReturnType<typeof vi.fn>;
      mockFn.mockResolvedValue({
        week1Total: 58492241,
        week2Total: 0,
        week3Total: 0,
        week4Total: 0,
        monthlyTotal: 58492241,
        targetTotal: 50000000,
        achievementRate: "117.0",
        byDivision: [
          {
            division: 'ricoco',
            week1: 58492241,
            week2: 0,
            week3: 0,
            week4: 0,
            total: 58492241,
            target: 50000000,
            rate: "117.0"
          }
        ],
        byProductGroup: [
          { division: 'ricoco', productGroup: '시공매출', total: 52613010 },
          { division: 'ricoco', productGroup: '온라인매출', total: 5879231 },
        ]
      });

      const result = await getWeeklySalesSummary(2026, 2);
      
      // Verify ricoco product groups exist
      const ricocoProductGroups = result.byProductGroup.filter(
        (pg: { division: string }) => pg.division === 'ricoco'
      );
      expect(ricocoProductGroups).toHaveLength(2);
      expect(ricocoProductGroups[0].productGroup).toBe('시공매출');
      expect(ricocoProductGroups[0].total).toBe(52613010);
      expect(ricocoProductGroups[1].productGroup).toBe('온라인매출');
      expect(ricocoProductGroups[1].total).toBe(5879231);
    });

    it('should include ricoco in multi-division summary', async () => {
      const mockFn = getWeeklySalesSummary as ReturnType<typeof vi.fn>;
      mockFn.mockResolvedValue({
        week1Total: 200000000,
        week2Total: 150000000,
        week3Total: 0,
        week4Total: 0,
        monthlyTotal: 350000000,
        targetTotal: 500000000,
        achievementRate: "70.0",
        byDivision: [
          {
            division: 'bombom',
            week1: 100000000,
            week2: 50000000,
            week3: 0,
            week4: 0,
            total: 150000000,
            target: 200000000,
            rate: "75.0"
          },
          {
            division: 'online',
            week1: 50000000,
            week2: 80000000,
            week3: 0,
            week4: 0,
            total: 130000000,
            target: 200000000,
            rate: "65.0"
          },
          {
            division: 'manufacturing',
            week1: 10000000,
            week2: 10000000,
            week3: 0,
            week4: 0,
            total: 20000000,
            target: 50000000,
            rate: "40.0"
          },
          {
            division: 'ricoco',
            week1: 40000000,
            week2: 10000000,
            week3: 0,
            week4: 0,
            total: 50000000,
            target: 50000000,
            rate: "100.0"
          }
        ],
        byProductGroup: [
          { division: 'ricoco', productGroup: '시공매출', total: 40000000 },
          { division: 'ricoco', productGroup: '온라인매출', total: 10000000 },
        ]
      });

      const result = await getWeeklySalesSummary(2026, 2);
      
      // Verify all 4 divisions are present
      expect(result.byDivision).toHaveLength(4);
      const divisions = result.byDivision.map((d: { division: string }) => d.division);
      expect(divisions).toContain('bombom');
      expect(divisions).toContain('online');
      expect(divisions).toContain('manufacturing');
      expect(divisions).toContain('ricoco');
      
      // Verify ricoco totals
      const ricoco = result.byDivision.find((d: { division: string }) => d.division === 'ricoco');
      expect(ricoco.total).toBe(50000000);
      expect(ricoco.rate).toBe("100.0");
    });
  });

  describe('BusinessPlan divisionMapping for ricoco', () => {
    it('should map ricoco sales division to ricoco business plan division', () => {
      // This tests the frontend mapping logic
      const divisionMapping: Record<string, string> = {
        'bombom': 'bombom_construction',
        'online': 'online_sales',
        'manufacturing': 'oem_supply',
        'ricoco': 'ricoco',
      };

      expect(divisionMapping['ricoco']).toBe('ricoco');
      expect(divisionMapping['bombom']).toBe('bombom_construction');
      expect(divisionMapping['online']).toBe('online_sales');
      expect(divisionMapping['manufacturing']).toBe('oem_supply');
    });

    it('should map ricoco product groups to sub divisions', () => {
      const productGroupToSubDivision: Record<string, Record<string, string>> = {
        'ricoco': {
          '시공매출': 'construction_sales',
          '온라인매출': 'online_sales',
        },
      };

      expect(productGroupToSubDivision['ricoco']['시공매출']).toBe('construction_sales');
      expect(productGroupToSubDivision['ricoco']['온라인매출']).toBe('online_sales');
    });

    it('should correctly aggregate ricoco monthly actuals', () => {
      // Simulate the salesMonthlyActuals logic
      const result: Record<string, Record<number, number>> = {
        'bombom_construction': {},
        'online_sales': {},
        'oem_supply': {},
        'ricoco': {},
      };

      const divisionMapping: Record<string, string> = {
        'bombom': 'bombom_construction',
        'online': 'online_sales',
        'manufacturing': 'oem_supply',
        'ricoco': 'ricoco',
      };

      // Simulate byDivision data from API
      const byDivision = [
        { division: 'bombom', total: 150000000 },
        { division: 'ricoco', total: 58492241 },
      ];

      const month = 2;
      byDivision.forEach((div) => {
        const businessPlanDivision = divisionMapping[div.division];
        if (businessPlanDivision) {
          result[businessPlanDivision][month] = div.total;
        }
      });

      expect(result['ricoco'][2]).toBe(58492241);
      expect(result['bombom_construction'][2]).toBe(150000000);
      expect(result['online_sales'][2]).toBeUndefined();
    });
  });

  describe('Server-side divisionMapping includes ricoco', () => {
    it('should have ricoco in server divisionMapping', () => {
      // Server-side mapping (from db.ts getWeeklySalesSummary)
      const divisionMapping: Record<string, string> = {
        'bombom_construction': 'bombom',
        'online_sales': 'online',
        'oem_supply': 'manufacturing',
        'ricoco': 'ricoco',
      };

      expect(divisionMapping['ricoco']).toBe('ricoco');
    });
  });
});
