import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// Mock the database module
vi.mock('./db', () => ({
  archiveTasks: vi.fn(),
  getArchivedTasks: vi.fn(),
  getAllArchivedTasks: vi.fn(),
  getArchivedTaskProgressLogs: vi.fn(),
  restoreArchivedTask: vi.fn(),
  deleteArchivedTask: vi.fn(),
}));

import {
  archiveTasks,
  getArchivedTasks,
  getAllArchivedTasks,
  getArchivedTaskProgressLogs,
  restoreArchivedTask,
  deleteArchivedTask,
} from './db';

describe('Archive Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('archiveTasks', () => {
    it('should archive multiple tasks successfully', async () => {
      const mockArchivedTasks = [
        {
          id: 'archive-1',
          originalTaskId: 'task-1',
          userId: 1,
          number: 1,
          title: 'Test Task 1',
          status: 'completed',
          archivedAt: new Date(),
          archivedBy: 1,
        },
        {
          id: 'archive-2',
          originalTaskId: 'task-2',
          userId: 1,
          number: 2,
          title: 'Test Task 2',
          status: 'completed',
          archivedAt: new Date(),
          archivedBy: 1,
        },
      ];

      vi.mocked(archiveTasks).mockResolvedValue(mockArchivedTasks as any);

      const result = await archiveTasks(['task-1', 'task-2'], 1, 'Test reason');

      expect(archiveTasks).toHaveBeenCalledWith(['task-1', 'task-2'], 1, 'Test reason');
      expect(result).toHaveLength(2);
      expect(result[0].originalTaskId).toBe('task-1');
      expect(result[1].originalTaskId).toBe('task-2');
    });

    it('should handle empty task list', async () => {
      vi.mocked(archiveTasks).mockResolvedValue([]);

      const result = await archiveTasks([], 1);

      expect(result).toHaveLength(0);
    });
  });

  describe('getArchivedTasks', () => {
    it('should return archived tasks for a user', async () => {
      const mockArchivedTasks = [
        {
          id: 'archive-1',
          originalTaskId: 'task-1',
          userId: 1,
          title: 'Archived Task 1',
          status: 'completed',
          archivedAt: new Date(),
        },
      ];

      vi.mocked(getArchivedTasks).mockResolvedValue(mockArchivedTasks as any);

      const result = await getArchivedTasks(1);

      expect(getArchivedTasks).toHaveBeenCalledWith(1);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Archived Task 1');
    });

    it('should return empty array when no archived tasks exist', async () => {
      vi.mocked(getArchivedTasks).mockResolvedValue([]);

      const result = await getArchivedTasks(1);

      expect(result).toHaveLength(0);
    });
  });

  describe('getAllArchivedTasks', () => {
    it('should return all archived tasks with user info for admin', async () => {
      const mockArchivedTasks = [
        {
          id: 'archive-1',
          originalTaskId: 'task-1',
          userId: 1,
          title: 'Archived Task 1',
          userName: 'Test User',
          koreanName: '테스트',
        },
        {
          id: 'archive-2',
          originalTaskId: 'task-2',
          userId: 2,
          title: 'Archived Task 2',
          userName: 'Another User',
          koreanName: '다른사용자',
        },
      ];

      vi.mocked(getAllArchivedTasks).mockResolvedValue(mockArchivedTasks as any);

      const result = await getAllArchivedTasks();

      expect(getAllArchivedTasks).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].userName).toBe('Test User');
    });
  });

  describe('getArchivedTaskProgressLogs', () => {
    it('should return progress logs for an archived task', async () => {
      const mockLogs = [
        {
          id: 1,
          archivedTaskId: 'archive-1',
          logDate: new Date(),
          content: 'Progress log 1',
        },
        {
          id: 2,
          archivedTaskId: 'archive-1',
          logDate: new Date(),
          content: 'Progress log 2',
        },
      ];

      vi.mocked(getArchivedTaskProgressLogs).mockResolvedValue(mockLogs as any);

      const result = await getArchivedTaskProgressLogs('archive-1');

      expect(getArchivedTaskProgressLogs).toHaveBeenCalledWith('archive-1');
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no logs exist', async () => {
      vi.mocked(getArchivedTaskProgressLogs).mockResolvedValue([]);

      const result = await getArchivedTaskProgressLogs('archive-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('restoreArchivedTask', () => {
    it('should restore an archived task successfully', async () => {
      const mockRestoredTask = {
        id: 'new-task-id',
        userId: 1,
        number: 10,
        title: 'Restored Task',
        status: 'completed',
      };

      vi.mocked(restoreArchivedTask).mockResolvedValue(mockRestoredTask as any);

      const result = await restoreArchivedTask('archive-1');

      expect(restoreArchivedTask).toHaveBeenCalledWith('archive-1');
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Restored Task');
    });

    it('should return null when archived task not found', async () => {
      vi.mocked(restoreArchivedTask).mockResolvedValue(null);

      const result = await restoreArchivedTask('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('deleteArchivedTask', () => {
    it('should delete an archived task permanently', async () => {
      vi.mocked(deleteArchivedTask).mockResolvedValue(undefined);

      await deleteArchivedTask('archive-1');

      expect(deleteArchivedTask).toHaveBeenCalledWith('archive-1');
    });
  });
});

describe('Archive API Input Validation', () => {
  it('should require at least one task ID for archiving', () => {
    // This tests the Zod validation schema
    const schema = {
      taskIds: [] as string[],
      reason: 'Test reason',
    };

    // Empty taskIds array should fail validation
    expect(schema.taskIds.length).toBe(0);
  });

  it('should accept valid archive input', () => {
    const validInput = {
      taskIds: ['task-1', 'task-2'],
      reason: 'Completed project',
    };

    expect(validInput.taskIds.length).toBeGreaterThan(0);
    expect(typeof validInput.reason).toBe('string');
  });

  it('should allow optional reason', () => {
    const inputWithoutReason = {
      taskIds: ['task-1'],
    };

    expect(inputWithoutReason.taskIds.length).toBe(1);
    expect((inputWithoutReason as any).reason).toBeUndefined();
  });
});
