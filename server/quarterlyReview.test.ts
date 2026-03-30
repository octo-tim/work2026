import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("quarterlyReview router", () => {
  describe("quarterlyReview.list", () => {
    it("should have quarterlyReview.list procedure", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Test that the procedure exists and can be called
      const result = await caller.quarterlyReview.list({ year: 2026 });
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("quarterlyReview.create", () => {
    it("should have quarterlyReview.create procedure", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Test that the procedure exists
      expect(caller.quarterlyReview.create).toBeDefined();
    });
  });

  describe("quarterlyReview.update", () => {
    it("should have quarterlyReview.update procedure", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Test that the procedure exists
      expect(caller.quarterlyReview.update).toBeDefined();
    });
  });

  describe("quarterlyReview.delete", () => {
    it("should have quarterlyReview.delete procedure", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Test that the procedure exists
      expect(caller.quarterlyReview.delete).toBeDefined();
    });
  });
});
