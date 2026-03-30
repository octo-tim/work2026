import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => ({
  getTasksByUserId: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  updateTaskStatus: vi.fn(),
  getNextTaskNumber: vi.fn(),
}));

import { getTasksByUserId, createTask, updateTask, deleteTask, updateTaskStatus, getNextTaskNumber } from "./db";

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
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("task router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("task.list", () => {
    it("returns tasks for authenticated user", async () => {
      const mockTasks = [
        {
          id: "task-1",
          userId: 1,
          number: 1,
          title: "Test Task",
          department: "Engineering",
          assignee: "John",
          schedule: "2026-01",
          details: "Test details",
          status: "pending" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(getTasksByUserId).mockResolvedValue(mockTasks);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.task.list();

      expect(result).toEqual(mockTasks);
      expect(getTasksByUserId).toHaveBeenCalledWith(1);
    });
  });

  describe("task.create", () => {
    it("creates a new task", async () => {
      const mockTask = {
        id: "new-task",
        userId: 1,
        number: 1,
        title: "New Task",
        department: "Engineering",
        assignee: "John",
        schedule: "2026-01",
        details: "Details",
        status: "pending" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(getNextTaskNumber).mockResolvedValue(1);
      vi.mocked(createTask).mockResolvedValue(mockTask);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.task.create({
        title: "New Task",
        department: "Engineering",
        assignee: "John",
        schedule: "2026-01",
        details: "Details",
      });

      expect(result).toEqual(mockTask);
      expect(getNextTaskNumber).toHaveBeenCalledWith(1);
      expect(createTask).toHaveBeenCalledWith({
        userId: 1,
        number: 1,
        title: "New Task",
        department: "Engineering",
        assignee: "John",
        schedule: "2026-01",
        details: "Details",
        status: "pending",
      });
    });
  });

  describe("task.update", () => {
    it("updates an existing task", async () => {
      vi.mocked(updateTask).mockResolvedValue(undefined);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.task.update({
        id: "task-1",
        title: "Updated Task",
        status: "in-progress",
      });

      expect(result).toEqual({ success: true });
      expect(updateTask).toHaveBeenCalledWith("task-1", 1, {
        title: "Updated Task",
        status: "in-progress",
      }, false);
    });
  });

  describe("task.updateStatus", () => {
    it("updates task status", async () => {
      vi.mocked(updateTaskStatus).mockResolvedValue(undefined);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.task.updateStatus({
        id: "task-1",
        status: "completed",
      });

      expect(result).toEqual({ success: true });
      expect(updateTaskStatus).toHaveBeenCalledWith("task-1", 1, "completed", false);
    });
  });

  describe("task.delete", () => {
    it("deletes a task", async () => {
      vi.mocked(deleteTask).mockResolvedValue(undefined);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.task.delete({ id: "task-1" });

      expect(result).toEqual({ success: true });
      expect(deleteTask).toHaveBeenCalledWith("task-1", 1, false);
    });
  });
});
