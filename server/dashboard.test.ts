import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: role,
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

describe("dashboard router", () => {
  describe("dashboard.myStats", () => {
    it("should have dashboard.myStats procedure", async () => {
      const ctx = createAuthContext("user");
      const caller = appRouter.createCaller(ctx);

      // Check that the procedure exists and can be called
      const stats = await caller.dashboard.myStats();
      
      // Verify the structure of the response
      expect(stats).toHaveProperty("totalTasks");
      expect(stats).toHaveProperty("pendingTasks");
      expect(stats).toHaveProperty("inProgressTasks");
      expect(stats).toHaveProperty("completedTasks");
      expect(stats).toHaveProperty("departmentStats");
      expect(stats).toHaveProperty("assigneeStats");
      expect(stats).toHaveProperty("recentTasks");
      expect(stats).toHaveProperty("weeklyTrend");
      
      // Verify types
      expect(typeof stats.totalTasks).toBe("number");
      expect(typeof stats.pendingTasks).toBe("number");
      expect(typeof stats.inProgressTasks).toBe("number");
      expect(typeof stats.completedTasks).toBe("number");
      expect(Array.isArray(stats.departmentStats)).toBe(true);
      expect(Array.isArray(stats.assigneeStats)).toBe(true);
      expect(Array.isArray(stats.recentTasks)).toBe(true);
      expect(Array.isArray(stats.weeklyTrend)).toBe(true);
    });
  });

  describe("dashboard.allStats", () => {
    it("admin can access allStats", async () => {
      const ctx = createAuthContext("admin");
      const caller = appRouter.createCaller(ctx);

      const stats = await caller.dashboard.allStats();
      
      // Verify the structure of the response
      expect(stats).toHaveProperty("totalTasks");
      expect(stats).toHaveProperty("pendingTasks");
      expect(stats).toHaveProperty("inProgressTasks");
      expect(stats).toHaveProperty("completedTasks");
      expect(stats).toHaveProperty("departmentStats");
      expect(stats).toHaveProperty("assigneeStats");
      expect(stats).toHaveProperty("recentTasks");
      expect(stats).toHaveProperty("weeklyTrend");
    });

    it("regular user cannot access allStats", async () => {
      const ctx = createAuthContext("user");
      const caller = appRouter.createCaller(ctx);

      await expect(caller.dashboard.allStats()).rejects.toThrow();
    });
  });
});
