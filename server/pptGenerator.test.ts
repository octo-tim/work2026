import { describe, it, expect } from 'vitest';
import { generateIndividualPPT, generateTeamPPT, generateWeeklyIndividualPPT, generateWeeklyTeamPPT } from './pptGenerator';

// 테스트용 개인 보고서 데이터
const sampleIndividualContent = {
  kpiOverview: {
    totalTasks: 3,
    totalIndicators: 5,
    indicatorsWithTarget: 4,
    avgAchievementRate: 85,
    achieved: 2,
    nearTarget: 1,
    belowTarget: 1,
    categoryAchievements: [
      { category: '영업', avgRate: 92, count: 3 },
      { category: '관리', avgRate: 78, count: 2 },
    ],
  },
  taskDetails: [
    {
      category: '영업',
      task: '신규 고객 발굴',
      department: '영업1팀',
      previousEvaluation: '전월 목표 대비 110% 달성. 주요 고객 3건 확보.',
      currentPlan: '금월 신규 고객 5건 확보 목표. 온라인 마케팅 강화.',
      execution: '현재 3건 진행 중. 2건 계약 완료.',
      indicators: [
        {
          name: '신규 고객 수',
          unit: '건',
          previousActual: 3,
          monthlyTarget: 5,
          monthlyTotal: 3,
          achievementRate: 60,
          weeklyRecords: [
            { week: 1, value: 1 },
            { week: 2, value: 2 },
          ],
        },
        {
          name: '매출액',
          unit: '만원',
          previousActual: 5000,
          monthlyTarget: 6000,
          monthlyTotal: 5500,
          achievementRate: 92,
        },
      ],
    },
    {
      category: '관리',
      task: '팀 교육 프로그램 운영',
      department: '인사팀',
      previousEvaluation: '교육 만족도 4.2/5.0',
      currentPlan: '신입사원 온보딩 프로그램 개선',
      execution: '프로그램 설계 완료, 시범 운영 중',
      indicators: [
        {
          name: '교육 이수율',
          unit: '%',
          previousActual: 85,
          monthlyTarget: 95,
          monthlyTotal: 90,
          achievementRate: 95,
        },
      ],
    },
  ],
  period: '2026년 3월 1주차',
  generatedAt: '2026-03-16T10:00:00.000Z',
};

// 테스트용 팀 보고서 데이터
const sampleTeamContent = {
  teamName: '영업1팀',
  kpiOverview: {
    totalTasks: 6,
    totalIndicators: 10,
    indicatorsWithTarget: 8,
    avgAchievementRate: 88,
    achieved: 4,
    nearTarget: 3,
    belowTarget: 1,
    totalMembers: 3,
    memberAchievements: [
      { name: '김철수', avgRate: 95, taskCount: 2, indicatorCount: 4 },
      { name: '이영희', avgRate: 85, taskCount: 2, indicatorCount: 3 },
      { name: '박민수', avgRate: 82, taskCount: 2, indicatorCount: 3 },
    ],
    categoryAchievements: [
      { category: '영업', avgRate: 90, count: 6 },
      { category: '관리', avgRate: 85, count: 4 },
    ],
  },
  memberDetails: [
    {
      name: '김철수',
      taskDetails: [
        {
          category: '영업',
          task: '대형 고객 관리',
          department: '영업1팀',
          previousEvaluation: '주요 고객 3건 유지',
          currentPlan: '기존 고객 업셀링 추진',
          execution: '2건 업셀링 제안 완료',
          indicators: [
            {
              name: '고객 유지율',
              unit: '%',
              previousActual: 95,
              monthlyTarget: 98,
              monthlyTotal: 97,
              achievementRate: 99,
            },
          ],
        },
      ],
    },
    {
      name: '이영희',
      taskDetails: [
        {
          category: '영업',
          task: '신규 시장 개척',
          department: '영업1팀',
          previousEvaluation: '해외 시장 조사 완료',
          currentPlan: '동남아 시장 진출 계획 수립',
          execution: '베트남, 태국 파트너 미팅 진행',
          indicators: [
            {
              name: '파트너 미팅',
              unit: '건',
              previousActual: 2,
              monthlyTarget: 5,
              monthlyTotal: 3,
              achievementRate: 60,
            },
          ],
        },
      ],
    },
  ],
  period: '2026년 3월 1주차',
  generatedAt: '2026-03-16T10:00:00.000Z',
};

describe('PPT Generator', () => {
  describe('generateIndividualPPT', () => {
    it('개인 보고서 PPT를 정상적으로 생성해야 한다', () => {
      const pptx = generateIndividualPPT(
        '[주간] 홍길동 - 2026년 3월 1주차',
        '홍길동',
        sampleIndividualContent,
      );

      expect(pptx).toBeDefined();
      // pptxgenjs 인스턴스 확인
      expect(pptx.title).toBe('[주간] 홍길동 - 2026년 3월 1주차');
      expect(pptx.author).toBe('(주)옥토아이앤씨 업무관리 시스템');
    });

    it('요약/계획/이슈가 있으면 종합 의견 슬라이드가 추가되어야 한다', () => {
      const pptx = generateIndividualPPT(
        '[주간] 홍길동 - 2026년 3월 1주차',
        '홍길동',
        sampleIndividualContent,
        '이번 주 전체적으로 양호한 실적',
        '다음 주 고객 미팅 3건 예정',
        '인력 부족 이슈',
      );

      expect(pptx).toBeDefined();
      expect(pptx.title).toBe('[주간] 홍길동 - 2026년 3월 1주차');
    });

    it('업무가 없는 경우에도 정상적으로 생성되어야 한다', () => {
      const emptyContent = {
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
        generatedAt: '2026-03-16T10:00:00.000Z',
      };

      const pptx = generateIndividualPPT(
        '[월간] 홍길동 - 2026년 3월',
        '홍길동',
        emptyContent,
      );

      expect(pptx).toBeDefined();
    });

    it('PPT를 Buffer로 변환할 수 있어야 한다', async () => {
      const pptx = generateIndividualPPT(
        '[주간] 홍길동 - 2026년 3월 1주차',
        '홍길동',
        sampleIndividualContent,
      );

      const buffer = await pptx.write({ outputType: 'nodebuffer' });
      expect(buffer).toBeDefined();
      expect(buffer).toBeInstanceOf(Buffer);
      // PPTX 파일은 ZIP 형식이므로 PK 시그니처로 시작해야 함
      const buf = buffer as Buffer;
      expect(buf[0]).toBe(0x50); // 'P'
      expect(buf[1]).toBe(0x4B); // 'K'
    });
  });

  describe('generateTeamPPT', () => {
    it('팀 보고서 PPT를 정상적으로 생성해야 한다', () => {
      const pptx = generateTeamPPT(
        '[주간] 영업1팀 - 2026년 3월 1주차',
        '영업1팀',
        sampleTeamContent,
      );

      expect(pptx).toBeDefined();
      expect(pptx.title).toBe('[주간] 영업1팀 - 2026년 3월 1주차');
      expect(pptx.author).toBe('(주)옥토아이앤씨 업무관리 시스템');
    });

    it('요약/계획/이슈가 있으면 종합 의견 슬라이드가 추가되어야 한다', () => {
      const pptx = generateTeamPPT(
        '[주간] 영업1팀 - 2026년 3월 1주차',
        '영업1팀',
        sampleTeamContent,
        '팀 전체 달성률 양호',
        '다음 주 팀 워크숍 예정',
        '신규 인력 채용 필요',
      );

      expect(pptx).toBeDefined();
    });

    it('팀원이 없는 경우에도 정상적으로 생성되어야 한다', () => {
      const emptyTeamContent = {
        teamName: '빈 팀',
        kpiOverview: {
          totalTasks: 0,
          totalIndicators: 0,
          indicatorsWithTarget: 0,
          avgAchievementRate: 0,
          achieved: 0,
          nearTarget: 0,
          belowTarget: 0,
          totalMembers: 0,
          memberAchievements: [],
          categoryAchievements: [],
        },
        memberDetails: [],
        period: '2026년 3월',
        generatedAt: '2026-03-16T10:00:00.000Z',
      };

      const pptx = generateTeamPPT(
        '[월간] 빈 팀 - 2026년 3월',
        '빈 팀',
        emptyTeamContent,
      );

      expect(pptx).toBeDefined();
    });

    it('팀 PPT를 Buffer로 변환할 수 있어야 한다', async () => {
      const pptx = generateTeamPPT(
        '[주간] 영업1팀 - 2026년 3월 1주차',
        '영업1팀',
        sampleTeamContent,
      );

      const buffer = await pptx.write({ outputType: 'nodebuffer' });
      expect(buffer).toBeDefined();
      expect(buffer).toBeInstanceOf(Buffer);
      const buf = buffer as Buffer;
      expect(buf[0]).toBe(0x50); // 'P'
      expect(buf[1]).toBe(0x4B); // 'K'
    });
  });

  describe('generateWeeklyIndividualPPT', () => {
    const weeklyIndividualContent = {
      kpiOverview: sampleIndividualContent.kpiOverview,
      weeklyTasks: [
        {
          id: 1,
          title: '신규 고객 미팅',
          assignee: '홍길동',
          department: '영업1팀',
          status: 'completed',
          priority: 'high',
          progress: 100,
          dueDate: '2026-03-15',
          createdAt: '2026-03-10T09:00:00.000Z',
          updatedAt: '2026-03-15T17:00:00.000Z',
          progressLogs: [{ content: '미팅 완료, 계약 진행 예정', createdAt: '2026-03-15T17:00:00.000Z' }],
        },
        {
          id: 2,
          title: '제안서 작성',
          assignee: '홍길동',
          department: '영업1팀',
          status: 'in_progress',
          priority: 'medium',
          progress: 60,
          dueDate: '2026-03-20',
          createdAt: '2026-03-11T09:00:00.000Z',
          updatedAt: '2026-03-14T15:00:00.000Z',
          progressLogs: [{ content: '초안 작성 완료', createdAt: '2026-03-14T15:00:00.000Z' }],
        },
        {
          id: 3,
          title: '시장 조사 보고서',
          assignee: '홍길동',
          department: '영업1팀',
          status: 'pending',
          priority: 'low',
          progress: 0,
          dueDate: null,
          createdAt: '2026-03-12T09:00:00.000Z',
          updatedAt: '2026-03-12T09:00:00.000Z',
          progressLogs: [],
        },
      ],
      weeklyTaskSummary: {
        total: 3,
        completed: 1,
        inProgress: 1,
        pending: 1,
        completionRate: 33,
      },
      period: '2026년 3월 2주차',
      generatedAt: '2026-03-16T10:00:00.000Z',
    };

    it('주간 개인 보고서 PPT를 정상적으로 생성해야 한다', () => {
      const pptx = generateWeeklyIndividualPPT(
        '[주간] 홍길동 - 2026년 3월 2주차',
        '홍길동',
        weeklyIndividualContent,
      );
      expect(pptx).toBeDefined();
      expect(pptx.title).toBe('[주간] 홍길동 - 2026년 3월 2주차');
      expect(pptx.author).toBe('(주)옥토아이앤씨 업무관리 시스템');
    });

    it('업무가 없는 경우에도 정상 생성되어야 한다', () => {
      const emptyContent = {
        ...weeklyIndividualContent,
        weeklyTasks: [],
        weeklyTaskSummary: { total: 0, completed: 0, inProgress: 0, pending: 0, completionRate: 0 },
      };
      const pptx = generateWeeklyIndividualPPT('[주간] 홍길동', '홍길동', emptyContent);
      expect(pptx).toBeDefined();
    });

    it('주간 개인 PPT를 Buffer로 변환할 수 있어야 한다', async () => {
      const pptx = generateWeeklyIndividualPPT(
        '[주간] 홍길동 - 2026년 3월 2주차',
        '홍길동',
        weeklyIndividualContent,
      );
      const buffer = await pptx.write({ outputType: 'nodebuffer' });
      expect(buffer).toBeDefined();
      expect(buffer).toBeInstanceOf(Buffer);
      const buf = buffer as Buffer;
      expect(buf[0]).toBe(0x50);
      expect(buf[1]).toBe(0x4B);
    });
  });

  describe('generateWeeklyTeamPPT', () => {
    const weeklyTeamContent = {
      teamName: '영업1팀',
      kpiOverview: sampleTeamContent.kpiOverview,
      memberWeeklyTasks: [
        {
          name: '김철수',
          tasks: [
            {
              id: 1,
              title: '대형 고객 미팅',
              assignee: '김철수',
              department: '영업1팀',
              status: 'completed',
              priority: 'high',
              progress: 100,
              dueDate: '2026-03-15',
              createdAt: '2026-03-10T09:00:00.000Z',
              updatedAt: '2026-03-15T17:00:00.000Z',
              progressLogs: [{ content: '미팅 완료', createdAt: '2026-03-15T17:00:00.000Z' }],
            },
          ],
          summary: { total: 1, completed: 1, inProgress: 0, pending: 0, completionRate: 100 },
        },
        {
          name: '이영희',
          tasks: [
            {
              id: 2,
              title: '시장 조사',
              assignee: '이영희',
              department: '영업1팀',
              status: 'in_progress',
              priority: 'medium',
              progress: 50,
              dueDate: '2026-03-20',
              createdAt: '2026-03-11T09:00:00.000Z',
              updatedAt: '2026-03-14T15:00:00.000Z',
              progressLogs: [],
            },
          ],
          summary: { total: 1, completed: 0, inProgress: 1, pending: 0, completionRate: 0 },
        },
      ],
      period: '2026년 3월 2주차',
      generatedAt: '2026-03-16T10:00:00.000Z',
    };

    it('주간 팀 보고서 PPT를 정상적으로 생성해야 한다', () => {
      const pptx = generateWeeklyTeamPPT(
        '[주간] 영업1팀 - 2026년 3월 2주차',
        '영업1팀',
        weeklyTeamContent,
      );
      expect(pptx).toBeDefined();
      expect(pptx.title).toBe('[주간] 영업1팀 - 2026년 3월 2주차');
    });

    it('팀원이 없는 경우에도 정상 생성되어야 한다', () => {
      const emptyTeamContent = {
        ...weeklyTeamContent,
        memberWeeklyTasks: [],
      };
      const pptx = generateWeeklyTeamPPT('[주간] 빈 팀', '빈 팀', emptyTeamContent);
      expect(pptx).toBeDefined();
    });

    it('주간 팀 PPT를 Buffer로 변환할 수 있어야 한다', async () => {
      const pptx = generateWeeklyTeamPPT(
        '[주간] 영업1팀 - 2026년 3월 2주차',
        '영업1팀',
        weeklyTeamContent,
      );
      const buffer = await pptx.write({ outputType: 'nodebuffer' });
      expect(buffer).toBeDefined();
      expect(buffer).toBeInstanceOf(Buffer);
      const buf = buffer as Buffer;
      expect(buf[0]).toBe(0x50);
      expect(buf[1]).toBe(0x4B);
    });
  });

  describe('Edge cases', () => {
    it('지표가 없는 업무도 정상 처리되어야 한다', () => {
      const contentWithNoIndicators = {
        ...sampleIndividualContent,
        taskDetails: [
          {
            category: '기타',
            task: '지표 없는 업무',
            department: '관리팀',
            previousEvaluation: '평가 내용',
            currentPlan: '계획 내용',
            execution: '실행 내용',
            indicators: [],
          },
        ],
      };

      const pptx = generateIndividualPPT(
        '테스트 보고서',
        '테스트',
        contentWithNoIndicators,
      );

      expect(pptx).toBeDefined();
    });

    it('빈 문자열 내용도 정상 처리되어야 한다', () => {
      const contentWithEmptyStrings = {
        ...sampleIndividualContent,
        taskDetails: [
          {
            category: '영업',
            task: '업무명',
            department: '',
            previousEvaluation: '',
            currentPlan: '',
            execution: '',
            indicators: [
              {
                name: '지표',
                unit: '건',
                previousActual: 0,
                monthlyTarget: 0,
                monthlyTotal: 0,
                achievementRate: 0,
              },
            ],
          },
        ],
      };

      const pptx = generateIndividualPPT(
        '테스트 보고서',
        '테스트',
        contentWithEmptyStrings,
      );

      expect(pptx).toBeDefined();
    });

    it('매우 긴 텍스트도 정상 처리되어야 한다', () => {
      const longText = '가'.repeat(500);
      const contentWithLongText = {
        ...sampleIndividualContent,
        taskDetails: [
          {
            category: '영업',
            task: longText,
            department: '팀',
            previousEvaluation: longText,
            currentPlan: longText,
            execution: longText,
            indicators: [],
          },
        ],
      };

      const pptx = generateIndividualPPT(
        '테스트 보고서',
        '테스트',
        contentWithLongText,
      );

      expect(pptx).toBeDefined();
    });
  });
});
