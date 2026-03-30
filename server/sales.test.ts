import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createAdminContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  return createAuthContext({
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    role: "admin",
    ...overrides,
  });
}

function createSalesEditorContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  return createAuthContext({
    id: 390243,
    openId: "sales-editor",
    email: "editor@example.com",
    name: "Sales Editor",
    role: "user",
    canEditSales: true,
    ...overrides,
  });
}

describe("sales router", () => {
  it("should have sales.list procedure that returns an array", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sales.list({
      year: 2026,
      month: 1,
    });

    expect(Array.isArray(result)).toBe(true);
  });

  it("should have sales.list with division filter", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sales.list({
      year: 2026,
      month: 1,
      division: "mat",
    });

    expect(Array.isArray(result)).toBe(true);
  });

  it("should return the same sales data regardless of which user queries", async () => {
    // User A (regular user)
    const ctxA = createAuthContext({ id: 1, openId: "user-a", name: "User A" });
    const callerA = appRouter.createCaller(ctxA);

    // User B (different regular user)
    const ctxB = createAuthContext({ id: 2, openId: "user-b", name: "User B" });
    const callerB = appRouter.createCaller(ctxB);

    const resultA = await callerA.sales.list({ year: 2026, month: 2 });
    const resultB = await callerB.sales.list({ year: 2026, month: 2 });

    // Both users should see the exact same data
    expect(resultA.length).toBe(resultB.length);
    
    // Compare each record (sort by id to ensure consistent order)
    const sortedA = [...resultA].sort((a, b) => a.id.localeCompare(b.id));
    const sortedB = [...resultB].sort((a, b) => a.id.localeCompare(b.id));
    
    sortedA.forEach((recordA, index) => {
      const recordB = sortedB[index];
      expect(recordA.id).toBe(recordB.id);
      expect(recordA.division).toBe(recordB.division);
      expect(recordA.productGroup).toBe(recordB.productGroup);
      expect(recordA.week1Sales).toBe(recordB.week1Sales);
      expect(recordA.week2Sales).toBe(recordB.week2Sales);
    });
  });

  it("should reject upsert from regular user without canEditSales", async () => {
    const ctx = createAuthContext({ role: "user", canEditSales: false });
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.sales.upsert({
        year: 2026,
        month: 3,
        division: "bombom",
        productGroup: "테스트",
        week1Sales: 100,
      })
    ).rejects.toThrow("매출 편집 권한이 필요합니다");
  });

  it("should allow upsert from admin user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sales.upsert({
      year: 2026,
      month: 12,
      division: "bombom",
      productGroup: "테스트-admin",
      week1Sales: 500,
    });

    expect(result).toBeDefined();
    expect(result.division).toBe("bombom");
    expect(result.productGroup).toBe("테스트-admin");
    expect(result.week1Sales).toBe(500);

    // Cleanup: delete the test record
    await caller.sales.delete({ id: result.id });
  });

  it("should allow upsert from user with canEditSales permission", async () => {
    const ctx = createSalesEditorContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sales.upsert({
      year: 2026,
      month: 12,
      division: "online",
      productGroup: "테스트-editor",
      week1Sales: 300,
    });

    expect(result).toBeDefined();
    expect(result.division).toBe("online");
    expect(result.productGroup).toBe("테스트-editor");
    expect(result.week1Sales).toBe(300);

    // Cleanup
    const adminCtx = createAdminContext();
    const adminCaller = appRouter.createCaller(adminCtx);
    await adminCaller.sales.delete({ id: result.id });
  });

  it("should upsert to the same record regardless of which editor saves", async () => {
    const adminCtx = createAdminContext();
    const adminCaller = appRouter.createCaller(adminCtx);

    const editorCtx = createSalesEditorContext({ id: 390243 });
    const editorCaller = appRouter.createCaller(editorCtx);

    // Admin creates a record
    const record1 = await adminCaller.sales.upsert({
      year: 2026,
      month: 11,
      division: "manufacturing",
      productGroup: "테스트-upsert",
      week1Sales: 100,
    });

    expect(record1.week1Sales).toBe(100);

    // Editor updates the same record (same division+productGroup+year+month)
    const record2 = await editorCaller.sales.upsert({
      year: 2026,
      month: 11,
      division: "manufacturing",
      productGroup: "테스트-upsert",
      week1Sales: 200,
      week2Sales: 150,
    });

    // Should be the same record (updated, not a new one)
    expect(record2.id).toBe(record1.id);
    expect(record2.week1Sales).toBe(200);
    expect(record2.week2Sales).toBe(150);

    // Cleanup
    await adminCaller.sales.delete({ id: record2.id });
  });
});

describe("contract router", () => {
  it("should have contract.list procedure that returns an array", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.contract.list({
      year: 2026,
      month: 1,
    });

    expect(Array.isArray(result)).toBe(true);
  });

  it("should return the same contract data regardless of which user queries", async () => {
    const ctxA = createAuthContext({ id: 1, openId: "user-a", name: "User A" });
    const callerA = appRouter.createCaller(ctxA);

    const ctxB = createAuthContext({ id: 2, openId: "user-b", name: "User B" });
    const callerB = appRouter.createCaller(ctxB);

    const resultA = await callerA.contract.list({ year: 2026, month: 2 });
    const resultB = await callerB.contract.list({ year: 2026, month: 2 });

    expect(resultA.length).toBe(resultB.length);

    const sortedA = [...resultA].sort((a, b) => a.id.localeCompare(b.id));
    const sortedB = [...resultB].sort((a, b) => a.id.localeCompare(b.id));

    sortedA.forEach((recordA, index) => {
      const recordB = sortedB[index];
      expect(recordA.id).toBe(recordB.id);
      expect(recordA.channel).toBe(recordB.channel);
    });
  });

  it("should reject upsert from regular user without canEditSales", async () => {
    const ctx = createAuthContext({ role: "user", canEditSales: false });
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.contract.upsert({
        year: 2026,
        month: 3,
        channel: "내부채널",
        subChannel: "테스트채널",
        week1Count: 5,
      })
    ).rejects.toThrow("매출 편집 권한이 필요합니다");
  });
});
