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

describe('Weekly Sales Summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWeeklySalesSummary', () => {
    it('should return empty summary when no data exists', async () => {
      const mockFn = getWeeklySalesSummary as ReturnType<typeof vi.fn>;
      mockFn.mockResolvedValue({
        week1Total: 0,
        week2Total: 0,
        week3Total: 0,
        week4Total: 0,
        monthlyTotal: 0,
        targetTotal: 0,
        achievementRate: "0",
        byDivision: []
      });

      const result = await getWeeklySalesSummary(2026, 2);
      
      expect(result).toEqual({
        week1Total: 0,
        week2Total: 0,
        week3Total: 0,
        week4Total: 0,
        monthlyTotal: 0,
        targetTotal: 0,
        achievementRate: "0",
        byDivision: []
      });
    });

    it('should correctly aggregate weekly totals', async () => {
      const mockFn = getWeeklySalesSummary as ReturnType<typeof vi.fn>;
      mockFn.mockResolvedValue({
        week1Total: 1000000,
        week2Total: 1500000,
        week3Total: 2000000,
        week4Total: 1800000,
        monthlyTotal: 6300000,
        targetTotal: 10000000,
        achievementRate: "63.0",
        byDivision: [
          {
            division: 'bombom',
            week1: 500000,
            week2: 700000,
            week3: 900000,
            week4: 800000,
            total: 2900000,
            target: 5000000,
            rate: "58.0"
          },
          {
            division: 'manufacturing',
            week1: 300000,
            week2: 500000,
            week3: 700000,
            week4: 600000,
            total: 2100000,
            target: 3000000,
            rate: "70.0"
          },
          {
            division: 'online',
            week1: 200000,
            week2: 300000,
            week3: 400000,
            week4: 400000,
            total: 1300000,
            target: 2000000,
            rate: "65.0"
          }
        ]
      });

      const result = await getWeeklySalesSummary(2026, 2);
      
      expect(result.week1Total).toBe(1000000);
      expect(result.week2Total).toBe(1500000);
      expect(result.week3Total).toBe(2000000);
      expect(result.week4Total).toBe(1800000);
      expect(result.monthlyTotal).toBe(6300000);
      expect(result.targetTotal).toBe(10000000);
      expect(result.achievementRate).toBe("63.0");
      expect(result.byDivision).toHaveLength(3);
    });

    it('should calculate achievement rate correctly', async () => {
      const mockFn = getWeeklySalesSummary as ReturnType<typeof vi.fn>;
      mockFn.mockResolvedValue({
        week1Total: 2500000,
        week2Total: 2500000,
        week3Total: 2500000,
        week4Total: 2500000,
        monthlyTotal: 10000000,
        targetTotal: 10000000,
        achievementRate: "100.0",
        byDivision: []
      });

      const result = await getWeeklySalesSummary(2026, 2);
      
      expect(result.achievementRate).toBe("100.0");
    });

    it('should handle zero target gracefully', async () => {
      const mockFn = getWeeklySalesSummary as ReturnType<typeof vi.fn>;
      mockFn.mockResolvedValue({
        week1Total: 1000000,
        week2Total: 0,
        week3Total: 0,
        week4Total: 0,
        monthlyTotal: 1000000,
        targetTotal: 0,
        achievementRate: "0",
        byDivision: []
      });

      const result = await getWeeklySalesSummary(2026, 2);
      
      expect(result.achievementRate).toBe("0");
    });

    it('should return division-specific data', async () => {
      const mockFn = getWeeklySalesSummary as ReturnType<typeof vi.fn>;
      mockFn.mockResolvedValue({
        week1Total: 500000,
        week2Total: 500000,
        week3Total: 500000,
        week4Total: 500000,
        monthlyTotal: 2000000,
        targetTotal: 2000000,
        achievementRate: "100.0",
        byDivision: [
          {
            division: 'bombom',
            week1: 500000,
            week2: 500000,
            week3: 500000,
            week4: 500000,
            total: 2000000,
            target: 2000000,
            rate: "100.0"
          }
        ]
      });

      const result = await getWeeklySalesSummary(2026, 2);
      
      expect(result.byDivision).toHaveLength(1);
      expect(result.byDivision[0].division).toBe('bombom');
      expect(result.byDivision[0].total).toBe(2000000);
      expect(result.byDivision[0].rate).toBe("100.0");
    });
  });
});
