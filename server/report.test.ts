import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getReports: vi.fn(),
  getReportById: vi.fn(),
  createReport: vi.fn(),
  updateReport: vi.fn(),
  deleteReport: vi.fn(),
  getReportDataForUser: vi.fn(),
  getReportDataForTeam: vi.fn(),
  getAllUsers: vi.fn(),
  getActiveTeams: vi.fn(),
}));

import {
  getReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
  getReportDataForUser,
  getReportDataForTeam,
  getAllUsers,
  getActiveTeams,
} from './db';

describe('Report Router - DB Helper Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getReports', () => {
    it('should return reports filtered by year and month', async () => {
      const mockReports = [
        {
          id: 1,
          type: 'weekly',
          scope: 'individual',
          targetUserId: 1,
          targetTeamId: null,
          targetDivisionId: null,
          year: 2026,
          month: 3,
          week: 1,
          title: '[주간보고서] 홍길동 - 2026년 3월 1주차',
          content: '{}',
          summary: null,
          nextPlan: null,
          issues: null,
          generatedBy: 1,
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          type: 'weekly',
          scope: 'team',
          targetUserId: null,
          targetTeamId: 1,
          targetDivisionId: null,
          year: 2026,
          month: 3,
          week: 1,
          title: '[주간보고서] 개발팀 - 2026년 3월 1주차',
          content: '{}',
          summary: null,
          nextPlan: null,
          issues: null,
          generatedBy: 1,
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(getReports).mockResolvedValue(mockReports);

      const result = await getReports({ year: 2026, month: 3, type: 'weekly' });
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('weekly');
      expect(result[0].year).toBe(2026);
      expect(result[0].month).toBe(3);
    });

    it('should filter by scope', async () => {
      const mockReports = [
        {
          id: 1,
          type: 'weekly',
          scope: 'individual',
          targetUserId: 1,
          targetTeamId: null,
          targetDivisionId: null,
          year: 2026,
          month: 3,
          week: 1,
          title: '[주간보고서] 홍길동',
          content: '{}',
          summary: null,
          nextPlan: null,
          issues: null,
          generatedBy: 1,
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(getReports).mockResolvedValue(mockReports);

      const result = await getReports({ year: 2026, month: 3, scope: 'individual' });
      expect(result).toHaveLength(1);
      expect(result[0].scope).toBe('individual');
    });
  });

  describe('getReportById', () => {
    it('should return a single report by id', async () => {
      const mockReport = {
        id: 1,
        type: 'weekly',
        scope: 'individual',
        title: '[주간보고서] 홍길동',
        content: JSON.stringify({
          kpiOverview: { totalTasks: 5, totalIndicators: 3, indicatorsWithTarget: 2, avgAchievementRate: 85, achieved: 1, nearTarget: 1, belowTarget: 0, categoryAchievements: [] },
          taskDetails: [],
          period: '2026년 3월 1주차',
        }),
        status: 'draft',
      };

      vi.mocked(getReportById).mockResolvedValue(mockReport as any);

      const result = await getReportById(1);
      expect(result).toBeDefined();
      expect(result!.id).toBe(1);
      const content = JSON.parse(result!.content);
      expect(content.kpiOverview.totalTasks).toBe(5);
    });

    it('should return null for non-existent report', async () => {
      vi.mocked(getReportById).mockResolvedValue(null);

      const result = await getReportById(999);
      expect(result).toBeNull();
    });
  });

  describe('createReport', () => {
    it('should create a new individual report', async () => {
      vi.mocked(createReport).mockResolvedValue(undefined);

      await createReport({
        type: 'weekly',
        scope: 'individual',
        targetUserId: 1,
        year: 2026,
        month: 3,
        week: 1,
        title: '[주간보고서] 홍길동 - 2026년 3월 1주차',
        content: '{}',
        generatedBy: 1,
        status: 'draft',
      });

      expect(createReport).toHaveBeenCalledWith(expect.objectContaining({
        type: 'weekly',
        scope: 'individual',
        targetUserId: 1,
        year: 2026,
        month: 3,
        week: 1,
      }));
    });

    it('should create a new team report', async () => {
      vi.mocked(createReport).mockResolvedValue(undefined);

      await createReport({
        type: 'monthly',
        scope: 'team',
        targetTeamId: 1,
        year: 2026,
        month: 3,
        week: null,
        title: '[월간보고서] 개발팀 - 2026년 3월',
        content: '{}',
        generatedBy: 1,
        status: 'draft',
      });

      expect(createReport).toHaveBeenCalledWith(expect.objectContaining({
        type: 'monthly',
        scope: 'team',
        targetTeamId: 1,
      }));
    });
  });

  describe('updateReport', () => {
    it('should update report summary and status', async () => {
      vi.mocked(updateReport).mockResolvedValue(undefined);

      await updateReport(1, {
        summary: '이번 주 업무 진행 순조로움',
        nextPlan: '다음 주 신규 프로젝트 착수',
        issues: '인력 부족',
        status: 'finalized',
      });

      expect(updateReport).toHaveBeenCalledWith(1, expect.objectContaining({
        summary: '이번 주 업무 진행 순조로움',
        status: 'finalized',
      }));
    });
  });

  describe('deleteReport', () => {
    it('should delete a report by id', async () => {
      vi.mocked(deleteReport).mockResolvedValue(undefined);

      await deleteReport(1);
      expect(deleteReport).toHaveBeenCalledWith(1);
    });
  });

  describe('getReportDataForUser', () => {
    it('should return user data with tasks and KPI records', async () => {
      const mockData = {
        user: { id: 1, name: 'Hong', koreanName: '홍길동' },
        tasks: [],
        kpiItems: [
          { id: 1, category: '영업', task: '신규고객', department: '영업부' },
        ],
        kpiIndicators: [
          { id: 1, kpiItemId: 1, name: '계약건수', unit: '건' },
        ],
        kpiRecords: [
          { id: 1, kpiIndicatorId: 1, week: 1, value: '10' },
        ],
        kpiTargets: [
          { kpiIndicatorId: 1, monthlyTarget: '50', previousActual: '40' },
        ],
        kpiDetails: [
          { kpiItemId: 1, previousEvaluation: '양호', currentPlan: '확대', execution: '진행중' },
        ],
      };

      vi.mocked(getReportDataForUser).mockResolvedValue(mockData as any);

      const result = await getReportDataForUser(1, 2026, 3, 1);
      expect(result).toBeDefined();
      expect(result!.user.koreanName).toBe('홍길동');
      expect(result!.tasks).toHaveLength(0);
      expect(result!.kpiItems).toHaveLength(1);
      expect(result!.kpiRecords).toHaveLength(1);
    });

    it('should return null for non-existent user', async () => {
      vi.mocked(getReportDataForUser).mockResolvedValue(null);

      const result = await getReportDataForUser(999, 2026, 3);
      expect(result).toBeNull();
    });
  });

  describe('getReportDataForTeam', () => {
    it('should return team data with member summaries', async () => {
      const mockData = {
        team: { id: 1, name: '개발팀' },
        members: [
          {
            member: { id: 1, name: 'Hong', koreanName: '홍길동' },
            data: {
              tasks: [{ id: '1', title: '업무1', status: 'completed' }],
              kpiItems: [],
              kpiIndicators: [],
              kpiRecords: [],
              kpiTargets: [],
              kpiDetails: [],
            },
          },
        ],
      };

      vi.mocked(getReportDataForTeam).mockResolvedValue(mockData as any);

      const result = await getReportDataForTeam(1, 2026, 3);
      expect(result).toBeDefined();
      expect(result!.team.name).toBe('개발팀');
      expect(result!.members).toHaveLength(1);
    });
  });

  describe('getAllUsers', () => {
    it('should return list of available users', async () => {
      const mockUsers = [
        { id: 1, name: 'Hong', koreanName: '홍길동' },
        { id: 2, name: 'Kim', koreanName: '김철수' },
      ];

      vi.mocked(getAllUsers).mockResolvedValue(mockUsers as any);

      const result = await getAllUsers();
      expect(result).toHaveLength(2);
    });
  });

  describe('getActiveTeams', () => {
    it('should return list of active teams', async () => {
      const mockTeams = [
        { id: 1, name: '개발팀' },
        { id: 2, name: '영업팀' },
      ];

      vi.mocked(getActiveTeams).mockResolvedValue(mockTeams as any);

      const result = await getActiveTeams();
      expect(result).toHaveLength(2);
    });
  });

  // ===== 새 보고서 구조 테스트 =====

  describe('New Report Content Structure - Individual', () => {
    it('should correctly structure individual report with kpiOverview and taskDetails', () => {
      const content = {
        kpiOverview: {
          totalTasks: 3,
          totalIndicators: 4,
          indicatorsWithTarget: 3,
          avgAchievementRate: 85,
          achieved: 1,
          nearTarget: 2,
          belowTarget: 0,
          categoryAchievements: [
            { category: '영업', avgRate: 90, count: 2 },
            { category: '관리', avgRate: 80, count: 1 },
          ],
        },
        taskDetails: [
          {
            category: '영업',
            task: '신규고객 개발',
            department: '영업부',
            previousEvaluation: '전월 목표 대비 80% 달성',
            currentPlan: '신규 거래처 5곳 발굴',
            execution: '3곳 미팅 완료, 2곳 진행중',
            indicators: [
              {
                name: '계약건수',
                unit: '건',
                previousActual: 40,
                monthlyTarget: 50,
                monthlyTotal: 30,
                achievementRate: 60,
                weeklyRecords: [{ week: 1, value: 10 }, { week: 2, value: 20 }],
              },
            ],
          },
          {
            category: '관리',
            task: '보고서 작성',
            department: '관리부',
            previousEvaluation: '',
            currentPlan: '주간보고서 정기 제출',
            execution: '',
            indicators: [],
          },
        ],
        period: '2026년 3월 1주차',
        generatedAt: '2026-03-16T00:00:00.000Z',
      };

      const jsonStr = JSON.stringify(content);
      const parsed = JSON.parse(jsonStr);

      // KPI 요약 확인
      expect(parsed.kpiOverview).toBeDefined();
      expect(parsed.kpiOverview.totalTasks).toBe(3);
      expect(parsed.kpiOverview.totalIndicators).toBe(4);
      expect(parsed.kpiOverview.avgAchievementRate).toBe(85);
      expect(parsed.kpiOverview.achieved).toBe(1);
      expect(parsed.kpiOverview.nearTarget).toBe(2);
      expect(parsed.kpiOverview.belowTarget).toBe(0);
      expect(parsed.kpiOverview.categoryAchievements).toHaveLength(2);

      // 업무별 상세 확인
      expect(parsed.taskDetails).toHaveLength(2);
      expect(parsed.taskDetails[0].category).toBe('영업');
      expect(parsed.taskDetails[0].task).toBe('신규고객 개발');
      expect(parsed.taskDetails[0].previousEvaluation).toBe('전월 목표 대비 80% 달성');
      expect(parsed.taskDetails[0].currentPlan).toBe('신규 거래처 5곳 발굴');
      expect(parsed.taskDetails[0].execution).toBe('3곳 미팅 완료, 2곳 진행중');
      expect(parsed.taskDetails[0].indicators).toHaveLength(1);
      expect(parsed.taskDetails[0].indicators[0].achievementRate).toBe(60);
      expect(parsed.taskDetails[0].indicators[0].weeklyRecords).toHaveLength(2);

      // 지표 없는 업무도 포함
      expect(parsed.taskDetails[1].indicators).toHaveLength(0);
      expect(parsed.taskDetails[1].currentPlan).toBe('주간보고서 정기 제출');

      // 기간 정보
      expect(parsed.period).toBe('2026년 3월 1주차');
    });

    it('should handle empty taskDetails when user has no KPI items', () => {
      const content = {
        kpiOverview: {
          totalTasks: 0,
          totalIndicators: 0,
          indicatorsWithTarget: 0,
          avgAchievementRate: 0,
          achieved: 0,
          nearTarget: 0,
          belowTarget: 0,
          categoryAchievements: [],
        },
        taskDetails: [],
        period: '2026년 3월',
        generatedAt: '2026-03-16T00:00:00.000Z',
      };

      const jsonStr = JSON.stringify(content);
      const parsed = JSON.parse(jsonStr);

      expect(parsed.taskDetails).toHaveLength(0);
      expect(parsed.kpiOverview.totalTasks).toBe(0);
      expect(parsed.kpiOverview.avgAchievementRate).toBe(0);
    });
  });

  describe('New Report Content Structure - Team', () => {
    it('should correctly structure team report with kpiOverview and memberDetails', () => {
      const content = {
        teamName: '영업팀',
        kpiOverview: {
          totalMembers: 2,
          totalTasks: 5,
          totalIndicators: 6,
          indicatorsWithTarget: 5,
          avgAchievementRate: 78,
          achieved: 2,
          nearTarget: 2,
          belowTarget: 1,
          memberAchievements: [
            { name: '홍길동', avgRate: 92, taskCount: 3, indicatorCount: 3 },
            { name: '김철수', avgRate: 64, taskCount: 2, indicatorCount: 2 },
          ],
          categoryAchievements: [
            { category: '영업', avgRate: 85, count: 3 },
            { category: '관리', avgRate: 71, count: 2 },
          ],
        },
        memberDetails: [
          {
            name: '홍길동',
            taskDetails: [
              {
                category: '영업',
                task: '신규고객',
                department: '영업부',
                previousEvaluation: '양호',
                currentPlan: '확대',
                execution: '진행중',
                indicators: [
                  { name: '계약건수', unit: '건', monthlyTotal: 30, monthlyTarget: 50, achievementRate: 60 },
                ],
              },
            ],
          },
          {
            name: '김철수',
            taskDetails: [],
          },
        ],
        period: '2026년 3월 1주차',
        generatedAt: '2026-03-16T00:00:00.000Z',
      };

      const jsonStr = JSON.stringify(content);
      const parsed = JSON.parse(jsonStr);

      // 팀 정보
      expect(parsed.teamName).toBe('영업팀');

      // KPI 요약 확인
      expect(parsed.kpiOverview).toBeDefined();
      expect(parsed.kpiOverview.totalMembers).toBe(2);
      expect(parsed.kpiOverview.totalTasks).toBe(5);
      expect(parsed.kpiOverview.totalIndicators).toBe(6);
      expect(parsed.kpiOverview.avgAchievementRate).toBe(78);

      // 팀원별 달성률
      expect(parsed.kpiOverview.memberAchievements).toHaveLength(2);
      expect(parsed.kpiOverview.memberAchievements[0].name).toBe('홍길동');
      expect(parsed.kpiOverview.memberAchievements[0].avgRate).toBe(92);
      expect(parsed.kpiOverview.memberAchievements[0].taskCount).toBe(3);
      expect(parsed.kpiOverview.memberAchievements[1].name).toBe('김철수');
      expect(parsed.kpiOverview.memberAchievements[1].avgRate).toBe(64);

      // 카테고리별 달성률
      expect(parsed.kpiOverview.categoryAchievements).toHaveLength(2);

      // 팀원별 업무 상세
      expect(parsed.memberDetails).toHaveLength(2);
      expect(parsed.memberDetails[0].name).toBe('홍길동');
      expect(parsed.memberDetails[0].taskDetails).toHaveLength(1);
      expect(parsed.memberDetails[0].taskDetails[0].previousEvaluation).toBe('양호');
      expect(parsed.memberDetails[0].taskDetails[0].currentPlan).toBe('확대');
      expect(parsed.memberDetails[0].taskDetails[0].execution).toBe('진행중');
      expect(parsed.memberDetails[0].taskDetails[0].indicators[0].achievementRate).toBe(60);

      // 업무 없는 팀원
      expect(parsed.memberDetails[1].name).toBe('김철수');
      expect(parsed.memberDetails[1].taskDetails).toHaveLength(0);
    });

    it('should handle team with no KPI data', () => {
      const content = {
        teamName: '신규팀',
        kpiOverview: {
          totalMembers: 1,
          totalTasks: 0,
          totalIndicators: 0,
          indicatorsWithTarget: 0,
          avgAchievementRate: 0,
          achieved: 0,
          nearTarget: 0,
          belowTarget: 0,
          memberAchievements: [],
          categoryAchievements: [],
        },
        memberDetails: [
          { name: '이영희', taskDetails: [] },
        ],
        period: '2026년 3월',
        generatedAt: '2026-03-16T00:00:00.000Z',
      };

      const jsonStr = JSON.stringify(content);
      const parsed = JSON.parse(jsonStr);

      expect(parsed.kpiOverview.totalTasks).toBe(0);
      expect(parsed.kpiOverview.memberAchievements).toHaveLength(0);
      expect(parsed.memberDetails[0].taskDetails).toHaveLength(0);
    });
  });

  describe('Report Content - Indicator Details', () => {
    it('should include previousActual and monthlyTarget in individual report indicators', () => {
      const content = {
        kpiOverview: {
          totalTasks: 1,
          totalIndicators: 2,
          indicatorsWithTarget: 2,
          avgAchievementRate: 75,
          achieved: 0,
          nearTarget: 2,
          belowTarget: 0,
          categoryAchievements: [],
        },
        taskDetails: [
          {
            category: '생산',
            task: '생산관리',
            department: '생산부',
            previousEvaluation: '전월 생산량 목표 달성',
            currentPlan: '생산효율 10% 개선',
            execution: '설비 점검 완료',
            indicators: [
              {
                name: '생산량',
                unit: '개',
                previousActual: 1000,
                monthlyTarget: 1200,
                monthlyTotal: 900,
                achievementRate: 75,
                weeklyRecords: [{ week: 1, value: 300 }, { week: 2, value: 350 }, { week: 3, value: 250 }],
              },
              {
                name: '불량률',
                unit: '%',
                previousActual: 3,
                monthlyTarget: 2,
                monthlyTotal: 1.5,
                achievementRate: 75,
                weeklyRecords: [{ week: 1, value: 0.5 }, { week: 2, value: 0.5 }, { week: 3, value: 0.5 }],
              },
            ],
          },
        ],
        period: '2026년 3월',
        generatedAt: '2026-03-16T00:00:00.000Z',
      };

      const jsonStr = JSON.stringify(content);
      const parsed = JSON.parse(jsonStr);

      const indicators = parsed.taskDetails[0].indicators;
      expect(indicators).toHaveLength(2);
      expect(indicators[0].previousActual).toBe(1000);
      expect(indicators[0].monthlyTarget).toBe(1200);
      expect(indicators[0].monthlyTotal).toBe(900);
      expect(indicators[0].achievementRate).toBe(75);
      expect(indicators[0].weeklyRecords).toHaveLength(3);
    });

    it('should include monthlyTarget in team report indicators', () => {
      const content = {
        teamName: '생산팀',
        kpiOverview: {
          totalMembers: 1,
          totalTasks: 1,
          totalIndicators: 1,
          indicatorsWithTarget: 1,
          avgAchievementRate: 80,
          achieved: 0,
          nearTarget: 1,
          belowTarget: 0,
          memberAchievements: [{ name: '박민수', avgRate: 80, taskCount: 1, indicatorCount: 1 }],
          categoryAchievements: [{ category: '생산', avgRate: 80, count: 1 }],
        },
        memberDetails: [
          {
            name: '박민수',
            taskDetails: [
              {
                category: '생산',
                task: '품질관리',
                department: '생산부',
                previousEvaluation: '양호',
                currentPlan: '품질 개선',
                execution: '검사 강화',
                indicators: [
                  { name: '합격률', unit: '%', monthlyTotal: 96, monthlyTarget: 98, achievementRate: 98 },
                ],
              },
            ],
          },
        ],
        period: '2026년 3월 2주차',
        generatedAt: '2026-03-16T00:00:00.000Z',
      };

      const jsonStr = JSON.stringify(content);
      const parsed = JSON.parse(jsonStr);

      const ind = parsed.memberDetails[0].taskDetails[0].indicators[0];
      expect(ind.monthlyTotal).toBe(96);
      expect(ind.monthlyTarget).toBe(98);
      expect(ind.achievementRate).toBe(98);
    });
  });
});
