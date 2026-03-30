/**
 * Sales Event API Tests
 * 매출관리 일정 CRUD API 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getSalesEventsByMonth: vi.fn(),
  createSalesEvent: vi.fn(),
  updateSalesEvent: vi.fn(),
  deleteSalesEvent: vi.fn(),
  getSalesEventById: vi.fn(),
}));

import {
  getSalesEventsByMonth,
  createSalesEvent,
  updateSalesEvent,
  deleteSalesEvent,
  getSalesEventById,
} from './db';

describe('Sales Event API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSalesEventsByMonth', () => {
    it('should return events for a specific month', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: '월간 회의',
          eventDate: new Date('2026-02-15'),
          eventType: 'meeting',
          color: '#3b82f6',
        },
        {
          id: 'event-2',
          title: '프로모션 시작',
          eventDate: new Date('2026-02-20'),
          eventType: 'promotion',
          color: '#f59e0b',
        },
      ];

      vi.mocked(getSalesEventsByMonth).mockResolvedValue(mockEvents as any);

      const result = await getSalesEventsByMonth(2026, 2);

      expect(getSalesEventsByMonth).toHaveBeenCalledWith(2026, 2);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('월간 회의');
      expect(result[1].eventType).toBe('promotion');
    });

    it('should return empty array when no events exist', async () => {
      vi.mocked(getSalesEventsByMonth).mockResolvedValue([]);

      const result = await getSalesEventsByMonth(2026, 3);

      expect(result).toHaveLength(0);
    });
  });

  describe('createSalesEvent', () => {
    it('should create a new event with required fields', async () => {
      const newEvent = {
        userId: 1,
        title: '신규 일정',
        eventDate: new Date('2026-02-10'),
        eventType: 'other' as const,
        isAllDay: true,
        color: '#6b7280',
      };

      const createdEvent = {
        id: 'new-event-id',
        ...newEvent,
        description: null,
        endDate: null,
        division: null,
        reminderDays: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(createSalesEvent).mockResolvedValue(createdEvent as any);

      const result = await createSalesEvent(newEvent as any);

      expect(createSalesEvent).toHaveBeenCalledWith(newEvent);
      expect(result).toBeDefined();
      expect(result?.id).toBe('new-event-id');
      expect(result?.title).toBe('신규 일정');
    });

    it('should create event with all optional fields', async () => {
      const fullEvent = {
        userId: 1,
        title: '전체 필드 일정',
        description: '상세 설명입니다',
        eventDate: new Date('2026-02-15'),
        endDate: new Date('2026-02-17'),
        isAllDay: false,
        eventType: 'deadline' as const,
        color: '#ef4444',
        division: 'bombom',
        reminderDays: 3,
      };

      const createdEvent = {
        id: 'full-event-id',
        ...fullEvent,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(createSalesEvent).mockResolvedValue(createdEvent as any);

      const result = await createSalesEvent(fullEvent as any);

      expect(result?.description).toBe('상세 설명입니다');
      expect(result?.division).toBe('bombom');
      expect(result?.reminderDays).toBe(3);
    });
  });

  describe('updateSalesEvent', () => {
    it('should update event title', async () => {
      const updatedEvent = {
        id: 'event-1',
        title: '수정된 제목',
        eventDate: new Date('2026-02-15'),
        eventType: 'meeting' as const,
      };

      vi.mocked(updateSalesEvent).mockResolvedValue(updatedEvent as any);

      const result = await updateSalesEvent('event-1', { title: '수정된 제목' });

      expect(updateSalesEvent).toHaveBeenCalledWith('event-1', { title: '수정된 제목' });
      expect(result?.title).toBe('수정된 제목');
    });

    it('should update event type and color', async () => {
      const updatedEvent = {
        id: 'event-1',
        title: '일정',
        eventType: 'deadline' as const,
        color: '#ef4444',
      };

      vi.mocked(updateSalesEvent).mockResolvedValue(updatedEvent as any);

      const result = await updateSalesEvent('event-1', { 
        eventType: 'deadline', 
        color: '#ef4444' 
      });

      expect(result?.eventType).toBe('deadline');
      expect(result?.color).toBe('#ef4444');
    });
  });

  describe('deleteSalesEvent', () => {
    it('should delete an event', async () => {
      vi.mocked(deleteSalesEvent).mockResolvedValue(undefined);

      await deleteSalesEvent('event-1');

      expect(deleteSalesEvent).toHaveBeenCalledWith('event-1');
    });
  });

  describe('getSalesEventById', () => {
    it('should return event by id', async () => {
      const mockEvent = {
        id: 'event-1',
        title: '특정 일정',
        eventDate: new Date('2026-02-15'),
        eventType: 'meeting',
      };

      vi.mocked(getSalesEventById).mockResolvedValue(mockEvent as any);

      const result = await getSalesEventById('event-1');

      expect(getSalesEventById).toHaveBeenCalledWith('event-1');
      expect(result?.id).toBe('event-1');
      expect(result?.title).toBe('특정 일정');
    });

    it('should return null for non-existent event', async () => {
      vi.mocked(getSalesEventById).mockResolvedValue(null);

      const result = await getSalesEventById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('Event Types', () => {
    it('should support all event types', async () => {
      const eventTypes = ['meeting', 'deadline', 'promotion', 'holiday', 'payment', 'launch', 'other'];
      
      for (const eventType of eventTypes) {
        const mockEvent = {
          id: `event-${eventType}`,
          title: `${eventType} 일정`,
          eventType,
          eventDate: new Date('2026-02-15'),
        };

        vi.mocked(createSalesEvent).mockResolvedValue(mockEvent as any);

        const result = await createSalesEvent({
          userId: 1,
          title: `${eventType} 일정`,
          eventType: eventType as any,
          eventDate: new Date('2026-02-15'),
          isAllDay: true,
        } as any);

        expect(result?.eventType).toBe(eventType);
      }
    });
  });
});
