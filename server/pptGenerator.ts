/**
 * PPT Generator - 업무보고서 PowerPoint 생성
 * pptxgenjs를 사용하여 개인별/팀별 보고서를 PPT로 변환
 */
import _PptxGenJS from 'pptxgenjs';

// ESM/CJS 호환성 처리 - tsx watch 런타임에서 default export 해석이 다를 수 있음
const PptxGenJS: typeof _PptxGenJS = (_PptxGenJS as any).default || _PptxGenJS;

// 타입 별칭 - namespace 타입은 원본 import를 참조
type PptxInstance = InstanceType<typeof _PptxGenJS>;
type Slide = _PptxGenJS.Slide;
type TableRow = _PptxGenJS.TableRow;

// ===== 색상 팔레트 =====
const COLORS = {
  primary: '4F46E5',      // 인디고
  primaryLight: 'EEF2FF',
  secondary: '6366F1',
  accent: 'F59E0B',       // 앰버
  success: '10B981',      // 에메랄드
  warning: 'F59E0B',
  danger: 'EF4444',       // 레드
  dark: '1E293B',
  text: '334155',
  textLight: '64748B',
  white: 'FFFFFF',
  gray50: 'F8FAFC',
  gray100: 'F1F5F9',
  gray200: 'E2E8F0',
  gray300: 'CBD5E1',
  border: 'E2E8F0',
};

// ===== 타입 정의 =====
interface Indicator {
  name: string;
  unit: string;
  previousActual?: number;
  monthlyTarget: number;
  monthlyTotal: number;
  achievementRate: number;
  weeklyRecords?: Array<{ week: number; value: number }>;
}

interface TaskDetail {
  category: string;
  task: string;
  department: string;
  previousEvaluation: string;
  currentPlan: string;
  execution: string;
  indicators: Indicator[];
}

interface KpiOverview {
  totalTasks: number;
  totalIndicators: number;
  indicatorsWithTarget: number;
  avgAchievementRate: number;
  achieved: number;
  nearTarget: number;
  belowTarget: number;
  categoryAchievements: Array<{ category: string; avgRate: number; count: number }>;
}

interface TeamKpiOverview extends KpiOverview {
  totalMembers: number;
  memberAchievements: Array<{ name: string; avgRate: number; taskCount: number; indicatorCount: number }>;
}

interface MemberDetail {
  name: string;
  taskDetails: TaskDetail[];
}

interface IndividualReportContent {
  kpiOverview: KpiOverview;
  taskDetails: TaskDetail[];
  period: string;
  generatedAt: string;
}

interface TeamReportContent {
  teamName: string;
  kpiOverview: TeamKpiOverview;
  memberDetails: MemberDetail[];
  period: string;
  generatedAt: string;
}

// ===== 주간보고서 타입 =====
interface WeeklyTaskItem {
  id: number;
  title: string;
  assignee: string;
  department: string;
  status: string;
  priority: string;
  progress: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  progressLogs: Array<{ content: string; createdAt: string }>;
}

interface WeeklyTaskSummary {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  completionRate: number;
}

interface MemberWeeklyTasks {
  name: string;
  tasks: WeeklyTaskItem[];
  summary: WeeklyTaskSummary;
}

interface WeeklyIndividualContent {
  kpiOverview: KpiOverview;
  weeklyTasks: WeeklyTaskItem[];
  weeklyTaskSummary: WeeklyTaskSummary;
  period: string;
  generatedAt: string;
}

interface WeeklyTeamContent {
  teamName: string;
  kpiOverview: TeamKpiOverview;
  memberWeeklyTasks: MemberWeeklyTasks[];
  period: string;
  generatedAt: string;
}

// ===== 주간보고서 PPT 생성 =====
export function generateWeeklyIndividualPPT(
  title: string,
  userName: string,
  content: WeeklyIndividualContent,
  summary?: string | null,
  nextPlan?: string | null,
  issues?: string | null,
): PptxInstance {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = '(주)옥토아이앤씨 업무관리 시스템';
  pptx.subject = title;
  pptx.title = title;

  // 1. 표지
  addCoverSlide(pptx, title, userName, content.period);

  // 2. KPI 실적 요약
  addKpiOverviewSlide(pptx, content.kpiOverview, content.period);

  // 3. 주간 업무 요약
  addWeeklyTaskSummarySlide(pptx, content.weeklyTaskSummary, content.period);

  // 4. 업무 리스트 (업무 10건씩 1슬라이드)
  const tasksPerSlide = 10;
  for (let i = 0; i < content.weeklyTasks.length; i += tasksPerSlide) {
    const chunk = content.weeklyTasks.slice(i, i + tasksPerSlide);
    addWeeklyTaskListSlide(pptx, chunk, i + 1, content.weeklyTasks.length, content.period);
  }

  // 5. 종합 의견
  if (summary || nextPlan || issues) {
    addSummarySlide(pptx, summary, nextPlan, issues, content.period);
  }

  return pptx;
}

export function generateWeeklyTeamPPT(
  title: string,
  teamName: string,
  content: WeeklyTeamContent,
  summary?: string | null,
  nextPlan?: string | null,
  issues?: string | null,
): PptxInstance {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = '(주)옥토아이앤씨 업무관리 시스템';
  pptx.subject = title;
  pptx.title = title;

  // 1. 표지
  addCoverSlide(pptx, title, teamName, content.period);

  // 2. 팀 KPI 실적 요약
  addTeamKpiOverviewSlide(pptx, content.kpiOverview, content.period);

  // 3. 팀원별 업무 요약
  content.memberWeeklyTasks.forEach(member => {
    // 팀원 구분 슬라이드
    addMemberDividerSlide(pptx, member.name, member.tasks.length, content.period);
    // 업무 리스트
    const tasksPerSlide = 10;
    for (let i = 0; i < member.tasks.length; i += tasksPerSlide) {
      const chunk = member.tasks.slice(i, i + tasksPerSlide);
      addWeeklyTaskListSlide(pptx, chunk, i + 1, member.tasks.length, content.period, member.name);
    }
  });

  // 4. 종합 의견
  if (summary || nextPlan || issues) {
    addSummarySlide(pptx, summary, nextPlan, issues, content.period);
  }

  return pptx;
}

// ===== 유틸리티 함수 =====
function getAchievementColor(rate: number): string {
  if (rate >= 100) return COLORS.success;
  if (rate >= 70) return COLORS.warning;
  return COLORS.danger;
}

function formatNumber(num: number): string {
  return num.toLocaleString('ko-KR');
}

function truncateText(text: string, maxLen: number): string {
  if (!text) return '-';
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 2) + '..';
}

// ===== 개인 보고서 PPT 생성 =====
export function generateIndividualPPT(
  title: string,
  userName: string,
  content: IndividualReportContent,
  summary?: string | null,
  nextPlan?: string | null,
  issues?: string | null,
): PptxInstance {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 16:9
  pptx.author = '(주)옥토아이앤씨 업무관리 시스템';
  pptx.subject = title;
  pptx.title = title;

  // 1. 표지 슬라이드
  addCoverSlide(pptx, title, userName, content.period);

  // 2. KPI 실적 요약 슬라이드
  addKpiOverviewSlide(pptx, content.kpiOverview, content.period);

  // 3. 카테고리별 달성률 슬라이드
  if (content.kpiOverview.categoryAchievements.length > 0) {
    addCategoryAchievementSlide(pptx, content.kpiOverview.categoryAchievements, content.period);
  }

  // 4. 업무별 상세 슬라이드 (각 업무마다 1슬라이드)
  content.taskDetails.forEach((task, idx) => {
    addTaskDetailSlide(pptx, task, idx + 1, content.taskDetails.length, content.period);
  });

  // 5. 종합 의견 슬라이드 (요약/계획/이슈가 있는 경우)
  if (summary || nextPlan || issues) {
    addSummarySlide(pptx, summary, nextPlan, issues, content.period);
  }

  return pptx;
}

// ===== 팀 보고서 PPT 생성 =====
export function generateTeamPPT(
  title: string,
  teamName: string,
  content: TeamReportContent,
  summary?: string | null,
  nextPlan?: string | null,
  issues?: string | null,
): PptxInstance {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = '(주)옥토아이앤씨 업무관리 시스템';
  pptx.subject = title;
  pptx.title = title;

  // 1. 표지 슬라이드
  addCoverSlide(pptx, title, teamName, content.period);

  // 2. 팀 KPI 실적 요약 슬라이드
  addTeamKpiOverviewSlide(pptx, content.kpiOverview, content.period);

  // 3. 팀원별 달성률 슬라이드
  if (content.kpiOverview.memberAchievements.length > 0) {
    addMemberAchievementSlide(pptx, content.kpiOverview.memberAchievements, content.period);
  }

  // 4. 카테고리별 달성률 슬라이드
  if (content.kpiOverview.categoryAchievements.length > 0) {
    addCategoryAchievementSlide(pptx, content.kpiOverview.categoryAchievements, content.period);
  }

  // 5. 팀원별 업무 상세 슬라이드
  content.memberDetails.forEach(member => {
    if (member.taskDetails.length > 0) {
      // 팀원 구분 슬라이드
      addMemberDividerSlide(pptx, member.name, member.taskDetails.length, content.period);
      // 각 업무 상세
      member.taskDetails.forEach((task, idx) => {
        addTaskDetailSlide(pptx, task, idx + 1, member.taskDetails.length, content.period, member.name);
      });
    }
  });

  // 6. 종합 의견 슬라이드
  if (summary || nextPlan || issues) {
    addSummarySlide(pptx, summary, nextPlan, issues, content.period);
  }

  return pptx;
}

// ===== 슬라이드 생성 함수들 =====

function addSlideHeader(slide: Slide, period: string, subtitle?: string) {
  // 상단 바
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: 0.06,
    fill: { color: COLORS.primary },
  });
  // 기간 표시
  slide.addText(period, {
    x: 10.5, y: 0.15, w: 2.8, h: 0.3,
    fontSize: 9, color: COLORS.textLight, align: 'right',
    fontFace: 'Malgun Gothic',
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 0.15, w: 6, h: 0.3,
      fontSize: 9, color: COLORS.textLight, align: 'left',
      fontFace: 'Malgun Gothic',
    });
  }
  // 하단 바
  slide.addShape('rect', {
    x: 0, y: 7.44, w: '100%', h: 0.06,
    fill: { color: COLORS.primary },
  });
  // 하단 회사명
  slide.addText('(주)옥토아이앤씨', {
    x: 0.5, y: 7.1, w: 3, h: 0.3,
    fontSize: 8, color: COLORS.textLight, align: 'left',
    fontFace: 'Malgun Gothic',
  });
}

function addCoverSlide(pptx: PptxInstance, title: string, name: string, period: string) {
  const slide = pptx.addSlide();
  slide.background = { fill: COLORS.white };

  // 상단 장식 바
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: 0.15,
    fill: { color: COLORS.primary },
  });

  // 회사명
  slide.addText('(주)옥토아이앤씨', {
    x: 0.5, y: 1.5, w: 12.3, h: 0.5,
    fontSize: 14, color: COLORS.textLight, align: 'center',
    fontFace: 'Malgun Gothic',
  });

  // 보고서 제목
  slide.addText(title, {
    x: 0.5, y: 2.2, w: 12.3, h: 1.0,
    fontSize: 32, color: COLORS.dark, align: 'center',
    fontFace: 'Malgun Gothic', bold: true,
  });

  // 구분선
  slide.addShape('rect', {
    x: 5.0, y: 3.4, w: 3.3, h: 0.04,
    fill: { color: COLORS.primary },
  });

  // 담당자/팀명
  slide.addText(name, {
    x: 0.5, y: 3.8, w: 12.3, h: 0.5,
    fontSize: 18, color: COLORS.secondary, align: 'center',
    fontFace: 'Malgun Gothic',
  });

  // 기간
  slide.addText(period, {
    x: 0.5, y: 4.5, w: 12.3, h: 0.5,
    fontSize: 14, color: COLORS.textLight, align: 'center',
    fontFace: 'Malgun Gothic',
  });

  // 생성일
  slide.addText(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, {
    x: 0.5, y: 5.5, w: 12.3, h: 0.4,
    fontSize: 10, color: COLORS.textLight, align: 'center',
    fontFace: 'Malgun Gothic',
  });

  // 하단 장식 바
  slide.addShape('rect', {
    x: 0, y: 7.35, w: '100%', h: 0.15,
    fill: { color: COLORS.primary },
  });
}

function addKpiOverviewSlide(pptx: PptxInstance, overview: KpiOverview, period: string) {
  const slide = pptx.addSlide();
  slide.background = { fill: COLORS.white };
  addSlideHeader(slide, period);

  // 제목
  slide.addText('KPI 실적 요약', {
    x: 0.5, y: 0.5, w: 6, h: 0.5,
    fontSize: 22, color: COLORS.dark, bold: true,
    fontFace: 'Malgun Gothic',
  });

  // 평균 달성률 큰 숫자
  slide.addShape('roundRect', {
    x: 0.5, y: 1.2, w: 3.5, h: 2.2,
    fill: { color: COLORS.primaryLight },
    rectRadius: 0.1,
  });
  slide.addText('평균 달성률', {
    x: 0.5, y: 1.35, w: 3.5, h: 0.4,
    fontSize: 12, color: COLORS.textLight, align: 'center',
    fontFace: 'Malgun Gothic',
  });
  slide.addText(`${overview.avgAchievementRate}%`, {
    x: 0.5, y: 1.7, w: 3.5, h: 1.2,
    fontSize: 48, color: getAchievementColor(overview.avgAchievementRate), align: 'center',
    fontFace: 'Malgun Gothic', bold: true,
  });
  slide.addText(`${overview.indicatorsWithTarget}개 지표 기준`, {
    x: 0.5, y: 2.9, w: 3.5, h: 0.35,
    fontSize: 10, color: COLORS.textLight, align: 'center',
    fontFace: 'Malgun Gothic',
  });

  // 달성/근접/미달 카드
  const statusCards = [
    { label: '달성 (≥100%)', value: overview.achieved, color: COLORS.success },
    { label: '근접 (70~99%)', value: overview.nearTarget, color: COLORS.warning },
    { label: '미달 (<70%)', value: overview.belowTarget, color: COLORS.danger },
  ];

  statusCards.forEach((card, i) => {
    const x = 4.5 + i * 3.0;
    slide.addShape('roundRect', {
      x, y: 1.2, w: 2.6, h: 2.2,
      fill: { color: COLORS.gray50 },
      rectRadius: 0.1,
      line: { color: card.color, width: 2 },
    });
    slide.addText(card.label, {
      x, y: 1.4, w: 2.6, h: 0.35,
      fontSize: 11, color: COLORS.textLight, align: 'center',
      fontFace: 'Malgun Gothic',
    });
    slide.addText(`${card.value}`, {
      x, y: 1.8, w: 2.6, h: 1.0,
      fontSize: 36, color: card.color, align: 'center',
      fontFace: 'Malgun Gothic', bold: true,
    });
    slide.addText('개 지표', {
      x, y: 2.8, w: 2.6, h: 0.35,
      fontSize: 10, color: COLORS.textLight, align: 'center',
      fontFace: 'Malgun Gothic',
    });
  });

  // 하단 요약 테이블
  const tableRows: TableRow[] = [
    [
      { text: '구분', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 10, fontFace: 'Malgun Gothic', align: 'center' } },
      { text: '전체 업무', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 10, fontFace: 'Malgun Gothic', align: 'center' } },
      { text: '전체 지표', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 10, fontFace: 'Malgun Gothic', align: 'center' } },
      { text: '목표 설정 지표', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 10, fontFace: 'Malgun Gothic', align: 'center' } },
      { text: '평균 달성률', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 10, fontFace: 'Malgun Gothic', align: 'center' } },
    ],
    [
      { text: '현황', options: { fontSize: 10, fontFace: 'Malgun Gothic', align: 'center', fill: { color: COLORS.gray50 } } },
      { text: `${overview.totalTasks}건`, options: { fontSize: 10, fontFace: 'Malgun Gothic', align: 'center' } },
      { text: `${overview.totalIndicators}개`, options: { fontSize: 10, fontFace: 'Malgun Gothic', align: 'center' } },
      { text: `${overview.indicatorsWithTarget}개`, options: { fontSize: 10, fontFace: 'Malgun Gothic', align: 'center' } },
      { text: `${overview.avgAchievementRate}%`, options: { fontSize: 10, fontFace: 'Malgun Gothic', align: 'center', color: getAchievementColor(overview.avgAchievementRate), bold: true } },
    ],
  ];

  slide.addTable(tableRows, {
    x: 0.5, y: 3.8, w: 12.3,
    border: { type: 'solid', pt: 0.5, color: COLORS.border },
    colW: [2.46, 2.46, 2.46, 2.46, 2.46],
    rowH: [0.4, 0.4],
  });
}

function addTeamKpiOverviewSlide(pptx: PptxInstance, overview: TeamKpiOverview, period: string) {
  const slide = pptx.addSlide();
  slide.background = { fill: COLORS.white };
  addSlideHeader(slide, period);

  // 제목
  slide.addText('팀 KPI 실적 요약', {
    x: 0.5, y: 0.5, w: 6, h: 0.5,
    fontSize: 22, color: COLORS.dark, bold: true,
    fontFace: 'Malgun Gothic',
  });

  // 상단 카드 4개
  const cards = [
    { label: '팀원 수', value: `${overview.totalMembers}명`, color: COLORS.primary },
    { label: '평균 달성률', value: `${overview.avgAchievementRate}%`, color: getAchievementColor(overview.avgAchievementRate) },
    { label: '전체 업무', value: `${overview.totalTasks}건`, color: COLORS.secondary },
    { label: '전체 지표', value: `${overview.totalIndicators}개`, color: COLORS.textLight },
  ];

  cards.forEach((card, i) => {
    const x = 0.5 + i * 3.15;
    slide.addShape('roundRect', {
      x, y: 1.2, w: 2.8, h: 1.5,
      fill: { color: COLORS.gray50 },
      rectRadius: 0.1,
    });
    slide.addText(card.label, {
      x, y: 1.35, w: 2.8, h: 0.35,
      fontSize: 11, color: COLORS.textLight, align: 'center',
      fontFace: 'Malgun Gothic',
    });
    slide.addText(card.value, {
      x, y: 1.7, w: 2.8, h: 0.8,
      fontSize: 28, color: card.color, align: 'center',
      fontFace: 'Malgun Gothic', bold: true,
    });
  });

  // 달성/근접/미달 요약
  const statusRow: TableRow[] = [
    [
      { text: '달성 (≥100%)', options: { bold: true, fill: { color: COLORS.success }, color: COLORS.white, fontSize: 10, fontFace: 'Malgun Gothic', align: 'center' } },
      { text: '근접 (70~99%)', options: { bold: true, fill: { color: COLORS.warning }, color: COLORS.white, fontSize: 10, fontFace: 'Malgun Gothic', align: 'center' } },
      { text: '미달 (<70%)', options: { bold: true, fill: { color: COLORS.danger }, color: COLORS.white, fontSize: 10, fontFace: 'Malgun Gothic', align: 'center' } },
    ],
    [
      { text: `${overview.achieved}개`, options: { fontSize: 14, fontFace: 'Malgun Gothic', align: 'center', bold: true, color: COLORS.success } },
      { text: `${overview.nearTarget}개`, options: { fontSize: 14, fontFace: 'Malgun Gothic', align: 'center', bold: true, color: COLORS.warning } },
      { text: `${overview.belowTarget}개`, options: { fontSize: 14, fontFace: 'Malgun Gothic', align: 'center', bold: true, color: COLORS.danger } },
    ],
  ];

  slide.addTable(statusRow, {
    x: 0.5, y: 3.0, w: 12.3,
    border: { type: 'solid', pt: 0.5, color: COLORS.border },
    colW: [4.1, 4.1, 4.1],
    rowH: [0.4, 0.5],
  });
}

function addCategoryAchievementSlide(
  pptx: PptxInstance,
  categories: Array<{ category: string; avgRate: number; count: number }>,
  period: string,
) {
  const slide = pptx.addSlide();
  slide.background = { fill: COLORS.white };
  addSlideHeader(slide, period);

  slide.addText('카테고리별 달성률', {
    x: 0.5, y: 0.5, w: 6, h: 0.5,
    fontSize: 22, color: COLORS.dark, bold: true,
    fontFace: 'Malgun Gothic',
  });

  const tableRows: TableRow[] = [
    [
      { text: '카테고리', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 11, fontFace: 'Malgun Gothic', align: 'center' } },
      { text: '지표 수', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 11, fontFace: 'Malgun Gothic', align: 'center' } },
      { text: '평균 달성률', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 11, fontFace: 'Malgun Gothic', align: 'center' } },
      { text: '평가', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 11, fontFace: 'Malgun Gothic', align: 'center' } },
    ],
  ];

  categories.forEach((cat, i) => {
    const bgColor = i % 2 === 0 ? COLORS.white : COLORS.gray50;
    const evalText = cat.avgRate >= 100 ? '달성' : cat.avgRate >= 70 ? '근접' : '미달';
    const evalColor = getAchievementColor(cat.avgRate);
    tableRows.push([
      { text: cat.category, options: { fontSize: 11, fontFace: 'Malgun Gothic', align: 'center', fill: { color: bgColor } } },
      { text: `${cat.count}개`, options: { fontSize: 11, fontFace: 'Malgun Gothic', align: 'center', fill: { color: bgColor } } },
      { text: `${cat.avgRate}%`, options: { fontSize: 11, fontFace: 'Malgun Gothic', align: 'center', fill: { color: bgColor }, color: evalColor, bold: true } },
      { text: evalText, options: { fontSize: 11, fontFace: 'Malgun Gothic', align: 'center', fill: { color: bgColor }, color: evalColor, bold: true } },
    ]);
  });

  slide.addTable(tableRows, {
    x: 1.0, y: 1.3, w: 11.3,
    border: { type: 'solid', pt: 0.5, color: COLORS.border },
    colW: [3.5, 2.0, 3.0, 2.8],
    rowH: [0.45, ...categories.map(() => 0.45)],
  });
}

function addMemberAchievementSlide(
  pptx: PptxInstance,
  members: Array<{ name: string; avgRate: number; taskCount: number; indicatorCount: number }>,
  period: string,
) {
  const slide = pptx.addSlide();
  slide.background = { fill: COLORS.white };
  addSlideHeader(slide, period);

  slide.addText('팀원별 달성률', {
    x: 0.5, y: 0.5, w: 6, h: 0.5,
    fontSize: 22, color: COLORS.dark, bold: true,
    fontFace: 'Malgun Gothic',
  });

  const tableRows: TableRow[] = [
    [
      { text: '순위', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 11, fontFace: 'Malgun Gothic', align: 'center' } },
      { text: '이름', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 11, fontFace: 'Malgun Gothic', align: 'center' } },
      { text: '업무 수', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 11, fontFace: 'Malgun Gothic', align: 'center' } },
      { text: '지표 수', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 11, fontFace: 'Malgun Gothic', align: 'center' } },
      { text: '평균 달성률', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 11, fontFace: 'Malgun Gothic', align: 'center' } },
    ],
  ];

  members.forEach((m, i) => {
    const bgColor = i % 2 === 0 ? COLORS.white : COLORS.gray50;
    tableRows.push([
      { text: `${i + 1}`, options: { fontSize: 11, fontFace: 'Malgun Gothic', align: 'center', fill: { color: bgColor } } },
      { text: m.name, options: { fontSize: 11, fontFace: 'Malgun Gothic', align: 'center', fill: { color: bgColor }, bold: true } },
      { text: `${m.taskCount}건`, options: { fontSize: 11, fontFace: 'Malgun Gothic', align: 'center', fill: { color: bgColor } } },
      { text: `${m.indicatorCount}개`, options: { fontSize: 11, fontFace: 'Malgun Gothic', align: 'center', fill: { color: bgColor } } },
      { text: `${m.avgRate}%`, options: { fontSize: 11, fontFace: 'Malgun Gothic', align: 'center', fill: { color: bgColor }, color: getAchievementColor(m.avgRate), bold: true } },
    ]);
  });

  slide.addTable(tableRows, {
    x: 0.8, y: 1.3, w: 11.7,
    border: { type: 'solid', pt: 0.5, color: COLORS.border },
    colW: [1.5, 3.0, 2.0, 2.0, 3.2],
    rowH: [0.45, ...members.map(() => 0.45)],
  });
}

function addMemberDividerSlide(pptx: PptxInstance, memberName: string, taskCount: number, period: string) {
  const slide = pptx.addSlide();
  slide.background = { fill: COLORS.primaryLight };

  // 상단 바
  slide.addShape('rect', {
    x: 0, y: 0, w: '100%', h: 0.08,
    fill: { color: COLORS.primary },
  });

  slide.addText(memberName, {
    x: 0.5, y: 2.5, w: 12.3, h: 1.0,
    fontSize: 36, color: COLORS.dark, align: 'center',
    fontFace: 'Malgun Gothic', bold: true,
  });

  slide.addText(`업무 ${taskCount}건`, {
    x: 0.5, y: 3.6, w: 12.3, h: 0.5,
    fontSize: 16, color: COLORS.textLight, align: 'center',
    fontFace: 'Malgun Gothic',
  });

  // 하단 바
  slide.addShape('rect', {
    x: 0, y: 7.42, w: '100%', h: 0.08,
    fill: { color: COLORS.primary },
  });
}

function addTaskDetailSlide(
  pptx: PptxInstance,
  task: TaskDetail,
  taskIdx: number,
  totalTasks: number,
  period: string,
  memberName?: string,
) {
  const slide = pptx.addSlide();
  slide.background = { fill: COLORS.white };
  addSlideHeader(slide, period, memberName ? `${memberName} 업무 상세` : undefined);

  // 업무 제목
  slide.addText(`${task.category} > ${task.task}`, {
    x: 0.5, y: 0.5, w: 10, h: 0.5,
    fontSize: 18, color: COLORS.dark, bold: true,
    fontFace: 'Malgun Gothic',
  });
  slide.addText(`(${taskIdx}/${totalTasks})`, {
    x: 10.5, y: 0.5, w: 2.8, h: 0.5,
    fontSize: 12, color: COLORS.textLight, align: 'right',
    fontFace: 'Malgun Gothic',
  });

  // 부서
  if (task.department) {
    slide.addText(`담당부서: ${task.department}`, {
      x: 0.5, y: 1.0, w: 6, h: 0.3,
      fontSize: 10, color: COLORS.textLight,
      fontFace: 'Malgun Gothic',
    });
  }

  // 전월평가 / 금월계획 / 실행 - 3분할 카드
  const cardWidth = 3.9;
  const cardY = 1.5;
  const cardH = 2.2;
  const cards = [
    { title: '전월평가', content: task.previousEvaluation || '-', color: COLORS.secondary },
    { title: '금월계획', content: task.currentPlan || '-', color: COLORS.primary },
    { title: '실행', content: task.execution || '-', color: COLORS.success },
  ];

  cards.forEach((card, i) => {
    const x = 0.5 + i * (cardWidth + 0.25);
    // 카드 배경
    slide.addShape('roundRect', {
      x, y: cardY, w: cardWidth, h: cardH,
      fill: { color: COLORS.gray50 },
      rectRadius: 0.08,
      line: { color: COLORS.border, width: 0.5 },
    });
    // 카드 헤더 바
    slide.addShape('rect', {
      x: x + 0.01, y: cardY + 0.01, w: cardWidth - 0.02, h: 0.4,
      fill: { color: card.color },
    });
    // 카드 제목
    slide.addText(card.title, {
      x, y: cardY + 0.03, w: cardWidth, h: 0.36,
      fontSize: 11, color: COLORS.white, align: 'center',
      fontFace: 'Malgun Gothic', bold: true,
    });
    // 카드 내용
    slide.addText(truncateText(card.content, 150), {
      x: x + 0.15, y: cardY + 0.5, w: cardWidth - 0.3, h: cardH - 0.6,
      fontSize: 10, color: COLORS.text, align: 'left', valign: 'top',
      fontFace: 'Malgun Gothic',
      wrap: true,
    });
  });

  // KPI 지표 테이블
  if (task.indicators.length > 0) {
    slide.addText('KPI 지표 실적', {
      x: 0.5, y: 3.9, w: 6, h: 0.4,
      fontSize: 13, color: COLORS.dark, bold: true,
      fontFace: 'Malgun Gothic',
    });

    const hasWeekly = task.indicators.some(ind => ind.weeklyRecords && ind.weeklyRecords.length > 0);
    
    const headerRow: TableRow = [
      { text: '지표명', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 9, fontFace: 'Malgun Gothic', align: 'center' } },
      { text: '단위', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 9, fontFace: 'Malgun Gothic', align: 'center' } },
      { text: '전월실적', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 9, fontFace: 'Malgun Gothic', align: 'center' } },
      { text: '금월목표', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 9, fontFace: 'Malgun Gothic', align: 'center' } },
      { text: '금월실적', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 9, fontFace: 'Malgun Gothic', align: 'center' } },
      { text: '달성률', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 9, fontFace: 'Malgun Gothic', align: 'center' } },
    ];

    const tableRows: TableRow[] = [headerRow];

    task.indicators.forEach((ind, i) => {
      const bgColor = i % 2 === 0 ? COLORS.white : COLORS.gray50;
      tableRows.push([
        { text: ind.name, options: { fontSize: 9, fontFace: 'Malgun Gothic', align: 'center', fill: { color: bgColor } } },
        { text: ind.unit, options: { fontSize: 9, fontFace: 'Malgun Gothic', align: 'center', fill: { color: bgColor } } },
        { text: formatNumber(ind.previousActual || 0), options: { fontSize: 9, fontFace: 'Malgun Gothic', align: 'center', fill: { color: bgColor } } },
        { text: formatNumber(ind.monthlyTarget), options: { fontSize: 9, fontFace: 'Malgun Gothic', align: 'center', fill: { color: bgColor } } },
        { text: formatNumber(ind.monthlyTotal), options: { fontSize: 9, fontFace: 'Malgun Gothic', align: 'center', fill: { color: bgColor }, bold: true } },
        { text: `${ind.achievementRate}%`, options: { fontSize: 9, fontFace: 'Malgun Gothic', align: 'center', fill: { color: bgColor }, color: getAchievementColor(ind.achievementRate), bold: true } },
      ]);
    });

    slide.addTable(tableRows, {
      x: 0.5, y: 4.3, w: 12.3,
      border: { type: 'solid', pt: 0.5, color: COLORS.border },
      colW: [3.0, 1.2, 2.0, 2.0, 2.0, 2.1],
      rowH: [0.35, ...task.indicators.map(() => 0.35)],
    });

    // 주간 실적 (공간이 있으면)
    if (hasWeekly && task.indicators.length <= 3) {
      let weekY = 4.3 + (task.indicators.length + 1) * 0.35 + 0.3;
      if (weekY < 6.0) {
        slide.addText('주간 실적 추이', {
          x: 0.5, y: weekY, w: 6, h: 0.3,
          fontSize: 10, color: COLORS.textLight,
          fontFace: 'Malgun Gothic',
        });
        weekY += 0.3;
        task.indicators.forEach(ind => {
          if (ind.weeklyRecords && ind.weeklyRecords.length > 0 && weekY < 6.8) {
            const weekText = ind.weeklyRecords.map(r => `${r.week}주: ${formatNumber(r.value)}`).join('  |  ');
            slide.addText(`${ind.name}: ${weekText}`, {
              x: 0.7, y: weekY, w: 12, h: 0.25,
              fontSize: 9, color: COLORS.textLight,
              fontFace: 'Malgun Gothic',
            });
            weekY += 0.25;
          }
        });
      }
    }
  }
}

// ===== 주간보고서 업무 요약 슬라이드 =====
function addWeeklyTaskSummarySlide(pptx: PptxInstance, summary: WeeklyTaskSummary, period: string) {
  const slide = pptx.addSlide();
  slide.background = { fill: COLORS.white };
  addSlideHeader(slide, period);

  slide.addText('주간 업무 현황', {
    x: 0.5, y: 0.5, w: 6, h: 0.5,
    fontSize: 22, color: COLORS.dark, bold: true,
    fontFace: 'Malgun Gothic',
  });

  // 요약 카드 5개
  const cards = [
    { label: '전체 업무', value: `${summary.total}`, color: COLORS.primary },
    { label: '완료', value: `${summary.completed}`, color: COLORS.success },
    { label: '진행중', value: `${summary.inProgress}`, color: '3B82F6' },
    { label: '대기', value: `${summary.pending}`, color: COLORS.warning },
    { label: '완료율', value: `${summary.completionRate}%`, color: '8B5CF6' },
  ];

  cards.forEach((card, i) => {
    const x = 0.5 + i * 2.5;
    slide.addShape('roundRect', {
      x, y: 1.5, w: 2.2, h: 2.5,
      fill: { color: COLORS.gray50 },
      rectRadius: 0.1,
      line: { color: card.color, width: 2 },
    });
    slide.addText(card.label, {
      x, y: 1.7, w: 2.2, h: 0.4,
      fontSize: 12, color: COLORS.textLight, align: 'center',
      fontFace: 'Malgun Gothic',
    });
    slide.addText(card.value, {
      x, y: 2.2, w: 2.2, h: 1.2,
      fontSize: 40, color: card.color, align: 'center',
      fontFace: 'Malgun Gothic', bold: true,
    });
  });

  // 진행률 바
  const barY = 4.8;
  slide.addText('전체 진행률', {
    x: 0.5, y: barY, w: 3, h: 0.35,
    fontSize: 12, color: COLORS.text, bold: true,
    fontFace: 'Malgun Gothic',
  });
  // 배경 바
  slide.addShape('roundRect', {
    x: 0.5, y: barY + 0.5, w: 12.3, h: 0.5,
    fill: { color: COLORS.gray200 },
    rectRadius: 0.05,
  });
  // 진행 바
  const barWidth = Math.max(0.1, (summary.completionRate / 100) * 12.3);
  slide.addShape('roundRect', {
    x: 0.5, y: barY + 0.5, w: barWidth, h: 0.5,
    fill: { color: summary.completionRate >= 80 ? COLORS.success : summary.completionRate >= 50 ? '3B82F6' : COLORS.warning },
    rectRadius: 0.05,
  });
  slide.addText(`${summary.completionRate}%`, {
    x: 10.5, y: barY, w: 2.3, h: 0.35,
    fontSize: 14, color: COLORS.dark, align: 'right', bold: true,
    fontFace: 'Malgun Gothic',
  });
}

// ===== 주간보고서 업무 리스트 슬라이드 =====
function addWeeklyTaskListSlide(
  pptx: PptxInstance,
  tasks: WeeklyTaskItem[],
  startIdx: number,
  totalCount: number,
  period: string,
  memberName?: string,
) {
  const slide = pptx.addSlide();
  slide.background = { fill: COLORS.white };
  addSlideHeader(slide, period, memberName);

  const endIdx = Math.min(startIdx + tasks.length - 1, totalCount);
  slide.addText(`업무 리스트 (${startIdx}~${endIdx} / ${totalCount}건)`, {
    x: 0.5, y: 0.5, w: 8, h: 0.5,
    fontSize: 18, color: COLORS.dark, bold: true,
    fontFace: 'Malgun Gothic',
  });

  const statusLabels: Record<string, string> = {
    completed: '완료',
    in_progress: '진행중',
    pending: '대기',
  };
  const statusColors: Record<string, string> = {
    completed: COLORS.success,
    in_progress: '3B82F6',
    pending: COLORS.warning,
  };
  const priorityLabels: Record<string, string> = {
    high: '높음',
    medium: '보통',
    low: '낮음',
  };

  // 테이블 헤더
  const headerRow: TableRow = [
    { text: '상태', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 9, fontFace: 'Malgun Gothic', align: 'center' } },
    { text: '업무명', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 9, fontFace: 'Malgun Gothic', align: 'left' } },
    { text: '담당자', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 9, fontFace: 'Malgun Gothic', align: 'center' } },
    { text: '우선순위', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 9, fontFace: 'Malgun Gothic', align: 'center' } },
    { text: '진행률', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 9, fontFace: 'Malgun Gothic', align: 'center' } },
    { text: '마감일', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white, fontSize: 9, fontFace: 'Malgun Gothic', align: 'center' } },
  ];

  const dataRows: TableRow[] = tasks.map((task, i) => {
    const bgColor = i % 2 === 0 ? COLORS.white : COLORS.gray50;
    return [
      { text: statusLabels[task.status] || task.status, options: { fill: { color: bgColor }, color: statusColors[task.status] || COLORS.text, fontSize: 9, fontFace: 'Malgun Gothic', align: 'center', bold: true } },
      { text: truncateText(task.title, 40), options: { fill: { color: bgColor }, color: COLORS.text, fontSize: 9, fontFace: 'Malgun Gothic', align: 'left' } },
      { text: task.assignee || '-', options: { fill: { color: bgColor }, color: COLORS.text, fontSize: 9, fontFace: 'Malgun Gothic', align: 'center' } },
      { text: priorityLabels[task.priority] || task.priority, options: { fill: { color: bgColor }, color: COLORS.text, fontSize: 9, fontFace: 'Malgun Gothic', align: 'center' } },
      { text: `${task.progress}%`, options: { fill: { color: bgColor }, color: task.progress >= 100 ? COLORS.success : task.progress >= 50 ? '3B82F6' : COLORS.warning, fontSize: 9, fontFace: 'Malgun Gothic', align: 'center', bold: true } },
      { text: task.dueDate ? new Date(task.dueDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '-', options: { fill: { color: bgColor }, color: COLORS.text, fontSize: 9, fontFace: 'Malgun Gothic', align: 'center' } },
    ];
  });

  slide.addTable([headerRow, ...dataRows], {
    x: 0.5, y: 1.2, w: 12.3,
    border: { type: 'solid', pt: 0.5, color: COLORS.border },
    colW: [1.2, 4.5, 1.5, 1.2, 1.5, 2.4],
    rowH: [0.4, ...tasks.map(() => 0.4)],
  });

  // 진행 이력 (공간이 있으면)
  const tableEndY = 1.2 + 0.4 + tasks.length * 0.4 + 0.3;
  if (tableEndY < 6.0) {
    const logsToShow = tasks
      .filter(t => t.progressLogs && t.progressLogs.length > 0)
      .slice(0, 3);
    if (logsToShow.length > 0) {
      slide.addText('주요 진행 이력', {
        x: 0.5, y: tableEndY, w: 6, h: 0.3,
        fontSize: 10, color: COLORS.textLight, bold: true,
        fontFace: 'Malgun Gothic',
      });
      let logY = tableEndY + 0.35;
      logsToShow.forEach(task => {
        if (logY >= 6.8) return;
        const latestLog = task.progressLogs[0];
        slide.addText(
          `▸ ${truncateText(task.title, 20)}: ${truncateText(latestLog.content, 50)}`,
          {
            x: 0.7, y: logY, w: 12, h: 0.3,
            fontSize: 9, color: COLORS.text,
            fontFace: 'Malgun Gothic',
          }
        );
        logY += 0.3;
      });
    }
  }
}

function addSummarySlide(
  pptx: PptxInstance,
  summary?: string | null,
  nextPlan?: string | null,
  issues?: string | null,
  period?: string,
) {
  const slide = pptx.addSlide();
  slide.background = { fill: COLORS.white };
  addSlideHeader(slide, period || '');

  slide.addText('종합 의견', {
    x: 0.5, y: 0.5, w: 6, h: 0.5,
    fontSize: 22, color: COLORS.dark, bold: true,
    fontFace: 'Malgun Gothic',
  });

  const sections = [
    { title: '요약', content: summary, color: COLORS.primary },
    { title: '향후 계획', content: nextPlan, color: COLORS.success },
    { title: '이슈 사항', content: issues, color: COLORS.danger },
  ].filter(s => s.content);

  const sectionH = sections.length > 0 ? Math.min(5.5 / sections.length, 2.0) : 2.0;

  sections.forEach((section, i) => {
    const y = 1.3 + i * (sectionH + 0.2);
    // 제목 바
    slide.addShape('rect', {
      x: 0.5, y, w: 0.08, h: sectionH,
      fill: { color: section.color },
    });
    slide.addText(section.title, {
      x: 0.8, y, w: 3, h: 0.35,
      fontSize: 13, color: section.color, bold: true,
      fontFace: 'Malgun Gothic',
    });
    slide.addText(section.content || '', {
      x: 0.8, y: y + 0.35, w: 12, h: sectionH - 0.4,
      fontSize: 11, color: COLORS.text,
      fontFace: 'Malgun Gothic',
      wrap: true, valign: 'top',
    });
  });
}
