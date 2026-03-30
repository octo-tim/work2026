import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * 사업부 테이블 - Divisions
 */
export const divisions = mysqlTable("divisions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Division = typeof divisions.$inferSelect;
export type InsertDivision = typeof divisions.$inferInsert;

/**
 * 팀 테이블 - Teams
 */
export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  divisionId: int("divisionId").notNull().references(() => divisions.id),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

/**
 * 직책 테이블 - Positions (부장, 차장, 과장 등)
 */
export const positions = mysqlTable("positions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Position = typeof positions.$inferSelect;
export type InsertPosition = typeof positions.$inferInsert;

/**
 * 직급 테이블 - Ranks (1급, 2급, 3급 등)
 */
export const ranks = mysqlTable("ranks", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  level: int("level").default(0).notNull(), // 직급 레벨 (숫자가 낮을수록 높은 직급)
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Rank = typeof ranks.$inferSelect;
export type InsertRank = typeof ranks.$inferInsert;

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  koreanName: varchar("koreanName", { length: 50 }), // 한글 이름
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // 조직 정보 필드 추가
  divisionId: int("divisionId").references(() => divisions.id),
  teamId: int("teamId").references(() => teams.id),
  positionId: int("positionId").references(() => positions.id),
  rankId: int("rankId").references(() => ranks.id),
  isProfileComplete: boolean("isProfileComplete").default(false).notNull(), // 프로필 완성 여부
  canEditSales: boolean("canEditSales").default(false).notNull(), // 매출관리 편집 권한
  canEditFinancial: boolean("canEditFinancial").default(false).notNull(), // 재무현황 편집 권한
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tasks table for task management
 */
export const tasks = mysqlTable("tasks", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  number: int("number").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  department: varchar("department", { length: 100 }).default(""),
  assignee: varchar("assignee", { length: 100 }).default(""),
  schedule: varchar("schedule", { length: 100 }).default(""),
  details: text("details"),
  status: mysqlEnum("status", ["pending", "in-progress", "completed"]).default("pending").notNull(),
  startDate: timestamp("startDate"), // 시작일
  dueDate: timestamp("dueDate"), // 완료일
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

/**
 * Sales records table - 매출현황 (봄봄시공, 제조공급, 온라인판매)
 * 각 제품그룹별 월별 매출 실적 관리
 */
export const salesRecords = mysqlTable("sales_records", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  division: varchar("division", { length: 50 }).notNull(), // bombom(봄봄시공), manufacturing(제조공급), online(온라인판매)
  productGroup: varchar("productGroup", { length: 100 }).notNull(), // 본사, 지사 / 리코코, 크림하우스, 기타 / 봄봄, 슈슈비, 기타
  monthlyTarget: bigint("monthlyTarget", { mode: "number" }).default(0), // 금월목표
  previousMonthSales: bigint("previousMonthSales", { mode: "number" }).default(0), // 전월실적
  week1Sales: bigint("week1Sales", { mode: "number" }).default(0), // 1주차 실적
  week2Sales: bigint("week2Sales", { mode: "number" }).default(0), // 2주차 실적
  week3Sales: bigint("week3Sales", { mode: "number" }).default(0), // 3주차 실적
  week4Sales: bigint("week4Sales", { mode: "number" }).default(0), // 4주차 실적
  week5Sales: bigint("week5Sales", { mode: "number" }).default(0), // 5주차 실적
  cumulativeSales: bigint("cumulativeSales", { mode: "number" }).default(0), // 월누계
  achievementRate: decimal("achievementRate", { precision: 5, scale: 1 }).default("0"), // 달성률 (%)
  year: int("year").notNull(), // 연도
  month: int("month").notNull(), // 월
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SalesRecord = typeof salesRecords.$inferSelect;
export type InsertSalesRecord = typeof salesRecords.$inferInsert;

/**
 * Contract records table - 계약현황 (계약건수)
 * 각 유입채널별 계약 건수 관리
 */
export const contractRecords = mysqlTable("contract_records", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  brand: varchar("brand", { length: 50 }).default("bombom").notNull(), // bombom(봄봄시공), ricoco(리코코시공)
  channel: varchar("channel", { length: 100 }).notNull(), // 내부채널, 외부채널
  subChannel: varchar("subChannel", { length: 100 }), // 상담전화, 샘플신청, 라이브커머스 등
  previousMonthCount: int("previousMonthCount").default(0), // 전월실적
  monthlyTarget: int("monthlyTarget").default(0), // 금월목표
  week1Count: int("week1Count").default(0), // 1주차
  week2Count: int("week2Count").default(0), // 2주차
  week3Count: int("week3Count").default(0), // 3주차
  week4Count: int("week4Count").default(0), // 4주차
  week5Count: int("week5Count").default(0), // 5주차
  totalCount: int("totalCount").default(0), // 합계
  achievementRate: decimal("achievementRate", { precision: 5, scale: 1 }).default("0"), // 달성률 (%)
  year: int("year").notNull(), // 연도
  month: int("month").notNull(), // 월
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContractRecord = typeof contractRecords.$inferSelect;
export type InsertContractRecord = typeof contractRecords.$inferInsert;

/**
 * Goals table - 목표관리
 * 연간 주요 목표 설정 및 관리
 */
export const goals = mysqlTable("goals", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  year: int("year").notNull(), // 연도
  category: varchar("category", { length: 100 }).notNull(), // 목표 카테고리 (매출, 영업, 마케팅, 인사 등)
  title: varchar("title", { length: 500 }).notNull(), // 목표 제목
  description: text("description"), // 목표 상세 설명
  targetValue: bigint("targetValue", { mode: "number" }).default(0), // 목표 수치 (금액, 건수 등)
  currentValue: bigint("currentValue", { mode: "number" }).default(0), // 현재 달성 수치
  unit: varchar("unit", { length: 50 }).default(""), // 단위 (원, 건, % 등)
  priority: mysqlEnum("priority", ["high", "medium", "low"]).default("medium").notNull(), // 우선순위
  status: mysqlEnum("status", ["not-started", "in-progress", "completed", "delayed"]).default("not-started").notNull(), // 상태
  startDate: varchar("startDate", { length: 20 }), // 시작일
  endDate: varchar("endDate", { length: 20 }), // 종료일
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Goal = typeof goals.$inferSelect;
export type InsertGoal = typeof goals.$inferInsert;

/**
 * Quarterly Reviews table - 분기별 리뷰
 * 분기별 목표 달성 현황 점검 및 기록
 */
export const quarterlyReviews = mysqlTable("quarterly_reviews", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  year: int("year").notNull(), // 연도
  quarter: mysqlEnum("quarter", ["Q1", "Q2", "Q3", "Q4"]).notNull(), // 분기
  
  // 재무 실적
  salesTarget: bigint("salesTarget", { mode: "number" }).default(0), // 매출 목표
  salesActual: bigint("salesActual", { mode: "number" }).default(0), // 매출 실적
  profitTarget: bigint("profitTarget", { mode: "number" }).default(0), // 영업이익 목표
  profitActual: bigint("profitActual", { mode: "number" }).default(0), // 영업이익 실적
  
  // 전략별 진행 현황 (1-100%)
  strategy1Progress: int("strategy1Progress").default(0), // 시공 시장 경쟁력 유지
  strategy2Progress: int("strategy2Progress").default(0), // 셀프 시공 시장 확대
  strategy3Progress: int("strategy3Progress").default(0), // 제품 차별화 지속
  strategy4Progress: int("strategy4Progress").default(0), // 신규 영업 채널 강화
  
  // 주요 성과
  achievements: text("achievements"), // 주요 성과 내용
  
  // 개선 필요 사항
  improvements: text("improvements"), // 개선 필요 사항
  
  // 다음 분기 계획
  nextQuarterPlan: text("nextQuarterPlan"), // 다음 분기 계획
  
  // 종합 평가
  overallRating: mysqlEnum("overallRating", ["excellent", "good", "fair", "poor"]).default("fair"), // 종합 평가
  overallComment: text("overallComment"), // 종합 코멘트
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QuarterlyReview = typeof quarterlyReviews.$inferSelect;
export type InsertQuarterlyReview = typeof quarterlyReviews.$inferInsert;

/**
 * 회의록 테이블 - Meeting Minutes
 * 회의 기록 및 관리
 */
export const meetingMinutes = mysqlTable("meeting_minutes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id), // 작성자
  
  // 회의 기본 정보
  meetingDate: timestamp("meetingDate").notNull(), // 회의 일자
  title: varchar("title", { length: 200 }).notNull(), // 회의 주제
  location: varchar("location", { length: 200 }), // 장소
  
  // 참석자 (JSON 배열로 저장)
  attendees: text("attendees"), // ["홍길동", "김철수", ...]
  
  // 회의 내용
  content: text("content"), // 회의 내용 (마크다운 지원)
  
  // 결정 사항
  decisions: text("decisions"), // 결정 사항
  
  // 액션 아이템 (JSON 배열로 저장)
  actionItems: text("actionItems"), // [{ "task": "...", "assignee": "...", "dueDate": "..." }, ...]
  
  // 다음 회의 일정
  nextMeetingDate: timestamp("nextMeetingDate"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MeetingMinute = typeof meetingMinutes.$inferSelect;
export type InsertMeetingMinute = typeof meetingMinutes.$inferInsert;

/**
 * 매출 카테고리 설정 테이블 - Sales Categories
 * 봄봄시공, 제조공급, 온라인판매 등의 매출 섹션 관리
 */
export const salesCategories = mysqlTable("sales_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // 섹션명 (봄봄시공, 제조공급, 온라인판매)
  division: varchar("division", { length: 50 }).notNull(), // 구분 (시공, 제조, 온라인)
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SalesCategory = typeof salesCategories.$inferSelect;
export type InsertSalesCategory = typeof salesCategories.$inferInsert;

/**
 * 브랜드/거래처그룹 설정 테이블 - Sales Items
 * 각 매출 카테고리 내의 세부 항목 (본사, 지사, 리코코, 크림하우스 등)
 */
export const salesItems = mysqlTable("sales_items", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull().references(() => salesCategories.id),
  name: varchar("name", { length: 100 }).notNull(), // 항목명 (본사, 지사, 리코코 등)
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SalesItem = typeof salesItems.$inferSelect;
export type InsertSalesItem = typeof salesItems.$inferInsert;

/**
 * 계약 채널 설정 테이블 - Contract Channels
 * 내부채널, 외부채널 등의 계약 유입경로 관리
 */
export const contractChannels = mysqlTable("contract_channels", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // 채널명 (내부채널, 외부채널)
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContractChannel = typeof contractChannels.$inferSelect;
export type InsertContractChannel = typeof contractChannels.$inferInsert;

/**
 * 계약 세부 채널 설정 테이블 - Contract Sub Channels
 * 각 채널 내의 세부 유입경로 (상담전화, 샘플신청, 라이브커머스 등)
 */
export const contractSubChannels = mysqlTable("contract_sub_channels", {
  id: int("id").autoincrement().primaryKey(),
  channelId: int("channelId").notNull().references(() => contractChannels.id),
  name: varchar("name", { length: 100 }).notNull(), // 세부 채널명 (상담전화, 샘플신청 등)
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContractSubChannel = typeof contractSubChannels.$inferSelect;
export type InsertContractSubChannel = typeof contractSubChannels.$inferInsert;


/**
 * 업무 진행 이력 테이블 - Task Progress Logs
 * 업무별 일자 및 내용을 복수로 기록
 */
export const taskProgressLogs = mysqlTable("task_progress_logs", {
  id: int("id").autoincrement().primaryKey(),
  taskId: varchar("taskId", { length: 36 }).notNull().references(() => tasks.id, { onDelete: "cascade" }),
  logDate: timestamp("logDate").notNull(), // 진행 일자
  content: text("content").notNull(), // 진행 내용
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TaskProgressLog = typeof taskProgressLogs.$inferSelect;
export type InsertTaskProgressLog = typeof taskProgressLogs.$inferInsert;

/**
 * 아카이브된 업무 테이블 - Archived Tasks
 * 완료되거나 보관이 필요한 업무를 아카이브로 이동
 */
export const archivedTasks = mysqlTable("archived_tasks", {
  id: varchar("id", { length: 36 }).primaryKey(),
  originalTaskId: varchar("originalTaskId", { length: 36 }).notNull(), // 원본 업무 ID
  userId: int("userId").notNull().references(() => users.id),
  number: int("number").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  department: varchar("department", { length: 100 }).default(""),
  assignee: varchar("assignee", { length: 100 }).default(""),
  schedule: varchar("schedule", { length: 100 }).default(""),
  details: text("details"),
  status: mysqlEnum("status", ["pending", "in-progress", "completed"]).default("pending").notNull(),
  startDate: timestamp("startDate"),
  dueDate: timestamp("dueDate"),
  originalCreatedAt: timestamp("originalCreatedAt").notNull(), // 원본 업무 생성일
  archivedAt: timestamp("archivedAt").defaultNow().notNull(), // 아카이브 일시
  archivedBy: int("archivedBy").notNull().references(() => users.id), // 아카이브 수행자
  archiveReason: varchar("archiveReason", { length: 200 }), // 아카이브 사유
});

export type ArchivedTask = typeof archivedTasks.$inferSelect;
export type InsertArchivedTask = typeof archivedTasks.$inferInsert;

/**
 * 아카이브된 업무 진행 이력 테이블 - Archived Task Progress Logs
 * 아카이브된 업무의 진행 이력 보관
 */
export const archivedTaskProgressLogs = mysqlTable("archived_task_progress_logs", {
  id: int("id").autoincrement().primaryKey(),
  archivedTaskId: varchar("archivedTaskId", { length: 36 }).notNull().references(() => archivedTasks.id, { onDelete: "cascade" }),
  logDate: timestamp("logDate").notNull(),
  content: text("content").notNull(),
  originalCreatedAt: timestamp("originalCreatedAt").notNull(),
});

export type ArchivedTaskProgressLog = typeof archivedTaskProgressLogs.$inferSelect;
export type InsertArchivedTaskProgressLog = typeof archivedTaskProgressLogs.$inferInsert;


/**
 * 매출관리 일정 테이블 - Sales Events
 * 매출관리 페이지의 주요 일정 관리
 */
export const salesEvents = mysqlTable("sales_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id), // 작성자
  
  // 일정 기본 정보
  title: varchar("title", { length: 200 }).notNull(), // 일정 제목
  description: text("description"), // 일정 상세 설명
  
  // 일정 날짜/시간
  eventDate: timestamp("eventDate").notNull(), // 일정 날짜
  endDate: timestamp("endDate"), // 종료 날짜 (여러 날에 걸친 일정의 경우)
  isAllDay: boolean("isAllDay").default(true).notNull(), // 종일 일정 여부
  
  // 일정 유형
  eventType: mysqlEnum("eventType", [
    "meeting",      // 회의
    "deadline",     // 마감일
    "promotion",    // 프로모션/행사
    "holiday",      // 휴일/공휴일
    "payment",      // 결제/입금 예정
    "launch",       // 출시/런칭
    "other"         // 기타
  ]).default("other").notNull(),
  
  // 색상 (캘린더 표시용)
  color: varchar("color", { length: 20 }).default("#3b82f6"), // 기본 파란색
  
  // 관련 사업부 (선택사항)
  division: varchar("division", { length: 50 }), // bombom, manufacturing, online
  
  // 알림 설정
  reminderDays: int("reminderDays").default(0), // 며칠 전 알림 (0이면 알림 없음)
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SalesEvent = typeof salesEvents.$inferSelect;
export type InsertSalesEvent = typeof salesEvents.$inferInsert;


/**
 * 이달의 한마디 테이블 - Monthly Messages
 * 매출관리 페이지 상단에 표시되는 월별 메시지
 */
export const monthlyMessages = mysqlTable("monthly_messages", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  
  // 작성자
  userId: int("userId").notNull().references(() => users.id),
  
  // 연월 (YYYYMM 형식으로 저장)
  year: int("year").notNull(),
  month: int("month").notNull(),
  
  // 메시지 내용
  message: text("message").notNull(),
  
  // 작성자 이름 (조회 편의를 위해 저장)
  authorName: varchar("authorName", { length: 100 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MonthlyMessage = typeof monthlyMessages.$inferSelect;
export type InsertMonthlyMessage = typeof monthlyMessages.$inferInsert;


/**
 * 사업계획 테이블 - Business Plans
 * 연도별, 카테고리별, 사업부별 월별 계획 데이터
 */
export const businessPlans = mysqlTable("businessPlans", {
  id: int("id").autoincrement().primaryKey(),
  
  // 연도
  year: int("year").notNull(),
  
  // 카테고리: quantity(수량), revenue(매출), cost(원가)
  category: varchar("category", { length: 20 }).notNull(),
  
  // 사업부 대분류: bombom_construction(봄봄시공), online_sales(온라인매출), oem_supply(OEM공급), ricoco(리코코)
  division: varchar("division", { length: 50 }).notNull(),
  
  // 사업부 소분류: headquarters(본사), branch(지사), bombom(봄봄), shushuvi(슈슈비), etc(기타), linkmom(링크맘), ricoco_120(리코코_120), creamhouse(크림하우스)
  subDivision: varchar("subDivision", { length: 50 }),
  
  // 월별 데이터 (1~12월)
  month1: decimal("month1", { precision: 20, scale: 2 }).default("0"),
  month2: decimal("month2", { precision: 20, scale: 2 }).default("0"),
  month3: decimal("month3", { precision: 20, scale: 2 }).default("0"),
  month4: decimal("month4", { precision: 20, scale: 2 }).default("0"),
  month5: decimal("month5", { precision: 20, scale: 2 }).default("0"),
  month6: decimal("month6", { precision: 20, scale: 2 }).default("0"),
  month7: decimal("month7", { precision: 20, scale: 2 }).default("0"),
  month8: decimal("month8", { precision: 20, scale: 2 }).default("0"),
  month9: decimal("month9", { precision: 20, scale: 2 }).default("0"),
  month10: decimal("month10", { precision: 20, scale: 2 }).default("0"),
  month11: decimal("month11", { precision: 20, scale: 2 }).default("0"),
  month12: decimal("month12", { precision: 20, scale: 2 }).default("0"),
  
  // 연간 합계
  total: decimal("total", { precision: 20, scale: 2 }).default("0"),
  
  // 정렬 순서
  sortOrder: int("sortOrder").default(0).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BusinessPlan = typeof businessPlans.$inferSelect;
export type InsertBusinessPlan = typeof businessPlans.$inferInsert;

/**
 * 사업계획 실적 테이블 - Business Plan Actuals
 * 연도별, 카테고리별, 사업부별 월별 실적 데이터
 */
export const businessPlanActuals = mysqlTable("businessPlanActuals", {
  id: int("id").autoincrement().primaryKey(),
  
  // 연도
  year: int("year").notNull(),
  
  // 카테고리: quantity(수량), revenue(매출), cost(원가)
  category: varchar("category", { length: 20 }).notNull(),
  
  // 사업부 대분류: bombom_construction(봄봄시공), online_sales(온라인매출), oem_supply(OEM공급), ricoco(리코코)
  division: varchar("division", { length: 50 }).notNull(),
  
  // 사업부 소분류
  subDivision: varchar("subDivision", { length: 50 }),
  
  // 월별 실적 데이터 (1~12월)
  month1: decimal("month1", { precision: 20, scale: 2 }).default("0"),
  month2: decimal("month2", { precision: 20, scale: 2 }).default("0"),
  month3: decimal("month3", { precision: 20, scale: 2 }).default("0"),
  month4: decimal("month4", { precision: 20, scale: 2 }).default("0"),
  month5: decimal("month5", { precision: 20, scale: 2 }).default("0"),
  month6: decimal("month6", { precision: 20, scale: 2 }).default("0"),
  month7: decimal("month7", { precision: 20, scale: 2 }).default("0"),
  month8: decimal("month8", { precision: 20, scale: 2 }).default("0"),
  month9: decimal("month9", { precision: 20, scale: 2 }).default("0"),
  month10: decimal("month10", { precision: 20, scale: 2 }).default("0"),
  month11: decimal("month11", { precision: 20, scale: 2 }).default("0"),
  month12: decimal("month12", { precision: 20, scale: 2 }).default("0"),
  
  // 연간 합계
  total: decimal("total", { precision: 20, scale: 2 }).default("0"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BusinessPlanActual = typeof businessPlanActuals.$inferSelect;
export type InsertBusinessPlanActual = typeof businessPlanActuals.$inferInsert;


/**
 * 사업계획 변경 이력 테이블 - Business Plan History
 * 사업계획이 변경될 때마다 이전 데이터를 저장
 */
export const businessPlanHistory = mysqlTable("businessPlanHistory", {
  id: int("id").autoincrement().primaryKey(),
  
  // 원본 사업계획 ID
  businessPlanId: int("businessPlanId").notNull(),
  
  // 연도
  year: int("year").notNull(),
  
  // 카테고리: quantity(수량), revenue(매출), cost(원가)
  category: varchar("category", { length: 20 }).notNull(),
  
  // 사업부 대분류
  division: varchar("division", { length: 50 }).notNull(),
  
  // 사업부 소분류
  subDivision: varchar("subDivision", { length: 50 }),
  
  // 월별 데이터 (1~12월) - 변경 전 값
  month1: decimal("month1", { precision: 20, scale: 2 }).default("0"),
  month2: decimal("month2", { precision: 20, scale: 2 }).default("0"),
  month3: decimal("month3", { precision: 20, scale: 2 }).default("0"),
  month4: decimal("month4", { precision: 20, scale: 2 }).default("0"),
  month5: decimal("month5", { precision: 20, scale: 2 }).default("0"),
  month6: decimal("month6", { precision: 20, scale: 2 }).default("0"),
  month7: decimal("month7", { precision: 20, scale: 2 }).default("0"),
  month8: decimal("month8", { precision: 20, scale: 2 }).default("0"),
  month9: decimal("month9", { precision: 20, scale: 2 }).default("0"),
  month10: decimal("month10", { precision: 20, scale: 2 }).default("0"),
  month11: decimal("month11", { precision: 20, scale: 2 }).default("0"),
  month12: decimal("month12", { precision: 20, scale: 2 }).default("0"),
  
  // 연간 합계
  total: decimal("total", { precision: 20, scale: 2 }).default("0"),
  
  // 변경 정보
  changedBy: int("changedBy").references(() => users.id), // 변경한 사용자
  changeReason: text("changeReason"), // 변경 사유
  
  // 버전 번호 (같은 businessPlanId에 대해 순차적으로 증가)
  version: int("version").notNull().default(1),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BusinessPlanHistory = typeof businessPlanHistory.$inferSelect;
export type InsertBusinessPlanHistory = typeof businessPlanHistory.$inferInsert;


/**
 * 계약현황 사업계획 테이블 - Contract Business Plans
 * 연도별, 채널별 월별 계약 목표 데이터
 */
export const contractBusinessPlans = mysqlTable("contractBusinessPlans", {
  id: int("id").autoincrement().primaryKey(),
  
  // 연도
  year: int("year").notNull(),
  
  // 채널: internal(내부채널), external(외부채널)
  channel: varchar("channel", { length: 50 }).notNull(),
  
  // 세부 채널: 상담전화, 샘플신청, 채널톡, 홈피문의, 라이브커머스, 베이비페어 등
  subChannel: varchar("subChannel", { length: 100 }),
  
  // 월별 목표 데이터 (1~12월)
  month1: int("month1").default(0),
  month2: int("month2").default(0),
  month3: int("month3").default(0),
  month4: int("month4").default(0),
  month5: int("month5").default(0),
  month6: int("month6").default(0),
  month7: int("month7").default(0),
  month8: int("month8").default(0),
  month9: int("month9").default(0),
  month10: int("month10").default(0),
  month11: int("month11").default(0),
  month12: int("month12").default(0),
  
  // 연간 합계
  total: int("total").default(0),
  
  // 월별 실적 데이터 (1~12월)
  actual1: int("actual1").default(0),
  actual2: int("actual2").default(0),
  actual3: int("actual3").default(0),
  actual4: int("actual4").default(0),
  actual5: int("actual5").default(0),
  actual6: int("actual6").default(0),
  actual7: int("actual7").default(0),
  actual8: int("actual8").default(0),
  actual9: int("actual9").default(0),
  actual10: int("actual10").default(0),
  actual11: int("actual11").default(0),
  actual12: int("actual12").default(0),
  
  // 연간 실적 합계
  actualTotal: int("actualTotal").default(0),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContractBusinessPlan = typeof contractBusinessPlans.$inferSelect;
export type InsertContractBusinessPlan = typeof contractBusinessPlans.$inferInsert;

/**
 * 계약현황 사업계획 변경 이력 테이블 - Contract Business Plan History
 * 계약 목표 변경 시 이전 데이터 저장
 */
export const contractBusinessPlanHistory = mysqlTable("contractBusinessPlanHistory", {
  id: int("id").autoincrement().primaryKey(),
  
  // 원본 계약 사업계획 ID
  contractBusinessPlanId: int("contractBusinessPlanId").notNull().references(() => contractBusinessPlans.id),
  
  // 연도
  year: int("year").notNull(),
  
  // 채널
  channel: varchar("channel", { length: 50 }).notNull(),
  
  // 세부 채널
  subChannel: varchar("subChannel", { length: 100 }),
  
  // 월별 데이터 (1~12월) - 변경 전 값
  month1: int("month1").default(0),
  month2: int("month2").default(0),
  month3: int("month3").default(0),
  month4: int("month4").default(0),
  month5: int("month5").default(0),
  month6: int("month6").default(0),
  month7: int("month7").default(0),
  month8: int("month8").default(0),
  month9: int("month9").default(0),
  month10: int("month10").default(0),
  month11: int("month11").default(0),
  month12: int("month12").default(0),
  
  // 연간 합계
  total: int("total").default(0),
  
  // 변경 정보
  changedBy: int("changedBy").references(() => users.id),
  changeReason: text("changeReason"),
  
  // 버전 번호
  version: int("version").notNull().default(1),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContractBusinessPlanHistory = typeof contractBusinessPlanHistory.$inferSelect;
export type InsertContractBusinessPlanHistory = typeof contractBusinessPlanHistory.$inferInsert;

/**
 * 업무 첨부파일 테이블 - Task Attachments
 * 업무별 파일 첨부 관리 (S3 저장)
 */
export const taskAttachments = mysqlTable("task_attachments", {
  id: int("id").autoincrement().primaryKey(),
  taskId: varchar("taskId", { length: 36 }).notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id), // 업로드한 사용자
  fileName: varchar("fileName", { length: 500 }).notNull(), // 원본 파일명
  fileKey: varchar("fileKey", { length: 500 }).notNull(), // S3 파일 키
  url: text("url").notNull(), // S3 URL
  mimeType: varchar("mimeType", { length: 200 }).default("application/octet-stream"), // MIME 타입
  fileSize: bigint("fileSize", { mode: "number" }).default(0), // 파일 크기 (bytes)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TaskAttachment = typeof taskAttachments.$inferSelect;
export type InsertTaskAttachment = typeof taskAttachments.$inferInsert;

/**
 * Financial Records table - 재무현황
 * 주단위 현금 입금/출금/잔액 관리
 * 소유자(owner)만 접근 가능
 */
export const financialRecords = mysqlTable("financial_records", {
  id: varchar("id", { length: 36 }).primaryKey(),
  year: int("year").notNull(), // 연도
  month: int("month").notNull(), // 월
  week: int("week").notNull(), // 주차 (1~5)
  category: varchar("category", { length: 100 }).notNull(), // 항목명 (예: 매출입금, 급여, 임대료 등)
  type: mysqlEnum("type", ["income", "expense"]).notNull(), // 입금/출금
  amount: bigint("amount", { mode: "number" }).default(0).notNull(), // 금액
  description: text("description"), // 비고/설명
  sortOrder: int("sortOrder").default(0).notNull(), // 정렬 순서
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FinancialRecord = typeof financialRecords.$inferSelect;
export type InsertFinancialRecord = typeof financialRecords.$inferInsert;

/**
 * Financial Balance table - 재무 잔액
 * 월별 기초잔액 관리
 */
export const financialBalances = mysqlTable("financial_balances", {
  id: varchar("id", { length: 36 }).primaryKey(),
  year: int("year").notNull(), // 연도
  month: int("month").notNull(), // 월
  openingBalance: bigint("openingBalance", { mode: "number" }).default(0).notNull(), // 기초잔액
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FinancialBalance = typeof financialBalances.$inferSelect;
export type InsertFinancialBalance = typeof financialBalances.$inferInsert;

/**
 * KPI 업무 항목 테이블 - KPI Items
 * 사업부/부서/담당자별 업무 및 KPI 지표 마스터 데이터
 */
export const kpiItems = mysqlTable("kpi_items", {
  id: int("id").autoincrement().primaryKey(),
  division: varchar("division", { length: 100 }).notNull(), // 사업부 (매트사업부, 제조사업부)
  department: varchar("department", { length: 100 }).notNull(), // 부서 (마케팅팀, 고객영업팀 등)
  person: varchar("person", { length: 100 }).notNull(), // 담당자
  category: varchar("category", { length: 100 }).notNull(), // 카테고리 (컨텐츠기획, 퍼포먼스 등)
  task: varchar("task", { length: 200 }).notNull(), // 업무 (이벤트 관리, 전화상담 등)
  goal: varchar("goal", { length: 500 }).default(""), // 목표
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KpiItem = typeof kpiItems.$inferSelect;
export type InsertKpiItem = typeof kpiItems.$inferInsert;

/**
 * KPI 지표 테이블 - KPI Indicators
 * 각 업무 항목별 KPI 지표 (하나의 업무에 여러 KPI 가능)
 */
export const kpiIndicators = mysqlTable("kpi_indicators", {
  id: int("id").autoincrement().primaryKey(),
  kpiItemId: int("kpiItemId").notNull().references(() => kpiItems.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(), // KPI 지표명 (이벤트 노출수, 참여자수 등)
  unit: varchar("unit", { length: 50 }).default(""), // 단위 (건, 원, %, 명 등)
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KpiIndicator = typeof kpiIndicators.$inferSelect;
export type InsertKpiIndicator = typeof kpiIndicators.$inferInsert;

/**
 * KPI 실적 데이터 테이블 - KPI Records
 * 주간 단위 실적 입력 데이터
 */
export const kpiRecords = mysqlTable("kpi_records", {
  id: int("id").autoincrement().primaryKey(),
  kpiIndicatorId: int("kpiIndicatorId").notNull().references(() => kpiIndicators.id, { onDelete: "cascade" }),
  year: int("year").notNull(), // 연도
  month: int("month").notNull(), // 월 (1~12)
  week: int("week").notNull(), // 주차 (1~5)
  value: decimal("value", { precision: 15, scale: 2 }).default("0"), // 실적 값
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KpiRecord = typeof kpiRecords.$inferSelect;
export type InsertKpiRecord = typeof kpiRecords.$inferInsert;

/**
 * KPI 목표/전월실적 테이블 - KPI Targets
 * 지표별 월별 금월목표 및 전월실적 저장
 */
export const kpiTargets = mysqlTable("kpi_targets", {
  id: int("id").autoincrement().primaryKey(),
  kpiIndicatorId: int("kpiIndicatorId").notNull().references(() => kpiIndicators.id, { onDelete: "cascade" }),
  year: int("year").notNull(), // 연도
  month: int("month").notNull(), // 월 (1~12)
  monthlyTarget: decimal("monthlyTarget", { precision: 15, scale: 2 }).default("0"), // 금월 목표
  previousActual: decimal("previousActual", { precision: 15, scale: 2 }).default("0"), // 전월 실적
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KpiTarget = typeof kpiTargets.$inferSelect;
export type InsertKpiTarget = typeof kpiTargets.$inferInsert;

/**
 * KPI 업무 상세 테이블 - KPI Item Details
 * 업무별 월별 전월평가, 금월계획, 실행 내용 저장
 */
export const kpiItemDetails = mysqlTable("kpi_item_details", {
  id: int("id").autoincrement().primaryKey(),
  kpiItemId: int("kpiItemId").notNull().references(() => kpiItems.id, { onDelete: "cascade" }),
  year: int("year").notNull(), // 연도
  month: int("month").notNull(), // 월 (1~12)
  previousEvaluation: text("previousEvaluation"), // 전월평가
  currentPlan: text("currentPlan"), // 금월계획
  execution: text("execution"), // 실행
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KpiItemDetail = typeof kpiItemDetails.$inferSelect;
export type InsertKpiItemDetail = typeof kpiItemDetails.$inferInsert;

/**
 * KPI 담당자 테이블 - KPI Assignees
 * 업무별 담당자 배정 관리 (추가/삭제 가능)
 */
export const kpiAssignees = mysqlTable("kpi_assignees", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // 담당자 이름
  department: varchar("department", { length: 100 }).notNull(), // 소속 부서
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KpiAssignee = typeof kpiAssignees.$inferSelect;
export type InsertKpiAssignee = typeof kpiAssignees.$inferInsert;


/**
 * 보고서 테이블 - Reports
 * 팀별/개인별 주간·월간 보고서 자동 생성 및 저장
 */
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  
  // 보고서 유형: weekly(주간), monthly(월간)
  type: mysqlEnum("reportType", ["weekly", "monthly"]).notNull(),
  
  // 보고서 범위: individual(개인), team(팀), division(사업부)
  scope: mysqlEnum("reportScope", ["individual", "team", "division"]).notNull(),
  
  // 대상 정보
  targetUserId: int("targetUserId").references(() => users.id), // 개인 보고서 대상 사용자
  targetTeamId: int("targetTeamId").references(() => teams.id), // 팀 보고서 대상 팀
  targetDivisionId: int("targetDivisionId").references(() => divisions.id), // 사업부 보고서 대상
  
  // 기간
  year: int("year").notNull(),
  month: int("month").notNull(),
  week: int("week"), // 주간 보고서일 경우 주차 (1~5), 월간은 null
  
  // 보고서 제목
  title: varchar("title", { length: 500 }).notNull(),
  
  // 자동 생성된 보고서 내용 (JSON 형태로 구조화된 데이터)
  content: text("content").notNull(), // JSON: 업무 현황, KPI 실적, 요약 등
  
  // 수동 추가 내용
  summary: text("summary"), // 관리자가 추가한 요약/코멘트
  nextPlan: text("nextPlan"), // 차주/차월 계획
  issues: text("issues"), // 이슈 및 건의사항
  
  // 생성 정보
  generatedBy: int("generatedBy").references(() => users.id), // 보고서 생성자
  
  // 상태
  status: mysqlEnum("reportStatus", ["draft", "finalized"]).default("draft").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;
