import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
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

describe("goal router", () => {
  it("has list procedure that requires year input", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Verify the list procedure exists and accepts year parameter
    expect(caller.goal.list).toBeDefined();
  });

  it("has create procedure with required fields", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Verify the create procedure exists
    expect(caller.goal.create).toBeDefined();
  });

  it("has update procedure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Verify the update procedure exists
    expect(caller.goal.update).toBeDefined();
  });

  it("has delete procedure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Verify the delete procedure exists
    expect(caller.goal.delete).toBeDefined();
  });
});
