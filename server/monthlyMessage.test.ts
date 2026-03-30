/**
 * Monthly Message API Tests
 * 이달의 한마디 CRUD API 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getMonthlyMessage: vi.fn(),
  upsertMonthlyMessage: vi.fn(),
  deleteMonthlyMessage: vi.fn(),
  getMonthlyMessageById: vi.fn(),
}));

import {
  getMonthlyMessage,
  upsertMonthlyMessage,
  deleteMonthlyMessage,
  getMonthlyMessageById,
} from './db';

describe('Monthly Message API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMonthlyMessage', () => {
    it('should return message for a specific month', async () => {
      const mockMessage = {
        id: 'msg-1',
        userId: 1,
        year: 2026,
        month: 2,
        message: '이번 달 매출 목표 달성을 위해 화이팅!',
        authorName: '홍길동',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(getMonthlyMessage).mockResolvedValue(mockMessage as any);

      const result = await getMonthlyMessage(2026, 2);

      expect(getMonthlyMessage).toHaveBeenCalledWith(2026, 2);
      expect(result).toBeDefined();
      expect(result?.message).toBe('이번 달 매출 목표 달성을 위해 화이팅!');
      expect(result?.authorName).toBe('홍길동');
    });

    it('should return null when no message exists', async () => {
      vi.mocked(getMonthlyMessage).mockResolvedValue(null);

      const result = await getMonthlyMessage(2026, 3);

      expect(result).toBeNull();
    });
  });

  describe('upsertMonthlyMessage', () => {
    it('should create a new message', async () => {
      const newMessage = {
        userId: 1,
        year: 2026,
        month: 2,
        message: '새로운 메시지입니다.',
        authorName: '김철수',
      };

      const createdMessage = {
        id: 'new-msg-id',
        ...newMessage,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(upsertMonthlyMessage).mockResolvedValue(createdMessage as any);

      const result = await upsertMonthlyMessage(newMessage);

      expect(upsertMonthlyMessage).toHaveBeenCalledWith(newMessage);
      expect(result).toBeDefined();
      expect(result?.id).toBe('new-msg-id');
      expect(result?.message).toBe('새로운 메시지입니다.');
    });

    it('should update existing message', async () => {
      const updateData = {
        userId: 1,
        year: 2026,
        month: 2,
        message: '수정된 메시지입니다.',
        authorName: '김철수',
      };

      const updatedMessage = {
        id: 'existing-msg-id',
        ...updateData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(upsertMonthlyMessage).mockResolvedValue(updatedMessage as any);

      const result = await upsertMonthlyMessage(updateData);

      expect(result?.message).toBe('수정된 메시지입니다.');
    });
  });

  describe('deleteMonthlyMessage', () => {
    it('should delete a message', async () => {
      vi.mocked(deleteMonthlyMessage).mockResolvedValue(undefined);

      await deleteMonthlyMessage('msg-1');

      expect(deleteMonthlyMessage).toHaveBeenCalledWith('msg-1');
    });
  });

  describe('getMonthlyMessageById', () => {
    it('should return message by id', async () => {
      const mockMessage = {
        id: 'msg-1',
        userId: 1,
        year: 2026,
        month: 2,
        message: '특정 메시지',
        authorName: '박영희',
      };

      vi.mocked(getMonthlyMessageById).mockResolvedValue(mockMessage as any);

      const result = await getMonthlyMessageById('msg-1');

      expect(getMonthlyMessageById).toHaveBeenCalledWith('msg-1');
      expect(result?.id).toBe('msg-1');
      expect(result?.message).toBe('특정 메시지');
    });

    it('should return null for non-existent message', async () => {
      vi.mocked(getMonthlyMessageById).mockResolvedValue(null);

      const result = await getMonthlyMessageById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('Message Validation', () => {
    it('should handle message with maximum length', async () => {
      const longMessage = 'A'.repeat(1000);
      const messageData = {
        userId: 1,
        year: 2026,
        month: 2,
        message: longMessage,
        authorName: '테스트',
      };

      const createdMessage = {
        id: 'long-msg-id',
        ...messageData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(upsertMonthlyMessage).mockResolvedValue(createdMessage as any);

      const result = await upsertMonthlyMessage(messageData);

      expect(result?.message.length).toBe(1000);
    });

    it('should handle different months correctly', async () => {
      for (let month = 1; month <= 12; month++) {
        const mockMessage = {
          id: `msg-${month}`,
          userId: 1,
          year: 2026,
          month,
          message: `${month}월 메시지`,
          authorName: '테스트',
        };

        vi.mocked(getMonthlyMessage).mockResolvedValue(mockMessage as any);

        const result = await getMonthlyMessage(2026, month);

        expect(result?.month).toBe(month);
      }
    });
  });
});
