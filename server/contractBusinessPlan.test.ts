import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appRouter } from './routers';
import type { inferProcedureInput } from '@trpc/server';

// Mock the database functions
vi.mock('./db', async () => {
  const actual = await vi.importActual('./db');
  return {
    ...actual,
    getContractBusinessPlansByYear: vi.fn().mockResolvedValue([]),
    getContractBusinessPlansByChannel: vi.fn().mockResolvedValue([]),
    createContractBusinessPlan: vi.fn().mockResolvedValue({ id: 1 }),
    updateContractBusinessPlan: vi.fn().mockResolvedValue({ id: 1 }),
    deleteContractBusinessPlan: vi.fn().mockResolvedValue(undefined),
    upsertContractBusinessPlan: vi.fn().mockResolvedValue({ id: 1 }),
    updateContractBusinessPlanMonth: vi.fn().mockResolvedValue({ id: 1 }),
    deleteContractBusinessPlansByYear: vi.fn().mockResolvedValue(undefined),
    getContractBusinessPlanHistoryByPlanId: vi.fn().mockResolvedValue([]),
    getContractBusinessPlanHistoryByYear: vi.fn().mockResolvedValue([]),
    createContractBusinessPlanHistory: vi.fn().mockResolvedValue({ id: 1 }),
    deleteContractBusinessPlanHistoryByYear: vi.fn().mockResolvedValue(undefined),
    getContractBusinessPlanMonthlyTarget: vi.fn().mockResolvedValue(0),
    getContractBusinessPlanAllMonthlyTargets: vi.fn().mockResolvedValue([]),
    getContractRecordsMonthlyActuals: vi.fn().mockResolvedValue([]),
  };
});

describe('contractBusinessPlan router', () => {
  const mockUser = {
    id: 1,
    openId: 'test-open-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin' as const,
    canEditSales: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createCaller = (user = mockUser) => {
    return appRouter.createCaller({
      user,
    } as any);
  };

  describe('contractBusinessPlan.getByYear', () => {
    it('should have contractBusinessPlan.getByYear procedure', async () => {
      const caller = createCaller();
      const result = await caller.contractBusinessPlan.getByYear({ year: 2026 });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('contractBusinessPlan.getByChannel', () => {
    it('should have contractBusinessPlan.getByChannel procedure', async () => {
      const caller = createCaller();
      const result = await caller.contractBusinessPlan.getByChannel({ 
        year: 2026, 
        channel: '내부채널' 
      });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('contractBusinessPlan.create', () => {
    it('should create a new contract business plan', async () => {
      const caller = createCaller();
      const input = {
        year: 2026,
        channel: '내부채널',
        subChannel: '상담전화',
        month1: 10,
        month2: 15,
        month3: 20,
        month4: 25,
        month5: 30,
        month6: 35,
        month7: 40,
        month8: 45,
        month9: 50,
        month10: 55,
        month11: 60,
        month12: 65,
      };
      const result = await caller.contractBusinessPlan.create(input);
      expect(result).toHaveProperty('id');
    });
  });

  describe('contractBusinessPlan.updateMonth', () => {
    it('should update a specific month target', async () => {
      const caller = createCaller();
      const result = await caller.contractBusinessPlan.updateMonth({
        year: 2026,
        channel: '내부채널',
        subChannel: '상담전화',
        month: 1,
        value: 100,
      });
      expect(result).toHaveProperty('id');
    });
  });

  describe('contractBusinessPlan.upsert', () => {
    it('should upsert a contract business plan', async () => {
      const caller = createCaller();
      const input = {
        year: 2026,
        channel: '외부채널',
        subChannel: '라이브커머스',
        month1: 5,
        month2: 10,
        month3: 15,
        month4: 20,
        month5: 25,
        month6: 30,
        month7: 35,
        month8: 40,
        month9: 45,
        month10: 50,
        month11: 55,
        month12: 60,
      };
      const result = await caller.contractBusinessPlan.upsert(input);
      expect(result).toHaveProperty('id');
    });
  });

  describe('contractBusinessPlan.getHistoryByYear', () => {
    it('should return history for a given year', async () => {
      const caller = createCaller();
      const result = await caller.contractBusinessPlan.getHistoryByYear({ year: 2026 });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('contractBusinessPlan.getAllMonthlyTargets', () => {
    it('should return all monthly targets', async () => {
      const caller = createCaller();
      const result = await caller.contractBusinessPlan.getAllMonthlyTargets({ 
        year: 2026, 
        month: 1 
      });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('contractBusinessPlan.getAllMonthlyActuals', () => {
    it('should return all monthly actuals from contract records', async () => {
      const caller = createCaller();
      const result = await caller.contractBusinessPlan.getAllMonthlyActuals({ 
        year: 2026, 
        month: 1 
      });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('permission checks', () => {
    it('should reject non-admin users without canEditSales for create', async () => {
      const regularUser = {
        ...mockUser,
        role: 'user' as const,
        canEditSales: false,
      };
      const caller = createCaller(regularUser);
      
      await expect(caller.contractBusinessPlan.create({
        year: 2026,
        channel: '내부채널',
        subChannel: '상담전화',
      })).rejects.toThrow('계획 수정 권한이 없습니다');
    });

    it('should allow users with canEditSales to create', async () => {
      const userWithPermission = {
        ...mockUser,
        role: 'user' as const,
        canEditSales: true,
      };
      const caller = createCaller(userWithPermission);
      
      const result = await caller.contractBusinessPlan.create({
        year: 2026,
        channel: '내부채널',
        subChannel: '상담전화',
      });
      expect(result).toHaveProperty('id');
    });
  });
});
