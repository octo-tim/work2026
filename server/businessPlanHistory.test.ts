import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

// Mock context
const createMockContext = (overrides: Partial<TrpcContext> = {}): TrpcContext => ({
  user: {
    id: 1,
    openId: 'test-open-id',
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin',
    canEditSales: true,
    divisionId: null,
    teamId: null,
    positionId: null,
    rankId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    avatarUrl: null,
    phoneNumber: null,
    employeeNumber: null,
    hireDate: null,
  },
  req: {} as any,
  res: {} as any,
  ...overrides,
});

describe('businessPlan history router', () => {
  describe('businessPlan.getHistoryByYear', () => {
    it('should have getHistoryByYear procedure', async () => {
      const caller = appRouter.createCaller(createMockContext());
      
      // 프로시저가 존재하는지 확인
      expect(caller.businessPlan.getHistoryByYear).toBeDefined();
    });

    it('should return empty array when no history exists', async () => {
      const caller = appRouter.createCaller(createMockContext());
      
      const result = await caller.businessPlan.getHistoryByYear({ year: 2099 });
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('businessPlan.getHistoryByPlanId', () => {
    it('should have getHistoryByPlanId procedure', async () => {
      const caller = appRouter.createCaller(createMockContext());
      
      // 프로시저가 존재하는지 확인
      expect(caller.businessPlan.getHistoryByPlanId).toBeDefined();
    });

    it('should return empty array for non-existent plan', async () => {
      const caller = appRouter.createCaller(createMockContext());
      
      const result = await caller.businessPlan.getHistoryByPlanId({ businessPlanId: 99999 });
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('businessPlan.createHistory', () => {
    it('should have createHistory procedure', async () => {
      const caller = appRouter.createCaller(createMockContext());
      
      // 프로시저가 존재하는지 확인
      expect(caller.businessPlan.createHistory).toBeDefined();
    });

    it('should require canEditSales permission', async () => {
      const caller = appRouter.createCaller(createMockContext({
        user: {
          id: 2,
          openId: 'test-open-id-2',
          name: 'Regular User',
          email: 'regular@example.com',
          role: 'user',
          canEditSales: false,
          divisionId: null,
          teamId: null,
          positionId: null,
          rankId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          avatarUrl: null,
          phoneNumber: null,
          employeeNumber: null,
          hireDate: null,
        }
      }));
      
      await expect(caller.businessPlan.createHistory({
        businessPlanId: 1,
        year: 2026,
        category: 'revenue',
        division: 'bombom_construction',
      })).rejects.toThrow('사업계획 수정 권한이 없습니다');
    });
  });

  describe('businessPlan.getMonthlyTarget', () => {
    it('should have getMonthlyTarget procedure', async () => {
      const caller = appRouter.createCaller(createMockContext());
      
      // 프로시저가 존재하는지 확인
      expect(caller.businessPlan.getMonthlyTarget).toBeDefined();
    });

    it('should return 0 for non-existent data', async () => {
      const caller = appRouter.createCaller(createMockContext());
      
      const result = await caller.businessPlan.getMonthlyTarget({
        year: 2099,
        month: 1,
        division: 'bombom',
      });
      
      expect(result).toBe(0);
    });
  });

  describe('businessPlan.syncSalesActual', () => {
    it('should have syncSalesActual procedure', async () => {
      const caller = appRouter.createCaller(createMockContext());
      
      // 프로시저가 존재하는지 확인
      expect(caller.businessPlan.syncSalesActual).toBeDefined();
    });

    it('should require canEditSales permission', async () => {
      const caller = appRouter.createCaller(createMockContext({
        user: {
          id: 2,
          openId: 'test-open-id-2',
          name: 'Regular User',
          email: 'regular@example.com',
          role: 'user',
          canEditSales: false,
          divisionId: null,
          teamId: null,
          positionId: null,
          rankId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          avatarUrl: null,
          phoneNumber: null,
          employeeNumber: null,
          hireDate: null,
        }
      }));
      
      await expect(caller.businessPlan.syncSalesActual({
        year: 2026,
        month: 1,
        division: 'bombom',
        actualValue: 100000000,
      })).rejects.toThrow('실적 동기화 권한이 없습니다');
    });
  });

  describe('businessPlan.updateActual', () => {
    it('should have updateActual procedure', async () => {
      const caller = appRouter.createCaller(createMockContext());
      
      // 프로시저가 존재하는지 확인
      expect(caller.businessPlan.updateActual).toBeDefined();
    });
  });
});
