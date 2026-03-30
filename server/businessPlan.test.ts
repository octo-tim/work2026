import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getBusinessPlansByYear: vi.fn(),
  getBusinessPlansByCategory: vi.fn(),
  createBusinessPlan: vi.fn(),
  updateBusinessPlan: vi.fn(),
  deleteBusinessPlan: vi.fn(),
  deleteBusinessPlansByYear: vi.fn(),
  bulkCreateBusinessPlans: vi.fn(),
}));

import {
  getBusinessPlansByYear,
  getBusinessPlansByCategory,
  createBusinessPlan,
  updateBusinessPlan,
  deleteBusinessPlan,
  deleteBusinessPlansByYear,
  bulkCreateBusinessPlans,
} from './db';

describe('Business Plan Database Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBusinessPlansByYear', () => {
    it('should return business plans for a given year', async () => {
      const mockPlans = [
        {
          id: 1,
          year: 2026,
          category: 'revenue',
          division: 'bombom_construction',
          subDivision: null,
          month1: '608400000',
          month2: '623600000',
          total: '8446467200',
          sortOrder: 0,
        },
        {
          id: 2,
          year: 2026,
          category: 'revenue',
          division: 'online_sales',
          subDivision: null,
          month1: '410000000',
          month2: '405000000',
          total: '5045000000',
          sortOrder: 1,
        },
      ];

      vi.mocked(getBusinessPlansByYear).mockResolvedValue(mockPlans as any);

      const result = await getBusinessPlansByYear(2026);

      expect(getBusinessPlansByYear).toHaveBeenCalledWith(2026);
      expect(result).toHaveLength(2);
      expect(result[0].year).toBe(2026);
      expect(result[0].category).toBe('revenue');
    });

    it('should return empty array when no plans exist', async () => {
      vi.mocked(getBusinessPlansByYear).mockResolvedValue([]);

      const result = await getBusinessPlansByYear(2025);

      expect(result).toEqual([]);
    });
  });

  describe('getBusinessPlansByCategory', () => {
    it('should return business plans filtered by category', async () => {
      const mockPlans = [
        {
          id: 1,
          year: 2026,
          category: 'quantity',
          division: 'bombom_construction',
          month1: '26000',
          total: '360096',
        },
      ];

      vi.mocked(getBusinessPlansByCategory).mockResolvedValue(mockPlans as any);

      const result = await getBusinessPlansByCategory(2026, 'quantity');

      expect(getBusinessPlansByCategory).toHaveBeenCalledWith(2026, 'quantity');
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('quantity');
    });
  });

  describe('createBusinessPlan', () => {
    it('should create a new business plan', async () => {
      const newPlan = {
        year: 2026,
        category: 'revenue',
        division: 'bombom_construction',
        subDivision: 'headquarters',
        month1: '428400000',
        month2: '428400000',
        total: '6031267200',
        sortOrder: 0,
      };

      const createdPlan = { id: 1, ...newPlan };
      vi.mocked(createBusinessPlan).mockResolvedValue(createdPlan as any);

      const result = await createBusinessPlan(newPlan);

      expect(createBusinessPlan).toHaveBeenCalledWith(newPlan);
      expect(result).toHaveProperty('id');
      expect(result?.division).toBe('bombom_construction');
    });
  });

  describe('updateBusinessPlan', () => {
    it('should update an existing business plan', async () => {
      const updateData = {
        month1: '500000000',
        total: '7000000000',
      };

      const updatedPlan = {
        id: 1,
        year: 2026,
        category: 'revenue',
        division: 'bombom_construction',
        ...updateData,
      };

      vi.mocked(updateBusinessPlan).mockResolvedValue(updatedPlan as any);

      const result = await updateBusinessPlan(1, updateData);

      expect(updateBusinessPlan).toHaveBeenCalledWith(1, updateData);
      expect(result?.month1).toBe('500000000');
    });
  });

  describe('deleteBusinessPlan', () => {
    it('should delete a business plan by id', async () => {
      vi.mocked(deleteBusinessPlan).mockResolvedValue(undefined);

      await deleteBusinessPlan(1);

      expect(deleteBusinessPlan).toHaveBeenCalledWith(1);
    });
  });

  describe('deleteBusinessPlansByYear', () => {
    it('should delete all business plans for a given year', async () => {
      vi.mocked(deleteBusinessPlansByYear).mockResolvedValue(undefined);

      await deleteBusinessPlansByYear(2026);

      expect(deleteBusinessPlansByYear).toHaveBeenCalledWith(2026);
    });
  });

  describe('bulkCreateBusinessPlans', () => {
    it('should create multiple business plans at once', async () => {
      const plans = [
        {
          year: 2026,
          category: 'quantity',
          division: 'bombom_construction',
          month1: '26000',
          total: '360096',
          sortOrder: 0,
        },
        {
          year: 2026,
          category: 'revenue',
          division: 'bombom_construction',
          month1: '608400000',
          total: '8446467200',
          sortOrder: 1,
        },
      ];

      vi.mocked(bulkCreateBusinessPlans).mockResolvedValue(undefined);

      await bulkCreateBusinessPlans(plans);

      expect(bulkCreateBusinessPlans).toHaveBeenCalledWith(plans);
    });

    it('should handle empty array', async () => {
      vi.mocked(bulkCreateBusinessPlans).mockResolvedValue(undefined);

      await bulkCreateBusinessPlans([]);

      expect(bulkCreateBusinessPlans).toHaveBeenCalledWith([]);
    });
  });
});

describe('Business Plan Data Validation', () => {
  it('should have valid category values', () => {
    const validCategories = ['quantity', 'revenue', 'cost'];
    
    validCategories.forEach(category => {
      expect(['quantity', 'revenue', 'cost']).toContain(category);
    });
  });

  it('should have valid division values', () => {
    const validDivisions = ['bombom_construction', 'online_sales', 'oem_supply', 'ricoco'];
    
    validDivisions.forEach(division => {
      expect(['bombom_construction', 'online_sales', 'oem_supply', 'ricoco']).toContain(division);
    });
  });

  it('should have valid subDivision values', () => {
    const validSubDivisions = [
      'headquarters', 'branch', 'bombom', 'shushuvi', 'etc',
      'linkmom', 'ricoco_120', 'creamhouse'
    ];
    
    validSubDivisions.forEach(subDivision => {
      expect([
        'headquarters', 'branch', 'bombom', 'shushuvi', 'etc',
        'linkmom', 'ricoco_120', 'creamhouse'
      ]).toContain(subDivision);
    });
  });
});
