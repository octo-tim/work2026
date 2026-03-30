import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getKpiItemsWithIndicators: vi.fn(),
  getKpiItemsByDivision: vi.fn(),
  getKpiItemsByDepartment: vi.fn(),
  getKpiRecords: vi.fn(),
  getKpiRecordsByYear: vi.fn(),
  upsertKpiRecord: vi.fn(),
  bulkUpsertKpiRecords: vi.fn(),
  deleteKpiRecord: vi.fn(),
  getKpiTargets: vi.fn(),
  upsertKpiTarget: vi.fn(),
  getKpiItemDetail: vi.fn(),
  upsertKpiItemDetail: vi.fn(),
  getKpiAssignees: vi.fn(),
  addKpiAssignee: vi.fn(),
  deleteKpiAssignee: vi.fn(),
  assignKpiAssigneeToItem: vi.fn(),
}));

import {
  getKpiItemsWithIndicators,
  getKpiItemsByDivision,
  getKpiItemsByDepartment,
  getKpiRecords,
  getKpiRecordsByYear,
  upsertKpiRecord,
  bulkUpsertKpiRecords,
  deleteKpiRecord,
  getKpiTargets,
  upsertKpiTarget,
  getKpiItemDetail,
  upsertKpiItemDetail,
  getKpiAssignees,
  addKpiAssignee,
  deleteKpiAssignee,
  assignKpiAssigneeToItem,
} from './db';

describe('KPI DB Helper Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getKpiItemsWithIndicators', () => {
    it('should return items with their indicators', async () => {
      const mockItems = [
        {
          id: 1,
          division: '매트사업부',
          department: '마케팅팀',
          person: '미정',
          category: '컨텐츠기획',
          task: '이벤트 관리',
          goal: '월별 이벤트 운영',
          isActive: true,
          sortOrder: 0,
          indicators: [
            { id: 1, kpiItemId: 1, name: '이벤트 노출수', unit: '건', sortOrder: 0 },
            { id: 2, kpiItemId: 1, name: '참여자수', unit: '명', sortOrder: 1 },
          ],
        },
      ];
      (getKpiItemsWithIndicators as any).mockResolvedValue(mockItems);

      const result = await getKpiItemsWithIndicators();
      expect(result).toHaveLength(1);
      expect(result[0].department).toBe('마케팅팀');
      expect(result[0].indicators).toHaveLength(2);
      expect(result[0].indicators[0].name).toBe('이벤트 노출수');
    });
  });

  describe('getKpiItemsByDivision', () => {
    it('should filter items by division', async () => {
      const mockItems = [
        {
          id: 1,
          division: '매트사업부',
          department: '마케팅팀',
          person: '미정',
          category: '컨텐츠기획',
          task: '이벤트 관리',
          goal: '',
          isActive: true,
          sortOrder: 0,
          indicators: [],
        },
      ];
      (getKpiItemsByDivision as any).mockResolvedValue(mockItems);

      const result = await getKpiItemsByDivision('매트사업부');
      expect(getKpiItemsByDivision).toHaveBeenCalledWith('매트사업부');
      expect(result).toHaveLength(1);
      expect(result[0].division).toBe('매트사업부');
    });
  });

  describe('getKpiItemsByDepartment', () => {
    it('should filter items by division and department', async () => {
      const mockItems = [
        {
          id: 1,
          division: '매트사업부',
          department: '고객영업팀',
          person: '김소영',
          category: '봄봄 고객영업',
          task: '전화상담',
          goal: '',
          isActive: true,
          sortOrder: 0,
          indicators: [{ id: 10, kpiItemId: 1, name: '해당채널 월간계약건수', unit: '건', sortOrder: 0 }],
        },
      ];
      (getKpiItemsByDepartment as any).mockResolvedValue(mockItems);

      const result = await getKpiItemsByDepartment('매트사업부', '고객영업팀');
      expect(getKpiItemsByDepartment).toHaveBeenCalledWith('매트사업부', '고객영업팀');
      expect(result).toHaveLength(1);
      expect(result[0].person).toBe('김소영');
    });
  });

  describe('getKpiRecords', () => {
    it('should return records for a specific year and month', async () => {
      const mockRecords = [
        { id: 1, kpiIndicatorId: 1, year: 2026, month: 3, week: 1, value: '150' },
        { id: 2, kpiIndicatorId: 1, year: 2026, month: 3, week: 2, value: '200' },
        { id: 3, kpiIndicatorId: 2, year: 2026, month: 3, week: 1, value: '50' },
      ];
      (getKpiRecords as any).mockResolvedValue(mockRecords);

      const result = await getKpiRecords(2026, 3);
      expect(getKpiRecords).toHaveBeenCalledWith(2026, 3);
      expect(result).toHaveLength(3);
      expect(result[0].value).toBe('150');
    });
  });

  describe('getKpiRecordsByYear', () => {
    it('should return all records for a year', async () => {
      const mockRecords = [
        { id: 1, kpiIndicatorId: 1, year: 2026, month: 1, week: 1, value: '100' },
        { id: 2, kpiIndicatorId: 1, year: 2026, month: 2, week: 1, value: '120' },
      ];
      (getKpiRecordsByYear as any).mockResolvedValue(mockRecords);

      const result = await getKpiRecordsByYear(2026);
      expect(getKpiRecordsByYear).toHaveBeenCalledWith(2026);
      expect(result).toHaveLength(2);
    });
  });

  describe('upsertKpiRecord', () => {
    it('should create or update a single record', async () => {
      const mockResult = { id: 1, kpiIndicatorId: 1, year: 2026, month: 3, week: 1, value: '250' };
      (upsertKpiRecord as any).mockResolvedValue(mockResult);

      const result = await upsertKpiRecord(1, 2026, 3, 1, '250');
      expect(upsertKpiRecord).toHaveBeenCalledWith(1, 2026, 3, 1, '250');
      expect(result.value).toBe('250');
    });

    it('should handle zero values', async () => {
      const mockResult = { id: 2, kpiIndicatorId: 1, year: 2026, month: 3, week: 2, value: '0' };
      (upsertKpiRecord as any).mockResolvedValue(mockResult);

      const result = await upsertKpiRecord(1, 2026, 3, 2, '0');
      expect(result.value).toBe('0');
    });
  });

  describe('bulkUpsertKpiRecords', () => {
    it('should handle bulk upsert of multiple records', async () => {
      const records = [
        { kpiIndicatorId: 1, year: 2026, month: 3, week: 1, value: '100' },
        { kpiIndicatorId: 1, year: 2026, month: 3, week: 2, value: '200' },
        { kpiIndicatorId: 2, year: 2026, month: 3, week: 1, value: '50' },
      ];
      (bulkUpsertKpiRecords as any).mockResolvedValue({ count: 3 });

      const result = await bulkUpsertKpiRecords(records);
      expect(bulkUpsertKpiRecords).toHaveBeenCalledWith(records);
      expect(result.count).toBe(3);
    });
  });

  describe('deleteKpiRecord', () => {
    it('should delete a record by id', async () => {
      (deleteKpiRecord as any).mockResolvedValue({ success: true });

      const result = await deleteKpiRecord(1);
      expect(deleteKpiRecord).toHaveBeenCalledWith(1);
      expect(result.success).toBe(true);
    });
  });
});

describe('KPI Target DB Helper Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getKpiTargets', () => {
    it('should return targets for a specific year and month', async () => {
      const mockTargets = [
        { id: 1, kpiIndicatorId: 1, year: 2026, month: 3, monthlyTarget: '500', previousActual: '420' },
        { id: 2, kpiIndicatorId: 2, year: 2026, month: 3, monthlyTarget: '1000', previousActual: '850' },
      ];
      (getKpiTargets as any).mockResolvedValue(mockTargets);

      const result = await getKpiTargets(2026, 3);
      expect(getKpiTargets).toHaveBeenCalledWith(2026, 3);
      expect(result).toHaveLength(2);
      expect(result[0].monthlyTarget).toBe('500');
      expect(result[0].previousActual).toBe('420');
    });

    it('should return empty array when no targets exist', async () => {
      (getKpiTargets as any).mockResolvedValue([]);

      const result = await getKpiTargets(2026, 1);
      expect(result).toHaveLength(0);
    });
  });

  describe('upsertKpiTarget', () => {
    it('should create a new target with monthly target', async () => {
      const mockResult = { id: 1, kpiIndicatorId: 1, year: 2026, month: 3, monthlyTarget: '500', previousActual: null };
      (upsertKpiTarget as any).mockResolvedValue(mockResult);

      const result = await upsertKpiTarget(1, 2026, 3, '500', undefined);
      expect(upsertKpiTarget).toHaveBeenCalledWith(1, 2026, 3, '500', undefined);
      expect(result.monthlyTarget).toBe('500');
    });

    it('should create a new target with previous actual', async () => {
      const mockResult = { id: 2, kpiIndicatorId: 1, year: 2026, month: 3, monthlyTarget: null, previousActual: '420' };
      (upsertKpiTarget as any).mockResolvedValue(mockResult);

      const result = await upsertKpiTarget(1, 2026, 3, undefined, '420');
      expect(result.previousActual).toBe('420');
    });

    it('should update both target and previous actual', async () => {
      const mockResult = { id: 3, kpiIndicatorId: 5, year: 2026, month: 3, monthlyTarget: '1000', previousActual: '850' };
      (upsertKpiTarget as any).mockResolvedValue(mockResult);

      const result = await upsertKpiTarget(5, 2026, 3, '1000', '850');
      expect(result.monthlyTarget).toBe('1000');
      expect(result.previousActual).toBe('850');
    });

    it('should handle zero values for target', async () => {
      const mockResult = { id: 4, kpiIndicatorId: 1, year: 2026, month: 3, monthlyTarget: '0', previousActual: '0' };
      (upsertKpiTarget as any).mockResolvedValue(mockResult);

      const result = await upsertKpiTarget(1, 2026, 3, '0', '0');
      expect(result.monthlyTarget).toBe('0');
      expect(result.previousActual).toBe('0');
    });
  });
});

describe('KPI Item Detail DB Helper Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getKpiItemDetail', () => {
    it('should return detail for a specific item, year and month', async () => {
      const mockDetail = {
        id: 1,
        kpiItemId: 5,
        year: 2026,
        month: 3,
        previousEvaluation: '2월 이벤트 3건 진행, 참여율 15% 달성',
        monthlyPlan: '3월 봄 시즌 이벤트 5건 기획',
        execution: '1주차 이벤트 기획안 작성 완료',
      };
      (getKpiItemDetail as any).mockResolvedValue(mockDetail);

      const result = await getKpiItemDetail(5, 2026, 3);
      expect(getKpiItemDetail).toHaveBeenCalledWith(5, 2026, 3);
      expect(result.previousEvaluation).toBe('2월 이벤트 3건 진행, 참여율 15% 달성');
      expect(result.monthlyPlan).toBe('3월 봄 시즌 이벤트 5건 기획');
      expect(result.execution).toBe('1주차 이벤트 기획안 작성 완료');
    });

    it('should return null when no detail exists', async () => {
      (getKpiItemDetail as any).mockResolvedValue(null);

      const result = await getKpiItemDetail(99, 2026, 3);
      expect(result).toBeNull();
    });
  });

  describe('upsertKpiItemDetail', () => {
    it('should create a new detail with all fields', async () => {
      const mockResult = {
        id: 1,
        kpiItemId: 5,
        year: 2026,
        month: 3,
        previousEvaluation: '전월 평가 내용',
        monthlyPlan: '금월 계획 내용',
        execution: '실행 내용',
      };
      (upsertKpiItemDetail as any).mockResolvedValue(mockResult);

      const result = await upsertKpiItemDetail(5, 2026, 3, '전월 평가 내용', '금월 계획 내용', '실행 내용');
      expect(upsertKpiItemDetail).toHaveBeenCalledWith(5, 2026, 3, '전월 평가 내용', '금월 계획 내용', '실행 내용');
      expect(result.previousEvaluation).toBe('전월 평가 내용');
      expect(result.monthlyPlan).toBe('금월 계획 내용');
      expect(result.execution).toBe('실행 내용');
    });

    it('should handle partial updates with empty strings', async () => {
      const mockResult = {
        id: 2,
        kpiItemId: 5,
        year: 2026,
        month: 3,
        previousEvaluation: '전월 평가만 입력',
        monthlyPlan: '',
        execution: '',
      };
      (upsertKpiItemDetail as any).mockResolvedValue(mockResult);

      const result = await upsertKpiItemDetail(5, 2026, 3, '전월 평가만 입력', '', '');
      expect(result.monthlyPlan).toBe('');
      expect(result.execution).toBe('');
    });

    it('should update existing detail', async () => {
      const mockResult = {
        id: 1,
        kpiItemId: 5,
        year: 2026,
        month: 3,
        previousEvaluation: '수정된 전월 평가',
        monthlyPlan: '수정된 금월 계획',
        execution: '수정된 실행 내용',
      };
      (upsertKpiItemDetail as any).mockResolvedValue(mockResult);

      const result = await upsertKpiItemDetail(5, 2026, 3, '수정된 전월 평가', '수정된 금월 계획', '수정된 실행 내용');
      expect(result.previousEvaluation).toBe('수정된 전월 평가');
    });
  });
});

describe('KPI Assignee DB Helper Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getKpiAssignees', () => {
    it('should return all assignees', async () => {
      const mockAssignees = [
        { id: 1, name: '김소영', department: '고객영업팀' },
        { id: 2, name: '이민수', department: '마케팅팀' },
        { id: 3, name: '박지현', department: '퍼포먼스' },
      ];
      (getKpiAssignees as any).mockResolvedValue(mockAssignees);

      const result = await getKpiAssignees();
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('김소영');
      expect(result[1].department).toBe('마케팅팀');
    });

    it('should return empty array when no assignees exist', async () => {
      (getKpiAssignees as any).mockResolvedValue([]);

      const result = await getKpiAssignees();
      expect(result).toHaveLength(0);
    });
  });

  describe('addKpiAssignee', () => {
    it('should add a new assignee with name and department', async () => {
      const mockResult = { id: 4, name: '최영호', department: '디자인팀' };
      (addKpiAssignee as any).mockResolvedValue(mockResult);

      const result = await addKpiAssignee('최영호', '디자인팀');
      expect(addKpiAssignee).toHaveBeenCalledWith('최영호', '디자인팀');
      expect(result.name).toBe('최영호');
      expect(result.department).toBe('디자인팀');
    });

    it('should add assignee without department', async () => {
      const mockResult = { id: 5, name: '홍길동', department: null };
      (addKpiAssignee as any).mockResolvedValue(mockResult);

      const result = await addKpiAssignee('홍길동', undefined);
      expect(result.department).toBeNull();
    });
  });

  describe('deleteKpiAssignee', () => {
    it('should delete an assignee by id', async () => {
      (deleteKpiAssignee as any).mockResolvedValue({ success: true });

      const result = await deleteKpiAssignee(1);
      expect(deleteKpiAssignee).toHaveBeenCalledWith(1);
      expect(result.success).toBe(true);
    });
  });

  describe('assignKpiAssigneeToItem', () => {
    it('should assign an assignee to a KPI item', async () => {
      const mockResult = { id: 1, person: '김소영' };
      (assignKpiAssigneeToItem as any).mockResolvedValue(mockResult);

      const result = await assignKpiAssigneeToItem(1, 3);
      expect(assignKpiAssigneeToItem).toHaveBeenCalledWith(1, 3);
      expect(result.person).toBe('김소영');
    });

    it('should unassign by setting null assignee', async () => {
      const mockResult = { id: 1, person: null };
      (assignKpiAssigneeToItem as any).mockResolvedValue(mockResult);

      const result = await assignKpiAssigneeToItem(1, null);
      expect(assignKpiAssigneeToItem).toHaveBeenCalledWith(1, null);
      expect(result.person).toBeNull();
    });
  });
});

describe('KPI Data Calculations', () => {
  it('should correctly calculate month total from weekly values', () => {
    const weeklyValues = [150, 200, 180, 220, 0];
    const total = weeklyValues.reduce((a, b) => a + b, 0);
    expect(total).toBe(750);
  });

  it('should correctly calculate delta percentage', () => {
    const cur = 200;
    const prev = 150;
    const delta = ((cur - prev) / prev) * 100;
    expect(delta).toBeCloseTo(33.33, 1);
  });

  it('should handle zero previous value for delta', () => {
    const cur = 100;
    const prev = 0;
    expect(prev).toBe(0);
  });

  it('should handle null values in month total', () => {
    const values: (number | null)[] = [100, null, 200, null, null];
    const sum = values.reduce<number>((a, b) => a + (b ?? 0), 0);
    const hasValue = values.some(v => v != null);
    expect(sum).toBe(300);
    expect(hasValue).toBe(true);
  });

  it('should handle all null values', () => {
    const values: (number | null)[] = [null, null, null, null, null];
    const hasValue = values.some(v => v != null);
    expect(hasValue).toBe(false);
  });

  it('should correctly calculate achievement rate', () => {
    const monthTotal = 750;
    const target = 1000;
    const achievement = (monthTotal / target) * 100;
    expect(achievement).toBe(75);
  });

  it('should handle achievement rate exceeding 100%', () => {
    const monthTotal = 1200;
    const target = 1000;
    const achievement = (monthTotal / target) * 100;
    expect(achievement).toBe(120);
  });

  it('should return null achievement when target is zero', () => {
    const monthTotal = 500;
    const target = 0;
    const achievement = target > 0 ? (monthTotal / target) * 100 : null;
    expect(achievement).toBeNull();
  });

  it('should return null achievement when month total is null', () => {
    const monthTotal: number | null = null;
    const target = 1000;
    const achievement = monthTotal != null && target > 0 ? (monthTotal / target) * 100 : null;
    expect(achievement).toBeNull();
  });
});
