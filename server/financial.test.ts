import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Mock ENV to set ownerOpenId
vi.mock('./_core/env', () => ({
  ENV: {
    ownerOpenId: 'owner-open-id-123',
    appId: '',
    cookieSecret: 'test-secret',
    databaseUrl: '',
    oAuthServerUrl: '',
    isProduction: false,
    forgeApiUrl: '',
    forgeApiKey: '',
    ecountComCode: '',
    ecountUserId: '',
    ecountApiCertKey: '',
  }
}));

function createOwnerContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "owner-open-id-123",
    email: "owner@example.com",
    name: "Owner",
    koreanName: "소유자",
    loginMethod: "manus",
    role: "admin",
    divisionId: null,
    teamId: null,
    positionId: null,
    rankId: null,
    isProfileComplete: true,
    canEditSales: true,
    canEditFinancial: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createFinancialEditorContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 3,
    openId: "financial-editor-789",
    email: "editor@example.com",
    name: "Financial Editor",
    koreanName: "재무편집자",
    loginMethod: "manus",
    role: "user",
    divisionId: null,
    teamId: null,
    positionId: null,
    rankId: null,
    isProfileComplete: true,
    canEditSales: false,
    canEditFinancial: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createNonOwnerContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user-456",
    email: "user@example.com",
    name: "Regular User",
    koreanName: "일반사용자",
    loginMethod: "manus",
    role: "user",
    divisionId: null,
    teamId: null,
    positionId: null,
    rankId: null,
    isProfileComplete: true,
    canEditSales: false,
    canEditFinancial: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("financial router - access control", () => {
  it("should reject unauthenticated users", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.financial.getRecords({ year: 2026, month: 3 })
    ).rejects.toThrow();
  });

  it("should reject non-owner/non-editor users", async () => {
    const ctx = createNonOwnerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.financial.getRecords({ year: 2026, month: 3 })
    ).rejects.toThrow();
  });

  it("should reject non-owner/non-editor from creating records", async () => {
    const ctx = createNonOwnerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.financial.createRecord({
        year: 2026,
        month: 3,
        week: 1,
        category: "테스트",
        type: "income",
        amount: 100000,
      })
    ).rejects.toThrow();
  });

  it("should reject non-owner/non-editor from setting balance", async () => {
    const ctx = createNonOwnerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.financial.setBalance({
        year: 2026,
        month: 3,
        openingBalance: 5000000,
      })
    ).rejects.toThrow();
  });

  it("should reject non-owner/non-editor from updating records", async () => {
    const ctx = createNonOwnerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.financial.updateRecord({
        id: "test-id",
        amount: 200000,
      })
    ).rejects.toThrow();
  });

  it("should reject non-owner/non-editor from deleting records", async () => {
    const ctx = createNonOwnerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.financial.deleteRecord({ id: "test-id" })
    ).rejects.toThrow();
  });

  it("should reject non-owner/non-editor from bulk uploading", async () => {
    const ctx = createNonOwnerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.financial.bulkUpload({
        year: 2026,
        month: 3,
        replaceExisting: false,
        records: [
          { week: 1, category: "테스트", type: "income", amount: 100000 },
        ],
      })
    ).rejects.toThrow();
  });

  it("should allow financial editor to access records", async () => {
    const ctx = createFinancialEditorContext();
    const caller = appRouter.createCaller(ctx);

    // This should not throw FORBIDDEN - it may throw DB error but not permission error
    try {
      await caller.financial.getRecords({ year: 2026, month: 3 });
    } catch (e: any) {
      // Should not be a FORBIDDEN error
      expect(e.code).not.toBe('FORBIDDEN');
    }
  });
});

describe("financial router - input validation", () => {
  it("should reject invalid month (0)", async () => {
    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.financial.getRecords({ year: 2026, month: 0 })
    ).rejects.toThrow();
  });

  it("should reject invalid month (13)", async () => {
    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.financial.getRecords({ year: 2026, month: 13 })
    ).rejects.toThrow();
  });

  it("should reject invalid week (0) in createRecord", async () => {
    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.financial.createRecord({
        year: 2026,
        month: 3,
        week: 0,
        category: "테스트",
        type: "income",
        amount: 100000,
      })
    ).rejects.toThrow();
  });

  it("should reject invalid week (6) in createRecord", async () => {
    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.financial.createRecord({
        year: 2026,
        month: 3,
        week: 6,
        category: "테스트",
        type: "income",
        amount: 100000,
      })
    ).rejects.toThrow();
  });

  it("should reject empty category in createRecord", async () => {
    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.financial.createRecord({
        year: 2026,
        month: 3,
        week: 1,
        category: "",
        type: "income",
        amount: 100000,
      })
    ).rejects.toThrow();
  });

  it("should reject negative amount in createRecord", async () => {
    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.financial.createRecord({
        year: 2026,
        month: 3,
        week: 1,
        category: "테스트",
        type: "income",
        amount: -100,
      })
    ).rejects.toThrow();
  });

  it("should reject invalid type in createRecord", async () => {
    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.financial.createRecord({
        year: 2026,
        month: 3,
        week: 1,
        category: "테스트",
        type: "invalid" as any,
        amount: 100000,
      })
    ).rejects.toThrow();
  });

  it("should reject bulkUpload with empty records", async () => {
    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.financial.bulkUpload({
        year: 2026,
        month: 3,
        replaceExisting: false,
        records: [],
      })
    ).rejects.toThrow();
  });

  it("should reject bulkUpload with invalid week in records", async () => {
    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.financial.bulkUpload({
        year: 2026,
        month: 3,
        replaceExisting: false,
        records: [
          { week: 0, category: "테스트", type: "income", amount: 100000 },
        ],
      })
    ).rejects.toThrow();
  });
});
