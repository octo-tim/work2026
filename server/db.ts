import { eq, and, desc, max, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, tasks, InsertTask, Task, salesCategories, SalesCategory, InsertSalesCategory, salesItems, SalesItem, InsertSalesItem, contractChannels, ContractChannel, InsertContractChannel, contractSubChannels, ContractSubChannel, InsertContractSubChannel, taskProgressLogs, TaskProgressLog, InsertTaskProgressLog, salesEvents, SalesEvent, InsertSalesEvent, monthlyMessages, MonthlyMessage, InsertMonthlyMessage, businessPlans, BusinessPlan, InsertBusinessPlan, businessPlanActuals, BusinessPlanActual, InsertBusinessPlanActual, businessPlanHistory, BusinessPlanHistory, InsertBusinessPlanHistory, salesRecords, SalesRecord, InsertSalesRecord, contractRecords, ContractRecord, InsertContractRecord, contractBusinessPlans, ContractBusinessPlan, InsertContractBusinessPlan, contractBusinessPlanHistory, ContractBusinessPlanHistory, InsertContractBusinessPlanHistory, taskAttachments, TaskAttachment, InsertTaskAttachment, financialRecords, FinancialRecord, InsertFinancialRecord, financialBalances, FinancialBalance, InsertFinancialBalance, kpiItems, KpiItem, InsertKpiItem, kpiIndicators, KpiIndicator, InsertKpiIndicator, kpiRecords, KpiRecord, InsertKpiRecord, kpiTargets, KpiTarget, InsertKpiTarget, kpiItemDetails, KpiItemDetail, InsertKpiItemDetail, kpiAssignees, KpiAssignee, InsertKpiAssignee, reports, Report, InsertReport } from "../drizzle/schema";
import { ENV } from './_core/env';
import { nanoid } from "nanoid";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== Task Functions ====================

export async function getTasksByUserId(userId: number): Promise<(Task & { progressLogs: TaskProgressLog[] })[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get tasks: database not available");
    return [];
  }

  const result = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(desc(tasks.createdAt));

  // 각 업무에 대한 진행 이력 조회
  const tasksWithLogs = await Promise.all(
    result.map(async (task) => {
      const logs = await db
        .select()
        .from(taskProgressLogs)
        .where(eq(taskProgressLogs.taskId, task.id))
        .orderBy(desc(taskProgressLogs.logDate))
        .limit(3); // 최근 3개만 가져옴
      return { ...task, progressLogs: logs };
    })
  );

  return tasksWithLogs;
}

export async function getNextTaskNumber(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) {
    return 1;
  }

  const result = await db
    .select({ maxNumber: max(tasks.number) })
    .from(tasks)
    .where(eq(tasks.userId, userId));

  const maxNumber = result[0]?.maxNumber ?? 0;
  return maxNumber + 1;
}

export async function createTask(data: {
  userId: number;
  number: number;
  title: string;
  department?: string;
  assignee?: string;
  schedule?: string;
  details?: string;
  status?: "pending" | "in-progress" | "completed";
  startDate?: Date;
  dueDate?: Date;
}): Promise<Task> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const id = nanoid();
  const taskData: InsertTask = {
    id,
    userId: data.userId,
    number: data.number,
    title: data.title,
    department: data.department ?? "",
    assignee: data.assignee ?? "",
    schedule: data.schedule ?? "",
    details: data.details ?? "",
    status: data.status ?? "pending",
    startDate: data.startDate ?? null,
    dueDate: data.dueDate ?? null,
  };

  await db.insert(tasks).values(taskData);

  const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return result[0];
}

export async function updateTask(
  id: string,
  userId: number,
  updates: Partial<{
    title: string;
    department: string;
    assignee: string;
    schedule: string;
    details: string;
    status: "pending" | "in-progress" | "completed";
    startDate: Date | null;
    dueDate: Date | null;
  }>,
  isAdmin: boolean = false
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 관리자는 모든 업무 수정 가능, 일반 사용자는 본인 업무만 수정 가능
  const whereCondition = isAdmin
    ? eq(tasks.id, id)
    : and(eq(tasks.id, id), eq(tasks.userId, userId));

  await db
    .update(tasks)
    .set(updates)
    .where(whereCondition);
}

export async function updateTaskStatus(
  id: string,
  userId: number,
  status: "pending" | "in-progress" | "completed",
  isAdmin: boolean = false
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 관리자는 모든 업무 상태 변경 가능
  const whereCondition = isAdmin
    ? eq(tasks.id, id)
    : and(eq(tasks.id, id), eq(tasks.userId, userId));

  await db
    .update(tasks)
    .set({ status })
    .where(whereCondition);
}

export async function deleteTask(id: string, userId: number, isAdmin: boolean = false): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 관리자는 모든 업무 삭제 가능
  const whereCondition = isAdmin
    ? eq(tasks.id, id)
    : and(eq(tasks.id, id), eq(tasks.userId, userId));

  await db.delete(tasks).where(whereCondition);
}


// ==================== Sales Record Functions ====================

export async function getSalesRecords(
  year: number,
  month: number,
  division?: string
): Promise<SalesRecord[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get sales records: database not available");
    return [];
  }

  // 모든 사용자가 매출 데이터를 볼 수 있도록 userId 조건 제거
  const conditions = [
    eq(salesRecords.year, year),
    eq(salesRecords.month, month),
  ];

  if (division) {
    conditions.push(eq(salesRecords.division, division));
  }

  const result = await db
    .select()
    .from(salesRecords)
    .where(and(...conditions));

  return result;
}

export async function createSalesRecord(data: {
  userId: number;
  division: string;
  productGroup: string;
  monthlyTarget?: number;
  previousMonthSales?: number;
  week1Sales?: number;
  week2Sales?: number;
  week3Sales?: number;
  week4Sales?: number;
  week5Sales?: number;
  cumulativeSales?: number;
  achievementRate?: string;
  year: number;
  month: number;
}): Promise<SalesRecord> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const id = nanoid();
  const recordData: InsertSalesRecord = {
    id,
    userId: data.userId,
    division: data.division,
    productGroup: data.productGroup,
    monthlyTarget: data.monthlyTarget ?? 0,
    previousMonthSales: data.previousMonthSales ?? 0,
    week1Sales: data.week1Sales ?? 0,
    week2Sales: data.week2Sales ?? 0,
    week3Sales: data.week3Sales ?? 0,
    week4Sales: data.week4Sales ?? 0,
    week5Sales: data.week5Sales ?? 0,
    cumulativeSales: data.cumulativeSales ?? 0,
    achievementRate: data.achievementRate ?? "0",
    year: data.year,
    month: data.month,
  };

  await db.insert(salesRecords).values(recordData);

  const result = await db.select().from(salesRecords).where(eq(salesRecords.id, id)).limit(1);
  return result[0];
}

export async function updateSalesRecord(
  id: string,
  userId: number,
  updates: Partial<{
    productGroup: string;
    monthlyTarget: number;
    previousMonthSales: number;
    week1Sales: number;
    week2Sales: number;
    week3Sales: number;
    week4Sales: number;
    week5Sales: number;
    cumulativeSales: number;
    achievementRate: string;
  }>
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // userId 조건 제거 - 매출 편집 권한이 있는 사용자는 누구나 수정 가능
  await db
    .update(salesRecords)
    .set(updates)
    .where(eq(salesRecords.id, id));
}

export async function deleteSalesRecord(id: string, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // userId 조건 제거 - 매출 편집 권한이 있는 사용자는 누구나 삭제 가능
  await db.delete(salesRecords).where(eq(salesRecords.id, id));
}

export async function upsertSalesRecord(data: {
  userId: number;
  division: string;
  productGroup: string;
  monthlyTarget?: number;
  previousMonthSales?: number;
  week1Sales?: number;
  week2Sales?: number;
  week3Sales?: number;
  week4Sales?: number;
  week5Sales?: number;
  year: number;
  month: number;
}): Promise<SalesRecord> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Check if record exists (userId 조건 제거 - 사업부+제품그룹+년월 기준으로 하나의 레코드만 유지)
  const existing = await db
    .select()
    .from(salesRecords)
    .where(
      and(
        eq(salesRecords.division, data.division),
        eq(salesRecords.productGroup, data.productGroup),
        eq(salesRecords.year, data.year),
        eq(salesRecords.month, data.month)
      )
    )
    .limit(1);

  // Calculate cumulative and achievement rate
  const cumulative = (data.week1Sales ?? 0) + (data.week2Sales ?? 0) + (data.week3Sales ?? 0) + (data.week4Sales ?? 0) + (data.week5Sales ?? 0);
  const target = data.monthlyTarget ?? 0;
  const rate = target > 0 ? ((cumulative / target) * 100).toFixed(1) : "0";

  if (existing.length > 0) {
    // Update existing record
    await db
      .update(salesRecords)
      .set({
        monthlyTarget: data.monthlyTarget ?? existing[0].monthlyTarget,
        previousMonthSales: data.previousMonthSales ?? existing[0].previousMonthSales,
        week1Sales: data.week1Sales ?? existing[0].week1Sales,
        week2Sales: data.week2Sales ?? existing[0].week2Sales,
        week3Sales: data.week3Sales ?? existing[0].week3Sales,
        week4Sales: data.week4Sales ?? existing[0].week4Sales,
        week5Sales: data.week5Sales ?? existing[0].week5Sales,
        cumulativeSales: cumulative,
        achievementRate: rate,
      })
      .where(eq(salesRecords.id, existing[0].id));

    const result = await db.select().from(salesRecords).where(eq(salesRecords.id, existing[0].id)).limit(1);
    return result[0];
  } else {
    // Create new record
    const id = nanoid();
    const recordData: InsertSalesRecord = {
      id,
      userId: data.userId,
      division: data.division,
      productGroup: data.productGroup,
      monthlyTarget: data.monthlyTarget ?? 0,
      previousMonthSales: data.previousMonthSales ?? 0,
      week1Sales: data.week1Sales ?? 0,
      week2Sales: data.week2Sales ?? 0,
      week3Sales: data.week3Sales ?? 0,
      week4Sales: data.week4Sales ?? 0,
      week5Sales: data.week5Sales ?? 0,
      cumulativeSales: cumulative,
      achievementRate: rate,
      year: data.year,
      month: data.month,
    };

    await db.insert(salesRecords).values(recordData);

    const result = await db.select().from(salesRecords).where(eq(salesRecords.id, id)).limit(1);
    return result[0];
  }
}

// ==================== Contract Record Functions ====================

export async function getContractRecords(
  year: number,
  month: number,
  brand?: string
): Promise<ContractRecord[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get contract records: database not available");
    return [];
  }

  // 모든 사용자가 계약 데이터를 볼 수 있도록 userId 조건 제거
  const conditions = [
    eq(contractRecords.year, year),
    eq(contractRecords.month, month)
  ];
  if (brand) {
    conditions.push(eq(contractRecords.brand, brand));
  }

  const result = await db
    .select()
    .from(contractRecords)
    .where(and(...conditions));

  return result;
}

export async function createContractRecord(data: {
  userId: number;
  brand?: string;
  channel: string;
  previousMonthCount?: number;
  monthlyTarget?: number;
  week1Count?: number;
  week2Count?: number;
  week3Count?: number;
  week4Count?: number;
  week5Count?: number;
  totalCount?: number;
  year: number;
  month: number;
}): Promise<ContractRecord> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const id = nanoid();
  const recordData: InsertContractRecord = {
    id,
    userId: data.userId,
    brand: data.brand ?? 'bombom',
    channel: data.channel,
    previousMonthCount: data.previousMonthCount ?? 0,
    monthlyTarget: data.monthlyTarget ?? 0,
    week1Count: data.week1Count ?? 0,
    week2Count: data.week2Count ?? 0,
    week3Count: data.week3Count ?? 0,
    week4Count: data.week4Count ?? 0,
    week5Count: data.week5Count ?? 0,
    totalCount: data.totalCount ?? 0,
    year: data.year,
    month: data.month,
  };

  await db.insert(contractRecords).values(recordData);

  const result = await db.select().from(contractRecords).where(eq(contractRecords.id, id)).limit(1);
  return result[0];
}

export async function updateContractRecord(
  id: string,
  userId: number,
  updates: Partial<{
    channel: string;
    previousMonthCount: number;
    monthlyTarget: number;
    week1Count: number;
    week2Count: number;
    week3Count: number;
    week4Count: number;
    week5Count: number;
    totalCount: number;
  }>
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // userId 조건 제거 - 매출 편집 권한이 있는 사용자는 누구나 수정 가능
  await db
    .update(contractRecords)
    .set(updates)
    .where(eq(contractRecords.id, id));
}

export async function deleteContractRecord(id: string, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // userId 조건 제거 - 매출 편집 권한이 있는 사용자는 누구나 삭제 가능
  await db.delete(contractRecords).where(eq(contractRecords.id, id));
}

export async function upsertContractRecord(data: {
  userId: number;
  brand?: string;
  channel: string;
  subChannel?: string | null;
  previousMonthCount?: number;
  monthlyTarget?: number;
  week1Count?: number;
  week2Count?: number;
  week3Count?: number;
  week4Count?: number;
  week5Count?: number;
  year: number;
  month: number;
}): Promise<ContractRecord> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const brandValue = data.brand ?? 'bombom';

  // Check if record exists (brand+채널+년월 기준으로 하나의 레코드만 유지)
  const conditions = [
    eq(contractRecords.brand, brandValue),
    eq(contractRecords.channel, data.channel),
    eq(contractRecords.year, data.year),
    eq(contractRecords.month, data.month)
  ];
  
  // Handle subChannel matching
  if (data.subChannel) {
    conditions.push(eq(contractRecords.subChannel, data.subChannel));
  }

  const existing = await db
    .select()
    .from(contractRecords)
    .where(and(...conditions))
    .limit(1);

  // Calculate total and achievement rate
  const total = (data.week1Count ?? 0) + (data.week2Count ?? 0) + (data.week3Count ?? 0) + (data.week4Count ?? 0) + (data.week5Count ?? 0);
  const target = data.monthlyTarget ?? 0;
  const rate = target > 0 ? ((total / target) * 100).toFixed(1) : "0";

  if (existing.length > 0) {
    // Update existing record
    await db
      .update(contractRecords)
      .set({
        previousMonthCount: data.previousMonthCount ?? existing[0].previousMonthCount,
        monthlyTarget: data.monthlyTarget ?? existing[0].monthlyTarget,
        week1Count: data.week1Count ?? existing[0].week1Count,
        week2Count: data.week2Count ?? existing[0].week2Count,
        week3Count: data.week3Count ?? existing[0].week3Count,
        week4Count: data.week4Count ?? existing[0].week4Count,
        week5Count: data.week5Count ?? existing[0].week5Count,
        totalCount: total,
        achievementRate: rate,
      })
      .where(eq(contractRecords.id, existing[0].id));

    const result = await db.select().from(contractRecords).where(eq(contractRecords.id, existing[0].id)).limit(1);
    return result[0];
  } else {
    // Create new record
    const id = nanoid();
    const recordData: InsertContractRecord = {
      id,
      userId: data.userId,
      brand: brandValue,
      channel: data.channel,
      subChannel: data.subChannel ?? null,
      previousMonthCount: data.previousMonthCount ?? 0,
      monthlyTarget: data.monthlyTarget ?? 0,
      week1Count: data.week1Count ?? 0,
      week2Count: data.week2Count ?? 0,
      week3Count: data.week3Count ?? 0,
      week4Count: data.week4Count ?? 0,
      week5Count: data.week5Count ?? 0,
      totalCount: total,
      achievementRate: rate,
      year: data.year,
      month: data.month,
    };

    await db.insert(contractRecords).values(recordData);

    const result = await db.select().from(contractRecords).where(eq(contractRecords.id, id)).limit(1);
    return result[0];
  }
}


// ==================== Goal Functions ====================

import { goals, Goal, InsertGoal } from "../drizzle/schema";

export async function getGoalsByUserId(
  userId: number,
  year: number
): Promise<Goal[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get goals: database not available");
    return [];
  }

  const result = await db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.userId, userId),
        eq(goals.year, year)
      )
    );

  return result;
}

export async function createGoal(data: {
  userId: number;
  year: number;
  category: string;
  title: string;
  description?: string;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  priority?: "high" | "medium" | "low";
  status?: "not-started" | "in-progress" | "completed" | "delayed";
  startDate?: string;
  endDate?: string;
}): Promise<Goal> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const id = nanoid();
  const goalData: InsertGoal = {
    id,
    userId: data.userId,
    year: data.year,
    category: data.category,
    title: data.title,
    description: data.description ?? null,
    targetValue: data.targetValue ?? 0,
    currentValue: data.currentValue ?? 0,
    unit: data.unit ?? "",
    priority: data.priority ?? "medium",
    status: data.status ?? "not-started",
    startDate: data.startDate ?? null,
    endDate: data.endDate ?? null,
  };

  await db.insert(goals).values(goalData);

  const result = await db.select().from(goals).where(eq(goals.id, id)).limit(1);
  return result[0];
}

export async function updateGoal(
  id: string,
  userId: number,
  updates: Partial<{
    category: string;
    title: string;
    description: string;
    targetValue: number;
    currentValue: number;
    unit: string;
    priority: "high" | "medium" | "low";
    status: "not-started" | "in-progress" | "completed" | "delayed";
    startDate: string;
    endDate: string;
  }>
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(goals)
    .set(updates)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)));
}

export async function deleteGoal(id: string, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)));
}


// ==================== Organization Functions ====================

import { 
  divisions, Division, InsertDivision,
  teams, Team, InsertTeam,
  positions, Position, InsertPosition,
  ranks, Rank, InsertRank
} from "../drizzle/schema";

// Division Functions
export async function getAllDivisions(): Promise<Division[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get divisions: database not available");
    return [];
  }

  const result = await db
    .select()
    .from(divisions)
    .orderBy(divisions.sortOrder);

  return result;
}

export async function getActiveDivisions(): Promise<Division[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const result = await db
    .select()
    .from(divisions)
    .where(eq(divisions.isActive, true))
    .orderBy(divisions.sortOrder);

  return result;
}

export async function createDivision(data: {
  name: string;
  description?: string;
  sortOrder?: number;
}): Promise<Division> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const divisionData: InsertDivision = {
    name: data.name,
    description: data.description ?? null,
    sortOrder: data.sortOrder ?? 0,
  };

  await db.insert(divisions).values(divisionData);

  const result = await db.select().from(divisions).where(eq(divisions.name, data.name)).limit(1);
  return result[0];
}

export async function updateDivision(
  id: number,
  updates: Partial<{
    name: string;
    description: string;
    isActive: boolean;
    sortOrder: number;
  }>
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(divisions).set(updates).where(eq(divisions.id, id));
}

export async function deleteDivision(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.delete(divisions).where(eq(divisions.id, id));
}

// Team Functions
export async function getAllTeams(): Promise<Team[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get teams: database not available");
    return [];
  }

  const result = await db
    .select()
    .from(teams)
    .orderBy(teams.sortOrder);

  return result;
}

export async function getTeamsByDivision(divisionId: number): Promise<Team[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const result = await db
    .select()
    .from(teams)
    .where(and(eq(teams.divisionId, divisionId), eq(teams.isActive, true)))
    .orderBy(teams.sortOrder);

  return result;
}

export async function createTeam(data: {
  divisionId: number;
  name: string;
  description?: string;
  sortOrder?: number;
}): Promise<Team> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const teamData: InsertTeam = {
    divisionId: data.divisionId,
    name: data.name,
    description: data.description ?? null,
    sortOrder: data.sortOrder ?? 0,
  };

  await db.insert(teams).values(teamData);

  const result = await db
    .select()
    .from(teams)
    .where(and(eq(teams.divisionId, data.divisionId), eq(teams.name, data.name)))
    .limit(1);
  return result[0];
}

export async function updateTeam(
  id: number,
  updates: Partial<{
    divisionId: number;
    name: string;
    description: string;
    isActive: boolean;
    sortOrder: number;
  }>
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(teams).set(updates).where(eq(teams.id, id));
}

export async function deleteTeam(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.delete(teams).where(eq(teams.id, id));
}

export async function getActiveTeams(): Promise<Team[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get active teams: database not available");
    return [];
  }

  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.isActive, true))
    .orderBy(teams.sortOrder);

  return result;
}

// Position Functions
export async function getAllPositions(): Promise<Position[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get positions: database not available");
    return [];
  }

  const result = await db
    .select()
    .from(positions)
    .orderBy(positions.sortOrder);

  return result;
}

export async function getActivePositions(): Promise<Position[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const result = await db
    .select()
    .from(positions)
    .where(eq(positions.isActive, true))
    .orderBy(positions.sortOrder);

  return result;
}

export async function getPositionById(id: number): Promise<Position | null> {
  const db = await getDb();
  if (!db) {
    return null;
  }

  const result = await db
    .select()
    .from(positions)
    .where(eq(positions.id, id))
    .limit(1);

  return result[0] ?? null;
}

export async function createPosition(data: {
  name: string;
  description?: string;
  sortOrder?: number;
}): Promise<Position> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const positionData: InsertPosition = {
    name: data.name,
    description: data.description ?? null,
    sortOrder: data.sortOrder ?? 0,
  };

  await db.insert(positions).values(positionData);

  const result = await db.select().from(positions).where(eq(positions.name, data.name)).limit(1);
  return result[0];
}

export async function updatePosition(
  id: number,
  updates: Partial<{
    name: string;
    description: string;
    isActive: boolean;
    sortOrder: number;
  }>
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(positions).set(updates).where(eq(positions.id, id));
}

export async function deletePosition(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.delete(positions).where(eq(positions.id, id));
}

// Rank Functions
export async function getAllRanks(): Promise<Rank[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get ranks: database not available");
    return [];
  }

  const result = await db
    .select()
    .from(ranks)
    .orderBy(ranks.sortOrder);

  return result;
}

export async function getActiveRanks(): Promise<Rank[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const result = await db
    .select()
    .from(ranks)
    .where(eq(ranks.isActive, true))
    .orderBy(ranks.sortOrder);

  return result;
}

export async function createRank(data: {
  name: string;
  level?: number;
  description?: string;
  sortOrder?: number;
}): Promise<Rank> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const rankData: InsertRank = {
    name: data.name,
    level: data.level ?? 0,
    description: data.description ?? null,
    sortOrder: data.sortOrder ?? 0,
  };

  await db.insert(ranks).values(rankData);

  const result = await db.select().from(ranks).where(eq(ranks.name, data.name)).limit(1);
  return result[0];
}

export async function updateRank(
  id: number,
  updates: Partial<{
    name: string;
    level: number;
    description: string;
    isActive: boolean;
    sortOrder: number;
  }>
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(ranks).set(updates).where(eq(ranks.id, id));
}

export async function deleteRank(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.delete(ranks).where(eq(ranks.id, id));
}

// User Profile Update Function
export async function updateUserProfile(
  userId: number,
  updates: Partial<{
    koreanName: string | null;
    divisionId: number | null;
    teamId: number | null;
    positionId: number | null;
    rankId: number | null;
    isProfileComplete: boolean;
  }>
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(users).set(updates).where(eq(users.id, userId));
}

export async function getUserWithOrganization(userId: number) {
  const db = await getDb();
  if (!db) {
    return null;
  }

  const result = await db
    .select({
      user: users,
      division: divisions,
      team: teams,
      position: positions,
      rank: ranks,
    })
    .from(users)
    .leftJoin(divisions, eq(users.divisionId, divisions.id))
    .leftJoin(teams, eq(users.teamId, teams.id))
    .leftJoin(positions, eq(users.positionId, positions.id))
    .leftJoin(ranks, eq(users.rankId, ranks.id))
    .where(eq(users.id, userId))
    .limit(1);

  return result[0] ?? null;
}


// ==================== Quarterly Review Functions ====================

import { quarterlyReviews, QuarterlyReview, InsertQuarterlyReview } from "../drizzle/schema";

export async function getQuarterlyReviews(
  year: number
): Promise<QuarterlyReview[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get quarterly reviews: database not available");
    return [];
  }

  const result = await db
    .select()
    .from(quarterlyReviews)
    .where(eq(quarterlyReviews.year, year))
    .orderBy(quarterlyReviews.quarter);

  return result;
}

export async function getQuarterlyReviewByQuarter(
  year: number,
  quarter: "Q1" | "Q2" | "Q3" | "Q4"
): Promise<QuarterlyReview | null> {
  const db = await getDb();
  if (!db) {
    return null;
  }

  const result = await db
    .select()
    .from(quarterlyReviews)
    .where(
      and(
        eq(quarterlyReviews.year, year),
        eq(quarterlyReviews.quarter, quarter)
      )
    )
    .limit(1);

  return result[0] ?? null;
}

export async function createQuarterlyReview(data: {
  userId: number;
  year: number;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  salesTarget?: number;
  salesActual?: number;
  profitTarget?: number;
  profitActual?: number;
  strategy1Progress?: number;
  strategy2Progress?: number;
  strategy3Progress?: number;
  strategy4Progress?: number;
  achievements?: string;
  improvements?: string;
  nextQuarterPlan?: string;
  overallRating?: "excellent" | "good" | "fair" | "poor";
  overallComment?: string;
}): Promise<QuarterlyReview> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const id = nanoid();
  const reviewData: InsertQuarterlyReview = {
    id,
    userId: data.userId,
    year: data.year,
    quarter: data.quarter,
    salesTarget: data.salesTarget ?? 0,
    salesActual: data.salesActual ?? 0,
    profitTarget: data.profitTarget ?? 0,
    profitActual: data.profitActual ?? 0,
    strategy1Progress: data.strategy1Progress ?? 0,
    strategy2Progress: data.strategy2Progress ?? 0,
    strategy3Progress: data.strategy3Progress ?? 0,
    strategy4Progress: data.strategy4Progress ?? 0,
    achievements: data.achievements ?? null,
    improvements: data.improvements ?? null,
    nextQuarterPlan: data.nextQuarterPlan ?? null,
    overallRating: data.overallRating ?? "fair",
    overallComment: data.overallComment ?? null,
  };

  await db.insert(quarterlyReviews).values(reviewData);

  const result = await db.select().from(quarterlyReviews).where(eq(quarterlyReviews.id, id)).limit(1);
  return result[0];
}

export async function updateQuarterlyReview(
  id: string,
  userId: number,
  updates: Partial<{
    salesTarget: number;
    salesActual: number;
    profitTarget: number;
    profitActual: number;
    strategy1Progress: number;
    strategy2Progress: number;
    strategy3Progress: number;
    strategy4Progress: number;
    achievements: string;
    improvements: string;
    nextQuarterPlan: string;
    overallRating: "excellent" | "good" | "fair" | "poor";
    overallComment: string;
  }>
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(quarterlyReviews)
    .set(updates)
    .where(and(eq(quarterlyReviews.id, id), eq(quarterlyReviews.userId, userId)));
}

export async function deleteQuarterlyReview(id: string, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.delete(quarterlyReviews).where(and(eq(quarterlyReviews.id, id), eq(quarterlyReviews.userId, userId)));
}


// ==================== Dashboard Statistics Functions ====================

export interface DashboardStats {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  departmentStats: {
    department: string;
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  }[];
  assigneeStats: {
    assignee: string;
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  }[];
  recentTasks: Task[];
  weeklyTrend: {
    week: string;
    completed: number;
    created: number;
  }[];
  urgentTasks: (Task & { daysLeft: number })[];
}

export async function getDashboardStats(userId: number): Promise<DashboardStats> {
  const db = await getDb();
  if (!db) {
    return {
      totalTasks: 0,
      pendingTasks: 0,
      inProgressTasks: 0,
      completedTasks: 0,
      departmentStats: [],
      assigneeStats: [],
      recentTasks: [],
      weeklyTrend: [],
      urgentTasks: [],
    };
  }

  // Get all tasks for the user
  const allTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(desc(tasks.updatedAt));

  // Calculate overall stats
  const totalTasks = allTasks.length;
  const pendingTasks = allTasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = allTasks.filter(t => t.status === 'in-progress').length;
  const completedTasks = allTasks.filter(t => t.status === 'completed').length;

  // Calculate department stats
  const departmentMap = new Map<string, { total: number; pending: number; inProgress: number; completed: number }>();
  allTasks.forEach(task => {
    const dept = task.department || '미지정';
    if (!departmentMap.has(dept)) {
      departmentMap.set(dept, { total: 0, pending: 0, inProgress: 0, completed: 0 });
    }
    const stats = departmentMap.get(dept)!;
    stats.total++;
    if (task.status === 'pending') stats.pending++;
    else if (task.status === 'in-progress') stats.inProgress++;
    else if (task.status === 'completed') stats.completed++;
  });
  const departmentStats = Array.from(departmentMap.entries()).map(([department, stats]) => ({
    department,
    ...stats,
  })).sort((a, b) => b.total - a.total);

  // Calculate assignee stats
  const assigneeMap = new Map<string, { total: number; pending: number; inProgress: number; completed: number }>();
  allTasks.forEach(task => {
    const assignee = task.assignee || '미지정';
    if (!assigneeMap.has(assignee)) {
      assigneeMap.set(assignee, { total: 0, pending: 0, inProgress: 0, completed: 0 });
    }
    const stats = assigneeMap.get(assignee)!;
    stats.total++;
    if (task.status === 'pending') stats.pending++;
    else if (task.status === 'in-progress') stats.inProgress++;
    else if (task.status === 'completed') stats.completed++;
  });
  const assigneeStats = Array.from(assigneeMap.entries()).map(([assignee, stats]) => ({
    assignee,
    ...stats,
  })).sort((a, b) => b.total - a.total);

  // Get recent tasks (last 5)
  const recentTasks = allTasks.slice(0, 5);

  // Get urgent tasks (due within 7 days, not completed)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const urgentTasks = allTasks
    .filter(t => {
      if (t.status === 'completed' || !t.dueDate) return false;
      const dueDate = new Date(t.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysLeft <= 7;
    })
    .map(t => {
      const dueDate = new Date(t.dueDate!);
      dueDate.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { ...t, daysLeft };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  // Calculate weekly trend (last 4 weeks)
  const now = new Date();
  const weeklyTrend: { week: string; completed: number; created: number }[] = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (i + 1) * 7);
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - i * 7);
    
    const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
    
    const completedInWeek = allTasks.filter(t => {
      const updatedAt = new Date(t.updatedAt);
      return t.status === 'completed' && updatedAt >= weekStart && updatedAt < weekEnd;
    }).length;
    
    const createdInWeek = allTasks.filter(t => {
      const createdAt = new Date(t.createdAt);
      return createdAt >= weekStart && createdAt < weekEnd;
    }).length;
    
    weeklyTrend.push({ week: weekLabel, completed: completedInWeek, created: createdInWeek });
  }

  return {
    totalTasks,
    pendingTasks,
    inProgressTasks,
    completedTasks,
    departmentStats,
    assigneeStats,
    recentTasks,
    weeklyTrend,
    urgentTasks,
  };
}

// Get all tasks stats for admin (across all users)
export async function getAllTasksStats(): Promise<DashboardStats> {
  const db = await getDb();
  if (!db) {
    return {
      totalTasks: 0,
      pendingTasks: 0,
      inProgressTasks: 0,
      completedTasks: 0,
      departmentStats: [],
      assigneeStats: [],
      recentTasks: [],
      weeklyTrend: [],
      urgentTasks: [],
    };
  }

  // Get all tasks
  const allTasks = await db
    .select()
    .from(tasks)
    .orderBy(desc(tasks.updatedAt));

  // Calculate overall stats
  const totalTasks = allTasks.length;
  const pendingTasks = allTasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = allTasks.filter(t => t.status === 'in-progress').length;
  const completedTasks = allTasks.filter(t => t.status === 'completed').length;

  // Calculate department stats
  const departmentMap = new Map<string, { total: number; pending: number; inProgress: number; completed: number }>();
  allTasks.forEach(task => {
    const dept = task.department || '미지정';
    if (!departmentMap.has(dept)) {
      departmentMap.set(dept, { total: 0, pending: 0, inProgress: 0, completed: 0 });
    }
    const stats = departmentMap.get(dept)!;
    stats.total++;
    if (task.status === 'pending') stats.pending++;
    else if (task.status === 'in-progress') stats.inProgress++;
    else if (task.status === 'completed') stats.completed++;
  });
  const departmentStats = Array.from(departmentMap.entries()).map(([department, stats]) => ({
    department,
    ...stats,
  })).sort((a, b) => b.total - a.total);

  // Calculate assignee stats
  const assigneeMap = new Map<string, { total: number; pending: number; inProgress: number; completed: number }>();
  allTasks.forEach(task => {
    const assignee = task.assignee || '미지정';
    if (!assigneeMap.has(assignee)) {
      assigneeMap.set(assignee, { total: 0, pending: 0, inProgress: 0, completed: 0 });
    }
    const stats = assigneeMap.get(assignee)!;
    stats.total++;
    if (task.status === 'pending') stats.pending++;
    else if (task.status === 'in-progress') stats.inProgress++;
    else if (task.status === 'completed') stats.completed++;
  });
  const assigneeStats = Array.from(assigneeMap.entries()).map(([assignee, stats]) => ({
    assignee,
    ...stats,
  })).sort((a, b) => b.total - a.total);

  // Get recent tasks (last 10)
  const recentTasks = allTasks.slice(0, 10);

  // Get urgent tasks (due within 7 days, not completed)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const urgentTasks = allTasks
    .filter(t => {
      if (t.status === 'completed' || !t.dueDate) return false;
      const dueDate = new Date(t.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysLeft <= 7;
    })
    .map(t => {
      const dueDate = new Date(t.dueDate!);
      dueDate.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { ...t, daysLeft };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 10);

  // Calculate weekly trend (last 4 weeks)
  const now = new Date();
  const weeklyTrend: { week: string; completed: number; created: number }[] = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (i + 1) * 7);
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - i * 7);
    
    const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
    
    const completedInWeek = allTasks.filter(t => {
      const updatedAt = new Date(t.updatedAt);
      return t.status === 'completed' && updatedAt >= weekStart && updatedAt < weekEnd;
    }).length;
    
    const createdInWeek = allTasks.filter(t => {
      const createdAt = new Date(t.createdAt);
      return createdAt >= weekStart && createdAt < weekEnd;
    }).length;
    
    weeklyTrend.push({ week: weekLabel, completed: completedInWeek, created: createdInWeek });
  }

  return {
    totalTasks,
    pendingTasks,
    inProgressTasks,
    completedTasks,
    departmentStats,
    assigneeStats,
    recentTasks,
    weeklyTrend,
    urgentTasks,
  };
}

// ==================== Meeting Minutes Functions ====================
import { meetingMinutes, MeetingMinute, InsertMeetingMinute } from "../drizzle/schema";

// Get all meeting minutes for a user
export async function getMeetingMinutesByUserId(userId: number): Promise<MeetingMinute[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get meeting minutes: database not available");
    return [];
  }

  const result = await db
    .select()
    .from(meetingMinutes)
    .where(eq(meetingMinutes.userId, userId))
    .orderBy(desc(meetingMinutes.meetingDate));

  return result;
}

// Get all meeting minutes (for admin)
export async function getAllMeetingMinutes(): Promise<MeetingMinute[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get meeting minutes: database not available");
    return [];
  }

  const result = await db
    .select()
    .from(meetingMinutes)
    .orderBy(desc(meetingMinutes.meetingDate));

  return result;
}

// Get a single meeting minute by ID
export async function getMeetingMinuteById(id: string): Promise<MeetingMinute | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get meeting minute: database not available");
    return null;
  }

  const result = await db
    .select()
    .from(meetingMinutes)
    .where(eq(meetingMinutes.id, id));

  return result[0] || null;
}

// Create a new meeting minute
export async function createMeetingMinute(data: {
  userId: number;
  meetingDate: Date;
  title: string;
  location?: string;
  attendees?: string;
  content?: string;
  decisions?: string;
  actionItems?: string;
  nextMeetingDate?: Date;
}): Promise<MeetingMinute> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const id = nanoid();
  await db.insert(meetingMinutes).values({
    id,
    userId: data.userId,
    meetingDate: data.meetingDate,
    title: data.title,
    location: data.location || null,
    attendees: data.attendees || null,
    content: data.content || null,
    decisions: data.decisions || null,
    actionItems: data.actionItems || null,
    nextMeetingDate: data.nextMeetingDate || null,
  });

  const result = await getMeetingMinuteById(id);
  if (!result) {
    throw new Error("Failed to create meeting minute");
  }
  return result;
}

// Update a meeting minute
export async function updateMeetingMinute(
  id: string,
  data: Partial<{
    meetingDate: Date;
    title: string;
    location: string | null;
    attendees: string | null;
    content: string | null;
    decisions: string | null;
    actionItems: string | null;
    nextMeetingDate: Date | null;
  }>
): Promise<MeetingMinute | null> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(meetingMinutes)
    .set(data)
    .where(eq(meetingMinutes.id, id));

  return getMeetingMinuteById(id);
}

// Delete a meeting minute
export async function deleteMeetingMinute(id: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.delete(meetingMinutes).where(eq(meetingMinutes.id, id));
}


// ============================================
// 매출 카테고리 관리 (Sales Categories)
// ============================================

// Get all sales categories
export async function getAllSalesCategories(): Promise<SalesCategory[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db.select().from(salesCategories).orderBy(salesCategories.sortOrder);
}

// Get active sales categories
export async function getActiveSalesCategories(): Promise<SalesCategory[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db.select().from(salesCategories)
    .where(eq(salesCategories.isActive, true))
    .orderBy(salesCategories.sortOrder);
}

// Create a sales category
export async function createSalesCategory(data: {
  name: string;
  division: string;
  sortOrder?: number;
}): Promise<SalesCategory> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(salesCategories).values({
    name: data.name,
    division: data.division,
    sortOrder: data.sortOrder ?? 0,
  });

  const [category] = await db.select().from(salesCategories)
    .where(eq(salesCategories.id, Number(result[0].insertId)));
  return category;
}

// Update a sales category
export async function updateSalesCategory(
  id: number,
  data: Partial<{ name: string; division: string; isActive: boolean; sortOrder: number }>
): Promise<SalesCategory | null> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(salesCategories).set(data).where(eq(salesCategories.id, id));
  const [category] = await db.select().from(salesCategories).where(eq(salesCategories.id, id));
  return category || null;
}

// Delete a sales category
export async function deleteSalesCategory(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // First delete all related sales items
  await db.delete(salesItems).where(eq(salesItems.categoryId, id));
  // Then delete the category
  await db.delete(salesCategories).where(eq(salesCategories.id, id));
}

// ============================================
// 매출 항목 관리 (Sales Items - 브랜드/거래처그룹)
// ============================================

// Get all sales items
export async function getAllSalesItems(): Promise<SalesItem[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db.select().from(salesItems).orderBy(salesItems.sortOrder);
}

// Get sales items by category
export async function getSalesItemsByCategory(categoryId: number): Promise<SalesItem[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db.select().from(salesItems)
    .where(eq(salesItems.categoryId, categoryId))
    .orderBy(salesItems.sortOrder);
}

// Get active sales items by category
export async function getActiveSalesItemsByCategory(categoryId: number): Promise<SalesItem[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db.select().from(salesItems)
    .where(and(eq(salesItems.categoryId, categoryId), eq(salesItems.isActive, true)))
    .orderBy(salesItems.sortOrder);
}

// Create a sales item
export async function createSalesItem(data: {
  categoryId: number;
  name: string;
  sortOrder?: number;
}): Promise<SalesItem> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(salesItems).values({
    categoryId: data.categoryId,
    name: data.name,
    sortOrder: data.sortOrder ?? 0,
  });

  const [item] = await db.select().from(salesItems)
    .where(eq(salesItems.id, Number(result[0].insertId)));
  return item;
}

// Update a sales item
export async function updateSalesItem(
  id: number,
  data: Partial<{ name: string; isActive: boolean; sortOrder: number }>
): Promise<SalesItem | null> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(salesItems).set(data).where(eq(salesItems.id, id));
  const [item] = await db.select().from(salesItems).where(eq(salesItems.id, id));
  return item || null;
}

// Delete a sales item
export async function deleteSalesItem(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.delete(salesItems).where(eq(salesItems.id, id));
}

// ============================================
// 계약 채널 관리 (Contract Channels)
// ============================================

// Get all contract channels
export async function getAllContractChannels(): Promise<ContractChannel[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db.select().from(contractChannels).orderBy(contractChannels.sortOrder);
}

// Get active contract channels
export async function getActiveContractChannels(): Promise<ContractChannel[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db.select().from(contractChannels)
    .where(eq(contractChannels.isActive, true))
    .orderBy(contractChannels.sortOrder);
}

// Create a contract channel
export async function createContractChannel(data: {
  name: string;
  sortOrder?: number;
}): Promise<ContractChannel> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(contractChannels).values({
    name: data.name,
    sortOrder: data.sortOrder ?? 0,
  });

  const [channel] = await db.select().from(contractChannels)
    .where(eq(contractChannels.id, Number(result[0].insertId)));
  return channel;
}

// Update a contract channel
export async function updateContractChannel(
  id: number,
  data: Partial<{ name: string; isActive: boolean; sortOrder: number }>
): Promise<ContractChannel | null> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(contractChannels).set(data).where(eq(contractChannels.id, id));
  const [channel] = await db.select().from(contractChannels).where(eq(contractChannels.id, id));
  return channel || null;
}

// Delete a contract channel
export async function deleteContractChannel(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // First delete all related sub channels
  await db.delete(contractSubChannels).where(eq(contractSubChannels.channelId, id));
  // Then delete the channel
  await db.delete(contractChannels).where(eq(contractChannels.id, id));
}

// ============================================
// 계약 세부 채널 관리 (Contract Sub Channels - 유입경로)
// ============================================

// Get all contract sub channels
export async function getAllContractSubChannels(): Promise<ContractSubChannel[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db.select().from(contractSubChannels).orderBy(contractSubChannels.sortOrder);
}

// Get contract sub channels by channel
export async function getContractSubChannelsByChannel(channelId: number): Promise<ContractSubChannel[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db.select().from(contractSubChannels)
    .where(eq(contractSubChannels.channelId, channelId))
    .orderBy(contractSubChannels.sortOrder);
}

// Get active contract sub channels by channel
export async function getActiveContractSubChannelsByChannel(channelId: number): Promise<ContractSubChannel[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db.select().from(contractSubChannels)
    .where(and(eq(contractSubChannels.channelId, channelId), eq(contractSubChannels.isActive, true)))
    .orderBy(contractSubChannels.sortOrder);
}

// Create a contract sub channel
export async function createContractSubChannel(data: {
  channelId: number;
  name: string;
  sortOrder?: number;
}): Promise<ContractSubChannel> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(contractSubChannels).values({
    channelId: data.channelId,
    name: data.name,
    sortOrder: data.sortOrder ?? 0,
  });

  const [subChannel] = await db.select().from(contractSubChannels)
    .where(eq(contractSubChannels.id, Number(result[0].insertId)));
  return subChannel;
}

// Update a contract sub channel
export async function updateContractSubChannel(
  id: number,
  data: Partial<{ name: string; isActive: boolean; sortOrder: number }>
): Promise<ContractSubChannel | null> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(contractSubChannels).set(data).where(eq(contractSubChannels.id, id));
  const [subChannel] = await db.select().from(contractSubChannels).where(eq(contractSubChannels.id, id));
  return subChannel || null;
}

// Delete a contract sub channel
export async function deleteContractSubChannel(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.delete(contractSubChannels).where(eq(contractSubChannels.id, id));
}

// Get all sales categories with their items
export async function getSalesCategoriesWithItems(): Promise<(SalesCategory & { items: SalesItem[] })[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const categories = await db.select().from(salesCategories)
    .where(eq(salesCategories.isActive, true))
    .orderBy(salesCategories.sortOrder);
  
  const items = await db.select().from(salesItems)
    .where(eq(salesItems.isActive, true))
    .orderBy(salesItems.sortOrder);
  
  return categories.map(category => ({
    ...category,
    items: items.filter(item => item.categoryId === category.id),
  }));
}

// Get all contract channels with their sub channels
export async function getContractChannelsWithSubChannels(): Promise<(ContractChannel & { subChannels: ContractSubChannel[] })[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const channels = await db.select().from(contractChannels)
    .where(eq(contractChannels.isActive, true))
    .orderBy(contractChannels.sortOrder);
  
  const subChannels = await db.select().from(contractSubChannels)
    .where(eq(contractSubChannels.isActive, true))
    .orderBy(contractSubChannels.sortOrder);
  
  return channels.map(channel => ({
    ...channel,
    subChannels: subChannels.filter(sub => sub.channelId === channel.id),
  }));
}


// ==================== 권한 기반 업무 조회 Functions ====================

/**
 * 사용자의 역할에 따라 조회 가능한 직원 목록 반환
 * - 일반 직원: 본인만
 * - 팀장: 같은 팀 소속 직원
 * - 사업부장: 같은 사업부 소속 직원
 * - 임원: 모든 직원
 */
export async function getAccessibleUsers(userId: number): Promise<{
  users: Array<{
    id: number;
    name: string | null;
    koreanName: string | null;
    divisionId: number | null;
    teamId: number | null;
    positionName: string | null;
    divisionName: string | null;
    teamName: string | null;
  }>;
  accessLevel: 'self' | 'team' | 'division' | 'all';
}> {
  const db = await getDb();
  if (!db) {
    return { users: [], accessLevel: 'self' };
  }

  // 현재 사용자 정보 조회
  const currentUser = await getUserWithOrganization(userId);
  if (!currentUser) {
    return { users: [], accessLevel: 'self' };
  }

  const positionName = currentUser.position?.name?.toLowerCase() || '';
  
  // 권한 레벨 결정
  let accessLevel: 'self' | 'team' | 'division' | 'all' = 'self';
  
  // 임원 체크 (대표, 이사, 상무, 전무, 부사장, 사장 등)
  const executivePositions = ['대표', '이사', '상무', '전무', '부사장', '사장', '임원', '대표이사', 'ceo', 'coo', 'cfo'];
  if (executivePositions.some(pos => positionName.includes(pos)) || currentUser.user.role === 'admin') {
    accessLevel = 'all';
  }
  // 사업부장 체크
  else if (positionName.includes('사업부장') || positionName.includes('본부장')) {
    accessLevel = 'division';
  }
  // 팀장 체크
  else if (positionName.includes('팀장') || positionName.includes('파트장') || positionName.includes('실장')) {
    accessLevel = 'team';
  }

  // 접근 가능한 사용자 목록 조회
  let result;
  
  if (accessLevel === 'all') {
    // 모든 직원 조회
    result = await db
      .select({
        id: users.id,
        name: users.name,
        koreanName: users.koreanName,
        divisionId: users.divisionId,
        teamId: users.teamId,
        positionName: positions.name,
        divisionName: divisions.name,
        teamName: teams.name,
      })
      .from(users)
      .leftJoin(positions, eq(users.positionId, positions.id))
      .leftJoin(divisions, eq(users.divisionId, divisions.id))
      .leftJoin(teams, eq(users.teamId, teams.id))
      .where(eq(users.isProfileComplete, true))
      .orderBy(divisions.sortOrder, teams.sortOrder, users.name);
  } else if (accessLevel === 'division' && currentUser.user.divisionId) {
    // 같은 사업부 직원 조회
    result = await db
      .select({
        id: users.id,
        name: users.name,
        koreanName: users.koreanName,
        divisionId: users.divisionId,
        teamId: users.teamId,
        positionName: positions.name,
        divisionName: divisions.name,
        teamName: teams.name,
      })
      .from(users)
      .leftJoin(positions, eq(users.positionId, positions.id))
      .leftJoin(divisions, eq(users.divisionId, divisions.id))
      .leftJoin(teams, eq(users.teamId, teams.id))
      .where(
        and(
          eq(users.divisionId, currentUser.user.divisionId),
          eq(users.isProfileComplete, true)
        )
      )
      .orderBy(teams.sortOrder, users.name);
  } else if (accessLevel === 'team' && currentUser.user.teamId) {
    // 같은 팀 직원 조회
    result = await db
      .select({
        id: users.id,
        name: users.name,
        koreanName: users.koreanName,
        divisionId: users.divisionId,
        teamId: users.teamId,
        positionName: positions.name,
        divisionName: divisions.name,
        teamName: teams.name,
      })
      .from(users)
      .leftJoin(positions, eq(users.positionId, positions.id))
      .leftJoin(divisions, eq(users.divisionId, divisions.id))
      .leftJoin(teams, eq(users.teamId, teams.id))
      .where(
        and(
          eq(users.teamId, currentUser.user.teamId),
          eq(users.isProfileComplete, true)
        )
      )
      .orderBy(users.name);
  } else {
    // 본인만 조회
    result = [{
      id: currentUser.user.id,
      name: currentUser.user.name,
      koreanName: currentUser.user.koreanName,
      divisionId: currentUser.user.divisionId,
      teamId: currentUser.user.teamId,
      positionName: currentUser.position?.name || null,
      divisionName: currentUser.division?.name || null,
      teamName: currentUser.team?.name || null,
    }];
  }

  return { users: result, accessLevel };
}

/**
 * 특정 사용자의 업무 목록 조회 (권한 체크 포함)
 */
export async function getTasksByTargetUserId(
  requesterId: number,
  targetUserId: number
): Promise<(Task & { progressLogs: TaskProgressLog[] })[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  // 권한 체크
  const { users: accessibleUsers } = await getAccessibleUsers(requesterId);
  const canAccess = accessibleUsers.some(u => u.id === targetUserId);
  
  if (!canAccess) {
    console.warn(`[Database] User ${requesterId} does not have access to user ${targetUserId}'s tasks`);
    return [];
  }

  const result = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, targetUserId))
    .orderBy(desc(tasks.createdAt));

  // 각 업무에 대한 진행 이력 조회
  const tasksWithLogs = await Promise.all(
    result.map(async (task) => {
      const logs = await db
        .select()
        .from(taskProgressLogs)
        .where(eq(taskProgressLogs.taskId, task.id))
        .orderBy(desc(taskProgressLogs.logDate))
        .limit(3); // 최근 3개만 가져옴
      return { ...task, progressLogs: logs };
    })
  );

  return tasksWithLogs;
}


// ==================== Member Management Functions ====================

/**
 * 모든 사용자 목록 조회 (관리자용)
 */
export async function getAllUsers(): Promise<Array<{
  id: number;
  openId: string;
  name: string | null;
  koreanName: string | null;
  email: string | null;
  role: "user" | "admin";
  divisionId: number | null;
  teamId: number | null;
  positionId: number | null;
  rankId: number | null;
  isProfileComplete: boolean;
  canEditSales: boolean;
  canEditFinancial: boolean;
  createdAt: Date;
  lastSignedIn: Date;
  divisionName: string | null;
  teamName: string | null;
  positionName: string | null;
  rankName: string | null;
}>> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get users: database not available");
    return [];
  }

  const result = await db
    .select({
      id: users.id,
      openId: users.openId,
      name: users.name,
      koreanName: users.koreanName,
      email: users.email,
      role: users.role,
      divisionId: users.divisionId,
      teamId: users.teamId,
      positionId: users.positionId,
      rankId: users.rankId,
      isProfileComplete: users.isProfileComplete,
      canEditSales: users.canEditSales,
      canEditFinancial: users.canEditFinancial,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
      divisionName: divisions.name,
      teamName: teams.name,
      positionName: positions.name,
      rankName: ranks.name,
    })
    .from(users)
    .leftJoin(divisions, eq(users.divisionId, divisions.id))
    .leftJoin(teams, eq(users.teamId, teams.id))
    .leftJoin(positions, eq(users.positionId, positions.id))
    .leftJoin(ranks, eq(users.rankId, ranks.id))
    .orderBy(users.createdAt);

  return result;
}

/**
 * 사용자 삭제 (관리자용)
 * 관련 데이터도 함께 삭제됨
 */
export async function deleteUser(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 사용자 관련 데이터 삭제 (외래키 제약 때문에 순서대로)
  await db.delete(tasks).where(eq(tasks.userId, userId));
  await db.delete(salesRecords).where(eq(salesRecords.userId, userId));
  await db.delete(contractRecords).where(eq(contractRecords.userId, userId));
  await db.delete(goals).where(eq(goals.userId, userId));
  await db.delete(meetingMinutes).where(eq(meetingMinutes.userId, userId));
  await db.delete(quarterlyReviews).where(eq(quarterlyReviews.userId, userId));
  
  // 마지막으로 사용자 삭제
  await db.delete(users).where(eq(users.id, userId));
}

/**
 * 사용자 역할 변경 (관리자용)
 */
export async function updateUserRole(userId: number, role: "user" | "admin"): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(users)
    .set({ role })
    .where(eq(users.id, userId));
}

/**
 * 사용자 매출관리 편집 권한 변경 (관리자용)
 */
export async function updateUserSalesPermission(userId: number, canEditSales: boolean): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(users)
    .set({ canEditSales })
    .where(eq(users.id, userId));
}


/**
 * 사용자 재무현황 편집 권한 변경 (관리자용)
 */
export async function updateUserFinancialPermission(userId: number, canEditFinancial: boolean): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(users)
    .set({ canEditFinancial })
    .where(eq(users.id, userId));
}

/**
 * 재무 레코드 일괄 생성 (bulk insert)
 */
export async function bulkCreateFinancialRecords(records: Array<{
  year: number;
  month: number;
  week: number;
  category: string;
  type: 'income' | 'expense';
  amount: number;
  description?: string;
  sortOrder?: number;
}>): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  if (records.length === 0) return;

  const insertData = records.map(r => ({
    id: crypto.randomUUID(),
    year: r.year,
    month: r.month,
    week: r.week,
    category: r.category,
    type: r.type,
    amount: r.amount,
    description: r.description || null,
    sortOrder: r.sortOrder || 0,
  }));

  // Insert in batches of 50
  for (let i = 0; i < insertData.length; i += 50) {
    const batch = insertData.slice(i, i + 50);
    await db.insert(financialRecords).values(batch);
  }
}

/**
 * 특정 월의 재무 레코드 전체 삭제
 */
export async function deleteFinancialRecordsByMonth(year: number, month: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.delete(financialRecords)
    .where(and(
      eq(financialRecords.year, year),
      eq(financialRecords.month, month)
    ));
}

/**
 * 특정 월의 특정 주차들의 재무 레코드 삭제 (주차별 개별 삭제)
 */
export async function deleteFinancialRecordsByWeeks(year: number, month: number, weeks: number[]): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  if (weeks.length === 0) return;

  const { inArray } = await import('drizzle-orm');
  await db.delete(financialRecords)
    .where(and(
      eq(financialRecords.year, year),
      eq(financialRecords.month, month),
      inArray(financialRecords.week, weeks)
    ));
}

// =====================
// 업무 진행 이력 관련 함수
// =====================

/**
 * 특정 업무의 진행 이력 목록 조회
 */
export async function getTaskProgressLogs(taskId: string): Promise<TaskProgressLog[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get task progress logs: database not available");
    return [];
  }

  const result = await db
    .select()
    .from(taskProgressLogs)
    .where(eq(taskProgressLogs.taskId, taskId))
    .orderBy(desc(taskProgressLogs.logDate));

  return result;
}

/**
 * 업무 진행 이력 추가
 */
export async function createTaskProgressLog(data: {
  taskId: string;
  logDate: Date;
  content: string;
}): Promise<TaskProgressLog> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const [result] = await db
    .insert(taskProgressLogs)
    .values({
      taskId: data.taskId,
      logDate: data.logDate,
      content: data.content,
    })
    .$returningId();

  const [created] = await db
    .select()
    .from(taskProgressLogs)
    .where(eq(taskProgressLogs.id, result.id));

  return created;
}

/**
 * 업무 진행 이력 수정
 */
export async function updateTaskProgressLog(
  id: number,
  data: {
    logDate?: Date;
    content?: string;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(taskProgressLogs)
    .set(data)
    .where(eq(taskProgressLogs.id, id));
}

/**
 * 업무 진행 이력 삭제
 */
export async function deleteTaskProgressLog(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.delete(taskProgressLogs).where(eq(taskProgressLogs.id, id));
}

/**
 * 업무 진행 이력 일괄 저장 (기존 이력 삭제 후 새로 저장)
 */
export async function saveTaskProgressLogs(
  taskId: string,
  logs: Array<{ logDate: Date; content: string }>
): Promise<TaskProgressLog[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 기존 이력 삭제
  await db.delete(taskProgressLogs).where(eq(taskProgressLogs.taskId, taskId));

  // 새 이력이 없으면 빈 배열 반환
  if (logs.length === 0) {
    return [];
  }

  // 새 이력 추가
  await db.insert(taskProgressLogs).values(
    logs.map((log) => ({
      taskId,
      logDate: log.logDate,
      content: log.content,
    }))
  );

  // 저장된 이력 조회 후 반환
  return getTaskProgressLogs(taskId);
}


// ==================== Archive Functions ====================

import { archivedTasks, ArchivedTask, InsertArchivedTask, archivedTaskProgressLogs, ArchivedTaskProgressLog, InsertArchivedTaskProgressLog } from "../drizzle/schema";

/**
 * 업무를 아카이브로 이동 (복수 업무 지원)
 */
export async function archiveTasks(
  taskIds: string[],
  archivedByUserId: number,
  reason?: string
): Promise<ArchivedTask[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const archivedResults: ArchivedTask[] = [];

  for (const taskId of taskIds) {
    // 원본 업무 조회
    const taskResult = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (taskResult.length === 0) {
      continue; // 업무가 없으면 스킵
    }

    const task = taskResult[0];
    const archiveId = nanoid();

    // 아카이브 테이블에 저장
    const archivedData: InsertArchivedTask = {
      id: archiveId,
      originalTaskId: task.id,
      userId: task.userId,
      number: task.number,
      title: task.title,
      department: task.department ?? "",
      assignee: task.assignee ?? "",
      schedule: task.schedule ?? "",
      details: task.details,
      status: task.status,
      startDate: task.startDate,
      dueDate: task.dueDate,
      originalCreatedAt: task.createdAt,
      archivedBy: archivedByUserId,
      archiveReason: reason ?? null,
    };

    await db.insert(archivedTasks).values(archivedData);

    // 진행 이력도 아카이브로 복사
    const progressLogs = await db
      .select()
      .from(taskProgressLogs)
      .where(eq(taskProgressLogs.taskId, taskId));

    if (progressLogs.length > 0) {
      await db.insert(archivedTaskProgressLogs).values(
        progressLogs.map((log) => ({
          archivedTaskId: archiveId,
          logDate: log.logDate,
          content: log.content,
          originalCreatedAt: log.createdAt,
        }))
      );
    }

    // 원본 업무 삭제 (진행 이력은 cascade로 자동 삭제)
    await db.delete(tasks).where(eq(tasks.id, taskId));

    // 아카이브된 업무 조회
    const archived = await db
      .select()
      .from(archivedTasks)
      .where(eq(archivedTasks.id, archiveId))
      .limit(1);

    if (archived.length > 0) {
      archivedResults.push(archived[0]);
    }
  }

  return archivedResults;
}

/**
 * 아카이브된 업무 목록 조회
 */
export async function getArchivedTasks(userId: number): Promise<ArchivedTask[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get archived tasks: database not available");
    return [];
  }

  const result = await db
    .select()
    .from(archivedTasks)
    .where(eq(archivedTasks.userId, userId))
    .orderBy(desc(archivedTasks.archivedAt));

  return result;
}

/**
 * 모든 아카이브된 업무 목록 조회 (관리자용)
 */
export async function getAllArchivedTasks(): Promise<(ArchivedTask & { userName?: string | null; koreanName?: string | null })[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get archived tasks: database not available");
    return [];
  }

  const result = await db
    .select({
      id: archivedTasks.id,
      originalTaskId: archivedTasks.originalTaskId,
      userId: archivedTasks.userId,
      number: archivedTasks.number,
      title: archivedTasks.title,
      department: archivedTasks.department,
      assignee: archivedTasks.assignee,
      schedule: archivedTasks.schedule,
      details: archivedTasks.details,
      status: archivedTasks.status,
      startDate: archivedTasks.startDate,
      dueDate: archivedTasks.dueDate,
      originalCreatedAt: archivedTasks.originalCreatedAt,
      archivedAt: archivedTasks.archivedAt,
      archivedBy: archivedTasks.archivedBy,
      archiveReason: archivedTasks.archiveReason,
      userName: users.name,
      koreanName: users.koreanName,
    })
    .from(archivedTasks)
    .leftJoin(users, eq(archivedTasks.userId, users.id))
    .orderBy(desc(archivedTasks.archivedAt));

  return result;
}

/**
 * 아카이브된 업무의 진행 이력 조회
 */
export async function getArchivedTaskProgressLogs(archivedTaskId: string): Promise<ArchivedTaskProgressLog[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get archived task progress logs: database not available");
    return [];
  }

  const result = await db
    .select()
    .from(archivedTaskProgressLogs)
    .where(eq(archivedTaskProgressLogs.archivedTaskId, archivedTaskId))
    .orderBy(desc(archivedTaskProgressLogs.logDate));

  return result;
}

/**
 * 아카이브된 업무 복원 (원래 업무 목록으로 이동)
 */
export async function restoreArchivedTask(archivedTaskId: string): Promise<Task | null> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 아카이브된 업무 조회
  const archivedResult = await db
    .select()
    .from(archivedTasks)
    .where(eq(archivedTasks.id, archivedTaskId))
    .limit(1);

  if (archivedResult.length === 0) {
    return null;
  }

  const archived = archivedResult[0];
  const newTaskId = nanoid();

  // 새 업무 번호 생성
  const nextNumber = await getNextTaskNumber(archived.userId);

  // 원본 업무 테이블에 복원
  const taskData: InsertTask = {
    id: newTaskId,
    userId: archived.userId,
    number: nextNumber,
    title: archived.title,
    department: archived.department ?? "",
    assignee: archived.assignee ?? "",
    schedule: archived.schedule ?? "",
    details: archived.details,
    status: archived.status,
    startDate: archived.startDate,
    dueDate: archived.dueDate,
  };

  await db.insert(tasks).values(taskData);

  // 진행 이력도 복원
  const archivedLogs = await db
    .select()
    .from(archivedTaskProgressLogs)
    .where(eq(archivedTaskProgressLogs.archivedTaskId, archivedTaskId));

  if (archivedLogs.length > 0) {
    await db.insert(taskProgressLogs).values(
      archivedLogs.map((log) => ({
        taskId: newTaskId,
        logDate: log.logDate,
        content: log.content,
      }))
    );
  }

  // 아카이브된 업무 삭제 (진행 이력은 cascade로 자동 삭제)
  await db.delete(archivedTasks).where(eq(archivedTasks.id, archivedTaskId));

  // 복원된 업무 조회
  const restoredResult = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, newTaskId))
    .limit(1);

  return restoredResult.length > 0 ? restoredResult[0] : null;
}

/**
 * 아카이브된 업무 영구 삭제
 */
export async function deleteArchivedTask(archivedTaskId: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.delete(archivedTasks).where(eq(archivedTasks.id, archivedTaskId));
}


// ==================== Weekly Sales Summary Functions ====================

/**
 * 주단위 전체 매출 집계 조회
 * 특정 월의 모든 매출 데이터를 주차별로 집계
 */
export async function getWeeklySalesSummary(
  year: number,
  month: number
): Promise<{
  week1Total: number;
  week2Total: number;
  week3Total: number;
  week4Total: number;
  monthlyTotal: number;
  targetTotal: number;
  achievementRate: string;
  byDivision: {
    division: string;
    week1: number;
    week2: number;
    week3: number;
    week4: number;
    total: number;
    target: number;
    rate: string;
  }[];
  byProductGroup: {
    division: string;
    productGroup: string;
    total: number;
  }[];
}> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get weekly sales summary: database not available");
    return {
      week1Total: 0,
      week2Total: 0,
      week3Total: 0,
      week4Total: 0,
      monthlyTotal: 0,
      targetTotal: 0,
      achievementRate: "0",
      byDivision: [],
      byProductGroup: []
    };
  }

  // 해당 월의 모든 매출 데이터 조회
  const records = await db
    .select()
    .from(salesRecords)
    .where(
      and(
        eq(salesRecords.year, year),
        eq(salesRecords.month, month)
      )
    );

  // 사업계획에서 월별 목표 조회
  const businessPlanRecords = await db
    .select()
    .from(businessPlans)
    .where(
      and(
        eq(businessPlans.year, year),
        eq(businessPlans.category, 'revenue')
      )
    );

  // 사업계획 division → 매출관리 division 매핑
  const divisionMapping: Record<string, string> = {
    'bombom_construction': 'bombom',
    'online_sales': 'online',
    'oem_supply': 'manufacturing',
    'ricoco': 'ricoco',
  };

  // 사업계획에서 월별 목표 가져오기
  const businessPlanTargets: Record<string, number> = {};
  const monthKey = `month${month}` as keyof BusinessPlan;
  businessPlanRecords.forEach(plan => {
    // 대분류(소분류가 null)만 조회
    if (!plan.subDivision) {
      const salesDivision = divisionMapping[plan.division];
      if (salesDivision) {
        businessPlanTargets[salesDivision] = Number(plan[monthKey]) || 0;
      }
    }
  });

  // 전체 주차별 합계
  let week1Total = 0;
  let week2Total = 0;
  let week3Total = 0;
  let week4Total = 0;

  // 사업부별 집계를 위한 맵
  const divisionMap = new Map<string, {
    week1: number;
    week2: number;
    week3: number;
    week4: number;
    total: number;
    target: number;
  }>();

  // 사업부 + 제품그룹별 집계를 위한 맵 (byProductGroup 용)
  const productGroupMap = new Map<string, {
    division: string;
    productGroup: string;
    total: number;
  }>();

  records.forEach(record => {
    const w1 = record.week1Sales ?? 0;
    const w2 = record.week2Sales ?? 0;
    const w3 = record.week3Sales ?? 0;
    const w4 = record.week4Sales ?? 0;

    week1Total += w1;
    week2Total += w2;
    week3Total += w3;
    week4Total += w4;

    // 사업부별 집계
    const existing = divisionMap.get(record.division) || {
      week1: 0,
      week2: 0,
      week3: 0,
      week4: 0,
      total: 0,
      target: 0
    };

    divisionMap.set(record.division, {
      week1: existing.week1 + w1,
      week2: existing.week2 + w2,
      week3: existing.week3 + w3,
      week4: existing.week4 + w4,
      total: existing.total + w1 + w2 + w3 + w4,
      target: existing.target // 나중에 사업계획 목표로 대체
    });

    // 제품그룹별 집계 (byProductGroup 용)
    const pgKey = `${record.division}-${record.productGroup}`;
    const existingPg = productGroupMap.get(pgKey) || {
      division: record.division,
      productGroup: record.productGroup,
      total: 0
    };
    productGroupMap.set(pgKey, {
      ...existingPg,
      total: existingPg.total + w1 + w2 + w3 + w4
    });
  });

  // 사업계획 목표를 사업부별로 적용
  // fallback: 사업계획 목표가 없으면 개별 항목의 monthlyTarget 합산 사용
  const divisionMonthlyTargets = new Map<string, number>();
  records.forEach(record => {
    const current = divisionMonthlyTargets.get(record.division) || 0;
    divisionMonthlyTargets.set(record.division, current + (record.monthlyTarget ?? 0));
  });

  let targetTotal = 0;
  divisionMap.forEach((data, division) => {
    const itemTargetSum = divisionMonthlyTargets.get(division) || 0;
    const bpTarget = businessPlanTargets[division] || 0;
    // 개별 항목 monthlyTarget 합산이 있으면 우선 사용, 없으면 사업계획 대분류 목표 사용
    const finalTarget = itemTargetSum > 0 ? itemTargetSum : bpTarget;
    data.target = finalTarget;
    targetTotal += finalTarget;
  });

  // 사업계획에 있지만 매출 데이터가 없는 사업부도 추가
  Object.entries(businessPlanTargets).forEach(([division, target]) => {
    if (!divisionMap.has(division)) {
      divisionMap.set(division, {
        week1: 0,
        week2: 0,
        week3: 0,
        week4: 0,
        total: 0,
        target: target
      });
      targetTotal += target;
    }
  });

  const monthlyTotal = week1Total + week2Total + week3Total + week4Total;
  const achievementRate = targetTotal > 0 ? ((monthlyTotal / targetTotal) * 100).toFixed(1) : "0";

  // 사업부별 데이터 배열로 변환
  const byDivision = Array.from(divisionMap.entries()).map(([division, data]) => ({
    division,
    week1: data.week1,
    week2: data.week2,
    week3: data.week3,
    week4: data.week4,
    total: data.total,
    target: data.target,
    rate: data.target > 0 ? ((data.total / data.target) * 100).toFixed(1) : "0"
  }));

  // 제품그룹별 데이터 배열로 변환
  const byProductGroup = Array.from(productGroupMap.values());

  return {
    week1Total,
    week2Total,
    week3Total,
    week4Total,
    monthlyTotal,
    targetTotal,
    achievementRate,
    byDivision,
    byProductGroup
  };
}


// ==================== Sales Events Functions ====================

/**
 * 특정 월의 매출관리 일정 조회
 */
export async function getSalesEventsByMonth(
  year: number,
  month: number
): Promise<SalesEvent[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get sales events: database not available");
    return [];
  }

  // 해당 월의 시작일과 종료일 계산
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const events = await db
    .select()
    .from(salesEvents)
    .where(
      and(
        gte(salesEvents.eventDate, startDate),
        lte(salesEvents.eventDate, endDate)
      )
    )
    .orderBy(salesEvents.eventDate);

  return events;
}

/**
 * 매출관리 일정 생성
 */
export async function createSalesEvent(
  data: Omit<InsertSalesEvent, "id" | "createdAt" | "updatedAt">
): Promise<SalesEvent | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create sales event: database not available");
    return null;
  }

  const id = crypto.randomUUID();
  await db.insert(salesEvents).values({
    id,
    ...data,
  });

  const result = await db.select().from(salesEvents).where(eq(salesEvents.id, id));
  return result[0] ?? null;
}

/**
 * 매출관리 일정 수정
 */
export async function updateSalesEvent(
  id: string,
  data: Partial<Omit<InsertSalesEvent, "id" | "createdAt" | "updatedAt">>
): Promise<SalesEvent | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update sales event: database not available");
    return null;
  }

  await db.update(salesEvents).set(data).where(eq(salesEvents.id, id));

  const result = await db.select().from(salesEvents).where(eq(salesEvents.id, id));
  return result[0] ?? null;
}

/**
 * 매출관리 일정 삭제
 */
export async function deleteSalesEvent(id: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete sales event: database not available");
    return;
  }

  await db.delete(salesEvents).where(eq(salesEvents.id, id));
}

/**
 * 특정 일정 조회
 */
export async function getSalesEventById(id: string): Promise<SalesEvent | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get sales event: database not available");
    return null;
  }

  const result = await db.select().from(salesEvents).where(eq(salesEvents.id, id));
  return result[0] ?? null;
}


// ============================================
// 이달의 한마디 (Monthly Messages) CRUD
// ============================================

/**
 * 특정 월의 이달의 한마디 조회
 */
export async function getMonthlyMessage(year: number, month: number): Promise<MonthlyMessage | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get monthly message: database not available");
    return null;
  }

  const result = await db.select().from(monthlyMessages)
    .where(and(
      eq(monthlyMessages.year, year),
      eq(monthlyMessages.month, month)
    ))
    .orderBy(desc(monthlyMessages.updatedAt))
    .limit(1);
  
  return result[0] ?? null;
}

/**
 * 이달의 한마디 생성 또는 업데이트
 */
export async function upsertMonthlyMessage(data: {
  userId: number;
  year: number;
  month: number;
  message: string;
  authorName?: string;
}): Promise<MonthlyMessage | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert monthly message: database not available");
    return null;
  }

  // 해당 월에 이미 메시지가 있는지 확인
  const existing = await getMonthlyMessage(data.year, data.month);
  
  if (existing) {
    // 업데이트
    await db.update(monthlyMessages)
      .set({
        message: data.message,
        authorName: data.authorName,
        userId: data.userId,
      })
      .where(eq(monthlyMessages.id, existing.id));
    
    return await getMonthlyMessageById(existing.id);
  } else {
    // 새로 생성
    const id = crypto.randomUUID();
    await db.insert(monthlyMessages).values({
      id,
      userId: data.userId,
      year: data.year,
      month: data.month,
      message: data.message,
      authorName: data.authorName,
    });
    
    return await getMonthlyMessageById(id);
  }
}

/**
 * ID로 이달의 한마디 조회
 */
export async function getMonthlyMessageById(id: string): Promise<MonthlyMessage | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get monthly message: database not available");
    return null;
  }

  const result = await db.select().from(monthlyMessages).where(eq(monthlyMessages.id, id));
  return result[0] ?? null;
}

/**
 * 이달의 한마디 삭제
 */
export async function deleteMonthlyMessage(id: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete monthly message: database not available");
    return;
  }

  await db.delete(monthlyMessages).where(eq(monthlyMessages.id, id));
}


// ==================== 사업계획 관련 함수 ====================

/**
 * 연도별 사업계획 목록 조회
 */
export async function getBusinessPlansByYear(year: number): Promise<BusinessPlan[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get business plans: database not available");
    return [];
  }

  const result = await db.select().from(businessPlans)
    .where(eq(businessPlans.year, year))
    .orderBy(businessPlans.sortOrder);
  return result;
}

/**
 * 카테고리별 사업계획 조회
 */
export async function getBusinessPlansByCategory(year: number, category: string): Promise<BusinessPlan[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get business plans: database not available");
    return [];
  }

  const result = await db.select().from(businessPlans)
    .where(and(
      eq(businessPlans.year, year),
      eq(businessPlans.category, category)
    ))
    .orderBy(businessPlans.sortOrder);
  return result;
}

/**
 * 사업계획 생성
 */
export async function createBusinessPlan(data: Omit<InsertBusinessPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<BusinessPlan | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create business plan: database not available");
    return null;
  }

  await db.insert(businessPlans).values(data);
  
  // 마지막으로 삽입된 레코드 조회
  const result = await db.select().from(businessPlans)
    .where(and(
      eq(businessPlans.year, data.year),
      eq(businessPlans.category, data.category),
      eq(businessPlans.division, data.division)
    ))
    .orderBy(desc(businessPlans.id))
    .limit(1);
  
  return result[0] ?? null;
}

/**
 * 사업계획 수정
 */
export async function updateBusinessPlan(id: number, data: Partial<Omit<InsertBusinessPlan, 'id' | 'createdAt' | 'updatedAt'>>): Promise<BusinessPlan | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update business plan: database not available");
    return null;
  }

  await db.update(businessPlans).set(data).where(eq(businessPlans.id, id));
  
  const result = await db.select().from(businessPlans).where(eq(businessPlans.id, id));
  return result[0] ?? null;
}

/**
 * 사업계획 삭제
 */
export async function deleteBusinessPlan(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete business plan: database not available");
    return;
  }

  await db.delete(businessPlans).where(eq(businessPlans.id, id));
}

/**
 * 연도별 사업계획 일괄 삭제
 */
export async function deleteBusinessPlansByYear(year: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete business plans: database not available");
    return;
  }

  await db.delete(businessPlans).where(eq(businessPlans.year, year));
}

/**
 * 사업계획 일괄 생성 (엑셀 데이터 import용)
 */
export async function bulkCreateBusinessPlans(plans: Omit<InsertBusinessPlan, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot bulk create business plans: database not available");
    return;
  }

  if (plans.length === 0) return;

  // 배치로 삽입
  await db.insert(businessPlans).values(plans);
}


// ==================== 사업계획 실적 관련 함수 ====================

/**
 * 연도별 사업계획 실적 조회
 */
export async function getBusinessPlanActualsByYear(year: number): Promise<BusinessPlanActual[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get business plan actuals: database not available");
    return [];
  }

  return await db.select().from(businessPlanActuals).where(eq(businessPlanActuals.year, year));
}

/**
 * 사업계획 실적 생성 또는 업데이트 (upsert)
 */
export async function upsertBusinessPlanActual(
  data: Omit<InsertBusinessPlanActual, 'id' | 'createdAt' | 'updatedAt'>
): Promise<BusinessPlanActual | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert business plan actual: database not available");
    return null;
  }

  // 기존 데이터 확인
  const existing = await db.select().from(businessPlanActuals).where(
    and(
      eq(businessPlanActuals.year, data.year),
      eq(businessPlanActuals.category, data.category),
      eq(businessPlanActuals.division, data.division),
      data.subDivision 
        ? eq(businessPlanActuals.subDivision, data.subDivision)
        : eq(businessPlanActuals.subDivision, '')
    )
  );

  // 합계 계산
  const total = (
    parseFloat(data.month1?.toString() || '0') +
    parseFloat(data.month2?.toString() || '0') +
    parseFloat(data.month3?.toString() || '0') +
    parseFloat(data.month4?.toString() || '0') +
    parseFloat(data.month5?.toString() || '0') +
    parseFloat(data.month6?.toString() || '0') +
    parseFloat(data.month7?.toString() || '0') +
    parseFloat(data.month8?.toString() || '0') +
    parseFloat(data.month9?.toString() || '0') +
    parseFloat(data.month10?.toString() || '0') +
    parseFloat(data.month11?.toString() || '0') +
    parseFloat(data.month12?.toString() || '0')
  ).toString();

  if (existing.length > 0) {
    // 업데이트
    await db.update(businessPlanActuals)
      .set({
        month1: data.month1,
        month2: data.month2,
        month3: data.month3,
        month4: data.month4,
        month5: data.month5,
        month6: data.month6,
        month7: data.month7,
        month8: data.month8,
        month9: data.month9,
        month10: data.month10,
        month11: data.month11,
        month12: data.month12,
        total: total,
      })
      .where(eq(businessPlanActuals.id, existing[0].id));
    
    const updated = await db.select().from(businessPlanActuals).where(eq(businessPlanActuals.id, existing[0].id));
    return updated[0] || null;
  } else {
    // 생성
    const result = await db.insert(businessPlanActuals).values({
      ...data,
      subDivision: data.subDivision || '',
      total: total,
    });
    
    const insertId = result[0].insertId;
    const created = await db.select().from(businessPlanActuals).where(eq(businessPlanActuals.id, insertId));
    return created[0] || null;
  }
}

/**
 * 특정 월의 실적만 업데이트
 */
export async function updateBusinessPlanActualMonth(
  year: number,
  category: string,
  division: string,
  subDivision: string | null,
  month: number,
  value: string
): Promise<BusinessPlanActual | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update business plan actual month: database not available");
    return null;
  }

  // 기존 데이터 확인
  const existing = await db.select().from(businessPlanActuals).where(
    and(
      eq(businessPlanActuals.year, year),
      eq(businessPlanActuals.category, category),
      eq(businessPlanActuals.division, division),
      subDivision 
        ? eq(businessPlanActuals.subDivision, subDivision)
        : eq(businessPlanActuals.subDivision, '')
    )
  );

  const monthField = `month${month}` as keyof typeof businessPlanActuals.$inferSelect;

  if (existing.length > 0) {
    // 기존 데이터가 있으면 해당 월만 업데이트
    const currentData = existing[0];
    const updateData: Record<string, string> = {};
    updateData[monthField] = value;

    // 합계 재계산
    let total = 0;
    for (let i = 1; i <= 12; i++) {
      const field = `month${i}` as keyof typeof currentData;
      if (i === month) {
        total += parseFloat(value || '0');
      } else {
        total += parseFloat(currentData[field]?.toString() || '0');
      }
    }
    updateData['total'] = total.toString();

    await db.update(businessPlanActuals)
      .set(updateData)
      .where(eq(businessPlanActuals.id, currentData.id));
    
    const updated = await db.select().from(businessPlanActuals).where(eq(businessPlanActuals.id, currentData.id));
    return updated[0] || null;
  } else {
    // 새 레코드 생성
    const newData: Record<string, unknown> = {
      year,
      category,
      division,
      subDivision: subDivision || '',
      total: value,
    };
    
    // 모든 월을 0으로 초기화
    for (let i = 1; i <= 12; i++) {
      newData[`month${i}`] = i === month ? value : '0';
    }

    const result = await db.insert(businessPlanActuals).values(newData as InsertBusinessPlanActual);
    const insertId = result[0].insertId;
    const created = await db.select().from(businessPlanActuals).where(eq(businessPlanActuals.id, insertId));
    return created[0] || null;
  }
}

/**
 * 사업계획 실적 삭제 (연도별)
 */
export async function deleteBusinessPlanActualsByYear(year: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete business plan actuals: database not available");
    return;
  }

  await db.delete(businessPlanActuals).where(eq(businessPlanActuals.year, year));
}


// ==================== Business Plan History Functions ====================

/**
 * 사업계획 변경 이력 조회 (사업계획 ID별)
 */
export async function getBusinessPlanHistoryByPlanId(businessPlanId: number): Promise<BusinessPlanHistory[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get business plan history: database not available");
    return [];
  }

  return await db.select().from(businessPlanHistory)
    .where(eq(businessPlanHistory.businessPlanId, businessPlanId))
    .orderBy(desc(businessPlanHistory.version));
}

/**
 * 사업계획 변경 이력 조회 (연도별)
 */
export async function getBusinessPlanHistoryByYear(year: number): Promise<BusinessPlanHistory[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get business plan history: database not available");
    return [];
  }

  return await db.select().from(businessPlanHistory)
    .where(eq(businessPlanHistory.year, year))
    .orderBy(desc(businessPlanHistory.createdAt));
}

/**
 * 사업계획 변경 이력 생성
 */
export async function createBusinessPlanHistory(
  data: Omit<InsertBusinessPlanHistory, 'id' | 'createdAt'>
): Promise<BusinessPlanHistory | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create business plan history: database not available");
    return null;
  }

  // 현재 버전 조회
  const existingHistory = await db.select({ maxVersion: max(businessPlanHistory.version) })
    .from(businessPlanHistory)
    .where(eq(businessPlanHistory.businessPlanId, data.businessPlanId));
  
  const nextVersion = (existingHistory[0]?.maxVersion || 0) + 1;

  const result = await db.insert(businessPlanHistory).values({
    ...data,
    version: nextVersion,
  });

  const insertId = result[0].insertId;
  const created = await db.select().from(businessPlanHistory).where(eq(businessPlanHistory.id, insertId)).limit(1);
  return created.length > 0 ? created[0] : null;
}

/**
 * 사업계획 변경 이력 삭제 (연도별)
 */
export async function deleteBusinessPlanHistoryByYear(year: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete business plan history: database not available");
    return;
  }

  await db.delete(businessPlanHistory).where(eq(businessPlanHistory.year, year));
}

// ==================== 사업계획 ↔ 매출관리 연동 함수 ====================

/**
 * 사업계획에서 특정 월의 매출 목표 조회
 * division 매핑: bombom_construction → bombom, online_sales → online, oem_supply → manufacturing
 */
export async function getBusinessPlanMonthlyTarget(
  year: number,
  month: number,
  division: string
): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get business plan monthly target: database not available");
    return 0;
  }

  // 사업계획 division → 매출관리 division 매핑
  const divisionMapping: Record<string, string> = {
    'bombom': 'bombom_construction',
    'online': 'online_sales',
    'manufacturing': 'oem_supply',
  };

  const businessPlanDivision = divisionMapping[division];
  if (!businessPlanDivision) {
    return 0;
  }

  const monthKey = `month${month}` as keyof BusinessPlan;
  
  // 대분류만 조회 (subDivision이 null인 것)
  const plans = await db.select().from(businessPlans)
    .where(and(
      eq(businessPlans.year, year),
      eq(businessPlans.category, 'revenue'),
      eq(businessPlans.division, businessPlanDivision)
    ));

  // 대분류 (subDivision이 null인 것)의 해당 월 값 반환
  const mainPlan = plans.find(p => !p.subDivision);
  if (mainPlan) {
    return Number(mainPlan[monthKey]) || 0;
  }

  return 0;
}

/**
 * 매출관리에서 특정 월의 매출 실적 합계 조회
 * 주차별 매출 합계를 반환
 */
export async function getSalesMonthlyActual(
  year: number,
  month: number,
  division: string
): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get sales monthly actual: database not available");
    return 0;
  }

  // 해당 월의 매출 데이터 조회
  const records = await db.select().from(salesRecords)
    .where(and(
      eq(salesRecords.year, year),
      eq(salesRecords.month, month),
      eq(salesRecords.division, division)
    ));

  // 모든 레코드의 주차별 매출 합계
  let total = 0;
  for (const record of records) {
    total += (record.week1Sales || 0) + (record.week2Sales || 0) + 
             (record.week3Sales || 0) + (record.week4Sales || 0) + 
             (record.week5Sales || 0);
  }

  return total;
}

/**
 * 사업계획 실적에 매출관리 데이터 동기화
 * 매출관리의 월별 합계를 사업계획 실적에 반영
 */
export async function syncSalesActualToBusinessPlan(
  year: number,
  month: number,
  division: string,
  actualValue: number
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot sync sales actual: database not available");
    return;
  }

  // 매출관리 division → 사업계획 division 매핑
  const divisionMapping: Record<string, string> = {
    'bombom': 'bombom_construction',
    'online': 'online_sales',
    'manufacturing': 'oem_supply',
  };

  const businessPlanDivision = divisionMapping[division];
  if (!businessPlanDivision) {
    return;
  }

  // 기존 실적 조회
  const existing = await db.select().from(businessPlanActuals)
    .where(and(
      eq(businessPlanActuals.year, year),
      eq(businessPlanActuals.category, 'revenue'),
      eq(businessPlanActuals.division, businessPlanDivision)
    ))
    .limit(1);

  const monthKey = `month${month}`;
  const updateData: Record<string, string> = { [monthKey]: String(actualValue) };

  if (existing.length > 0) {
    // 기존 레코드 업데이트
    const currentTotal = Array.from({ length: 12 }, (_, i) => {
      const key = `month${i + 1}` as keyof typeof existing[0];
      if (i + 1 === month) return actualValue;
      return Number(existing[0][key]) || 0;
    }).reduce((sum, val) => sum + val, 0);

    await db.update(businessPlanActuals)
      .set({ 
        ...updateData, 
        total: String(currentTotal),
        updatedAt: new Date() 
      })
      .where(eq(businessPlanActuals.id, existing[0].id));
  } else {
    // 새 레코드 생성
    await db.insert(businessPlanActuals).values({
      year,
      category: 'revenue',
      division: businessPlanDivision,
      subDivision: null,
      [monthKey]: String(actualValue),
      total: String(actualValue),
    });
  }
}


/**
 * 사업계획에서 특정 월의 하위항목별 목표 조회
 * division과 subDivision을 기반으로 해당 월의 목표 값 반환
 */
export async function getBusinessPlanMonthlyTargetBySubDivision(
  year: number,
  month: number,
  division: string,
  subDivision: string | null
): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get business plan monthly target: database not available");
    return 0;
  }

  // 사업계획 division → 매출관리 division 매핑
  const divisionMapping: Record<string, string> = {
    'bombom': 'bombom_construction',
    'online': 'online_sales',
    'manufacturing': 'oem_supply',
  };

  // 하위항목 매핑 (매출관리 → 사업계획)
  const subDivisionMapping: Record<string, Record<string, string>> = {
    'bombom': {
      'headquarters': 'headquarters',
      'branch': 'branch',
    },
    'online': {
      'bombom': 'bombom',
      'shushuvi': 'shushuvi',
      'etc': 'etc',
    },
    'manufacturing': {
      'linkmom': 'linkmom',
      'ricoco': 'ricoco',
      'creamhouse': 'creamhouse',
      'oem_etc': 'oem_etc',
    },
  };

  const businessPlanDivision = divisionMapping[division];
  if (!businessPlanDivision) {
    return 0;
  }

  const monthKey = `month${month}` as keyof BusinessPlan;
  
  // subDivision이 있으면 해당 하위항목 조회, 없으면 대분류 조회
  let businessPlanSubDivision: string | null = null;
  if (subDivision && subDivisionMapping[division]) {
    businessPlanSubDivision = subDivisionMapping[division][subDivision] || null;
  }

  const plans = await db.select().from(businessPlans)
    .where(and(
      eq(businessPlans.year, year),
      eq(businessPlans.category, 'revenue'),
      eq(businessPlans.division, businessPlanDivision)
    ));

  // 해당 하위항목 또는 대분류 찾기
  const targetPlan = plans.find(p => {
    if (businessPlanSubDivision) {
      return p.subDivision === businessPlanSubDivision;
    }
    return !p.subDivision;
  });

  if (targetPlan) {
    return Number(targetPlan[monthKey]) || 0;
  }

  return 0;
}

/**
 * 매출관리에서 특정 월의 하위항목별 실적 조회
 */
export async function getSalesMonthlyActualBySubDivision(
  year: number,
  month: number,
  division: string,
  subDivision: string | null
): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get sales monthly actual: database not available");
    return 0;
  }

  // 하위항목 매핑 (사업계획 subDivision → 매출관리 productGroup)
  const subDivisionToProductGroup: Record<string, Record<string, string>> = {
    'bombom': {
      'headquarters': '본사',
      'branch': '지사',
    },
    'online': {
      'bombom': '봄봄',
      'shushuvi': '슈슈비',
      'etc': '기타',
    },
    'manufacturing': {
      'linkmom': '에르모어',
      'ricoco': '리코코',
      'creamhouse': '크림하우스',
      'oem_etc': '기타',
    },
  };

  // 해당 월의 매출 데이터 조회
  let query;
  if (subDivision && subDivisionToProductGroup[division]) {
    const productGroup = subDivisionToProductGroup[division][subDivision];
    if (productGroup) {
      query = db.select().from(salesRecords)
        .where(and(
          eq(salesRecords.year, year),
          eq(salesRecords.month, month),
          eq(salesRecords.division, division),
          eq(salesRecords.productGroup, productGroup)
        ));
    } else {
      // 매핑되지 않는 subDivision은 0 반환
      return 0;
    }
  } else {
    // subDivision이 null이면 해당 division의 모든 레코드 합계
    query = db.select().from(salesRecords)
      .where(and(
        eq(salesRecords.year, year),
        eq(salesRecords.month, month),
        eq(salesRecords.division, division)
      ));
  }

  const records = await query;

  // 모든 레코드의 주차별 매출 합계
  let total = 0;
  for (const record of records) {
    total += (record.week1Sales || 0) + (record.week2Sales || 0) + 
             (record.week3Sales || 0) + (record.week4Sales || 0) + 
             (record.week5Sales || 0);
  }

  return total;
}

/**
 * 사업계획의 모든 하위항목별 월별 목표 조회
 */
export async function getBusinessPlanAllMonthlyTargets(
  year: number,
  month: number
): Promise<Array<{ division: string; subDivision: string | null; target: number }>> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get business plan monthly targets: database not available");
    return [];
  }

  const monthKey = `month${month}` as keyof BusinessPlan;
  
  const plans = await db.select().from(businessPlans)
    .where(and(
      eq(businessPlans.year, year),
      eq(businessPlans.category, 'revenue')
    ));

  // 사업계획 division → 매출관리 division 역매핑
  const reverseDivisionMapping: Record<string, string> = {
    'bombom_construction': 'bombom',
    'online_sales': 'online',
    'oem_supply': 'manufacturing',
  };

  return plans.map(plan => ({
    division: reverseDivisionMapping[plan.division] || plan.division,
    subDivision: plan.subDivision,
    target: Number(plan[monthKey]) || 0,
  }));
}

/**
 * 매출관리의 모든 하위항목별 월별 실적 조회
 */
export async function getSalesAllMonthlyActuals(
  year: number,
  month: number
): Promise<Array<{ division: string; subDivision: string | null; actual: number }>> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get sales monthly actuals: database not available");
    return [];
  }

  const records = await db.select().from(salesRecords)
    .where(and(
      eq(salesRecords.year, year),
      eq(salesRecords.month, month)
    ));

  // productGroup → subDivision 역매핑
  const productGroupToSubDivision: Record<string, Record<string, string>> = {
    'bombom': {
      '본사': 'headquarters',
      '지사': 'branch',
    },
    'online': {
      '봄봄': 'bombom',
      '슈슈비': 'shushuvi',
      '기타': 'etc',
    },
    'manufacturing': {
      '에르모어': 'linkmom',
      '리코코': 'ricoco',
      '크림하우스': 'creamhouse',
      '기타': 'oem_etc',
    },
  };

  // division + productGroup별로 그룹화하여 합계 계산
  const groupedData: Record<string, { division: string; subDivision: string | null; actual: number }> = {};

  for (const record of records) {
    // productGroup을 subDivision으로 변환
    const subDivision = productGroupToSubDivision[record.division]?.[record.productGroup] || null;
    const key = `${record.division}-${subDivision || 'main'}`;
    if (!groupedData[key]) {
      groupedData[key] = {
        division: record.division,
        subDivision: subDivision,
        actual: 0,
      };
    }
    groupedData[key].actual += (record.week1Sales || 0) + (record.week2Sales || 0) + 
                               (record.week3Sales || 0) + (record.week4Sales || 0) + 
                               (record.week5Sales || 0);
  }

  return Object.values(groupedData);
}


/**
 * 사업계획에서 특정 월의 하위항목별 실적 조회
 * 매출관리 페이지의 전월실적에 사용
 */
export async function getBusinessPlanMonthlyActuals(
  year: number,
  month: number
): Promise<Array<{ division: string; productGroup: string; actual: number }>> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get business plan monthly actuals: database not available");
    return [];
  }

  // 사업계획 실적 테이블에서 조회
  const actuals = await db.select().from(businessPlanActuals)
    .where(and(
      eq(businessPlanActuals.year, year),
      eq(businessPlanActuals.category, 'revenue')
    ));

  // 사업계획 division → 매출관리 division 역매핑
  const reverseDivisionMapping: Record<string, string> = {
    'bombom_construction': 'bombom',
    'online_sales': 'online',
    'oem_supply': 'manufacturing',
  };

  // subDivision → productGroup 매핑
  const subDivisionToProductGroup: Record<string, Record<string, string>> = {
    'bombom': {
      'headquarters': '본사',
      'branch': '지사',
    },
    'online': {
      'bombom': '봄봄',
      'shushuvi': '슈슈비',
      'etc': '기타',
    },
    'manufacturing': {
      'linkmom': '에르모어',
      'ricoco': '리코코',
      'creamhouse': '크림하우스',
      'oem_etc': '기타',
    },
  };

  const monthKey = `month${month}` as keyof BusinessPlanActual;
  const result: Array<{ division: string; productGroup: string; actual: number }> = [];

  for (const actual of actuals) {
    const salesDivision = reverseDivisionMapping[actual.division];
    if (!salesDivision) continue;

    const monthValue = Number(actual[monthKey]) || 0;
    
    if (actual.subDivision) {
      // 하위항목이 있는 경우
      const productGroup = subDivisionToProductGroup[salesDivision]?.[actual.subDivision];
      if (productGroup) {
        result.push({
          division: salesDivision,
          productGroup: productGroup,
          actual: monthValue,
        });
      }
    } else {
      // 대분류인 경우 - 각 하위항목에 분배하지 않고 대분류 합계로 처리
      // 하위항목이 없는 대분류의 경우 전체 합계로 사용
    }
  }

  return result;
}


/**
 * 매출관리에서 특정 월의 하위항목별 실제 매출 합계 조회
 * 전월실적 표시에 사용 (salesRecords 테이블에서 조회)
 */
export async function getSalesRecordsMonthlyActuals(
  year: number,
  month: number
): Promise<Array<{ division: string; productGroup: string; actual: number }>> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get sales records monthly actuals: database not available");
    return [];
  }

  // 해당 월의 모든 매출 데이터 조회
  const records = await db.select().from(salesRecords)
    .where(and(
      eq(salesRecords.year, year),
      eq(salesRecords.month, month)
    ));

  // division + productGroup별로 주차별 매출 합계 계산
  const actualsMap: Record<string, number> = {};

  for (const record of records) {
    const key = `${record.division}-${record.productGroup}`;
    const weeklyTotal = 
      (Number(record.week1Sales) || 0) +
      (Number(record.week2Sales) || 0) +
      (Number(record.week3Sales) || 0) +
      (Number(record.week4Sales) || 0) +
      (Number(record.week5Sales) || 0);
    
    if (!actualsMap[key]) {
      actualsMap[key] = 0;
    }
    actualsMap[key] += weeklyTotal;
  }

  // 결과 배열로 변환
  const result: Array<{ division: string; productGroup: string; actual: number }> = [];
  for (const [key, actual] of Object.entries(actualsMap)) {
    const [division, productGroup] = key.split('-');
    result.push({ division, productGroup, actual });
  }

  return result;
}


// ==================== 계약현황 사업계획 관련 함수 ====================

/**
 * 연도별 계약현황 사업계획 조회
 */
export async function getContractBusinessPlansByYear(year: number): Promise<ContractBusinessPlan[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get contract business plans: database not available");
    return [];
  }

  return await db.select().from(contractBusinessPlans)
    .where(eq(contractBusinessPlans.year, year));
}

/**
 * 채널별 계약현황 사업계획 조회
 */
export async function getContractBusinessPlansByChannel(year: number, channel: string): Promise<ContractBusinessPlan[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get contract business plans: database not available");
    return [];
  }

  return await db.select().from(contractBusinessPlans)
    .where(and(
      eq(contractBusinessPlans.year, year),
      eq(contractBusinessPlans.channel, channel)
    ));
}

/**
 * 계약현황 사업계획 생성
 */
export async function createContractBusinessPlan(
  data: Omit<InsertContractBusinessPlan, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ContractBusinessPlan | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create contract business plan: database not available");
    return null;
  }

  // 합계 계산
  const total = (data.month1 ?? 0) + (data.month2 ?? 0) + (data.month3 ?? 0) +
                (data.month4 ?? 0) + (data.month5 ?? 0) + (data.month6 ?? 0) +
                (data.month7 ?? 0) + (data.month8 ?? 0) + (data.month9 ?? 0) +
                (data.month10 ?? 0) + (data.month11 ?? 0) + (data.month12 ?? 0);

  const result = await db.insert(contractBusinessPlans).values({
    ...data,
    total,
  });

  const insertId = result[0].insertId;
  const created = await db.select().from(contractBusinessPlans).where(eq(contractBusinessPlans.id, insertId)).limit(1);
  return created[0] ?? null;
}

/**
 * 계약현황 사업계획 수정
 */
export async function updateContractBusinessPlan(
  id: number,
  data: Partial<Omit<InsertContractBusinessPlan, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<ContractBusinessPlan | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update contract business plan: database not available");
    return null;
  }

  // 기존 데이터 조회
  const existing = await db.select().from(contractBusinessPlans).where(eq(contractBusinessPlans.id, id)).limit(1);
  if (existing.length === 0) return null;

  // 합계 재계산
  const merged = { ...existing[0], ...data };
  const total = (merged.month1 ?? 0) + (merged.month2 ?? 0) + (merged.month3 ?? 0) +
                (merged.month4 ?? 0) + (merged.month5 ?? 0) + (merged.month6 ?? 0) +
                (merged.month7 ?? 0) + (merged.month8 ?? 0) + (merged.month9 ?? 0) +
                (merged.month10 ?? 0) + (merged.month11 ?? 0) + (merged.month12 ?? 0);

  await db.update(contractBusinessPlans)
    .set({ ...data, total })
    .where(eq(contractBusinessPlans.id, id));

  const updated = await db.select().from(contractBusinessPlans).where(eq(contractBusinessPlans.id, id)).limit(1);
  return updated[0] ?? null;
}

/**
 * 계약현황 사업계획 삭제
 */
export async function deleteContractBusinessPlan(id: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete contract business plan: database not available");
    return;
  }

  await db.delete(contractBusinessPlans).where(eq(contractBusinessPlans.id, id));
}

/**
 * 계약현황 사업계획 upsert (생성 또는 업데이트)
 */
export async function upsertContractBusinessPlan(
  data: Omit<InsertContractBusinessPlan, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ContractBusinessPlan | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert contract business plan: database not available");
    return null;
  }

  // 기존 데이터 확인
  const conditions = [
    eq(contractBusinessPlans.year, data.year),
    eq(contractBusinessPlans.channel, data.channel),
  ];
  
  if (data.subChannel) {
    conditions.push(eq(contractBusinessPlans.subChannel, data.subChannel));
  }

  const existing = await db.select().from(contractBusinessPlans)
    .where(and(...conditions))
    .limit(1);

  if (existing.length > 0) {
    // 업데이트
    return await updateContractBusinessPlan(existing[0].id, data);
  } else {
    // 생성
    return await createContractBusinessPlan(data);
  }
}

/**
 * 계약현황 사업계획 특정 월 목표 업데이트
 */
export async function updateContractBusinessPlanMonth(
  year: number,
  channel: string,
  subChannel: string | null,
  month: number,
  value: number
): Promise<ContractBusinessPlan | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update contract business plan month: database not available");
    return null;
  }

  // 기존 데이터 확인
  const conditions = [
    eq(contractBusinessPlans.year, year),
    eq(contractBusinessPlans.channel, channel),
  ];
  
  if (subChannel) {
    conditions.push(eq(contractBusinessPlans.subChannel, subChannel));
  }

  const existing = await db.select().from(contractBusinessPlans)
    .where(and(...conditions))
    .limit(1);

  const monthField = `month${month}` as keyof ContractBusinessPlan;

  if (existing.length > 0) {
    // 기존 데이터가 있으면 해당 월만 업데이트
    const currentData = existing[0];
    const updateData: Record<string, number> = {};
    updateData[monthField] = value;

    // 합계 재계산
    let total = 0;
    for (let i = 1; i <= 12; i++) {
      const field = `month${i}` as keyof typeof currentData;
      if (i === month) {
        total += value;
      } else {
        total += Number(currentData[field]) || 0;
      }
    }
    updateData['total'] = total;

    await db.update(contractBusinessPlans)
      .set(updateData)
      .where(eq(contractBusinessPlans.id, currentData.id));

    const updated = await db.select().from(contractBusinessPlans).where(eq(contractBusinessPlans.id, currentData.id)).limit(1);
    return updated[0] ?? null;
  } else {
    // 새 레코드 생성
    const newData: Record<string, unknown> = {
      year,
      channel,
      subChannel: subChannel || null,
      total: value,
    };

    // 모든 월을 0으로 초기화
    for (let i = 1; i <= 12; i++) {
      newData[`month${i}`] = i === month ? value : 0;
    }

    const result = await db.insert(contractBusinessPlans).values(newData as InsertContractBusinessPlan);
    const insertId = result[0].insertId;
    const created = await db.select().from(contractBusinessPlans).where(eq(contractBusinessPlans.id, insertId)).limit(1);
    return created[0] ?? null;
  }
}

/**
 * 연도별 계약현황 사업계획 일괄 삭제
 */
export async function deleteContractBusinessPlansByYear(year: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete contract business plans: database not available");
    return;
  }

  await db.delete(contractBusinessPlans).where(eq(contractBusinessPlans.year, year));
}

// ==================== 계약현황 사업계획 변경 이력 함수 ====================

/**
 * 계약현황 사업계획 변경 이력 조회 (계획 ID별)
 */
export async function getContractBusinessPlanHistoryByPlanId(contractBusinessPlanId: number): Promise<ContractBusinessPlanHistory[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get contract business plan history: database not available");
    return [];
  }

  return await db.select().from(contractBusinessPlanHistory)
    .where(eq(contractBusinessPlanHistory.contractBusinessPlanId, contractBusinessPlanId))
    .orderBy(desc(contractBusinessPlanHistory.version));
}

/**
 * 계약현황 사업계획 변경 이력 조회 (연도별)
 */
export async function getContractBusinessPlanHistoryByYear(year: number): Promise<ContractBusinessPlanHistory[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get contract business plan history: database not available");
    return [];
  }

  return await db.select().from(contractBusinessPlanHistory)
    .where(eq(contractBusinessPlanHistory.year, year))
    .orderBy(desc(contractBusinessPlanHistory.createdAt));
}

/**
 * 계약현황 사업계획 변경 이력 생성
 */
export async function createContractBusinessPlanHistory(
  data: Omit<InsertContractBusinessPlanHistory, 'id' | 'createdAt'>
): Promise<ContractBusinessPlanHistory | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create contract business plan history: database not available");
    return null;
  }

  // 현재 버전 조회
  const existingHistory = await db.select({ maxVersion: max(contractBusinessPlanHistory.version) })
    .from(contractBusinessPlanHistory)
    .where(eq(contractBusinessPlanHistory.contractBusinessPlanId, data.contractBusinessPlanId));

  const nextVersion = (existingHistory[0]?.maxVersion || 0) + 1;

  const result = await db.insert(contractBusinessPlanHistory).values({
    ...data,
    version: nextVersion,
  });

  const insertId = result[0].insertId;
  const created = await db.select().from(contractBusinessPlanHistory).where(eq(contractBusinessPlanHistory.id, insertId)).limit(1);
  return created[0] ?? null;
}

/**
 * 계약현황 사업계획 변경 이력 삭제 (연도별)
 */
export async function deleteContractBusinessPlanHistoryByYear(year: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete contract business plan history: database not available");
    return;
  }

  await db.delete(contractBusinessPlanHistory).where(eq(contractBusinessPlanHistory.year, year));
}

// ==================== 계약현황 사업계획 ↔ 매출관리 연동 함수 ====================

/**
 * 계약현황 사업계획에서 특정 월의 목표 조회
 */
export async function getContractBusinessPlanMonthlyTarget(
  year: number,
  month: number,
  channel: string,
  subChannel: string | null
): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get contract business plan monthly target: database not available");
    return 0;
  }

  const conditions = [
    eq(contractBusinessPlans.year, year),
    eq(contractBusinessPlans.channel, channel),
  ];

  if (subChannel) {
    conditions.push(eq(contractBusinessPlans.subChannel, subChannel));
  }

  const plans = await db.select().from(contractBusinessPlans)
    .where(and(...conditions));

  if (plans.length === 0) return 0;

  const monthKey = `month${month}` as keyof ContractBusinessPlan;
  return Number(plans[0][monthKey]) || 0;
}

/**
 * 계약현황 사업계획에서 특정 월의 모든 목표 조회
 */
export async function getContractBusinessPlanAllMonthlyTargets(
  year: number,
  month: number
): Promise<Array<{ channel: string; subChannel: string | null; target: number }>> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get contract business plan all monthly targets: database not available");
    return [];
  }

  const plans = await db.select().from(contractBusinessPlans)
    .where(eq(contractBusinessPlans.year, year));

  const monthKey = `month${month}` as keyof ContractBusinessPlan;
  
  return plans.map(plan => ({
    channel: plan.channel,
    subChannel: plan.subChannel,
    target: Number(plan[monthKey]) || 0,
  }));
}

/**
 * 매출관리 계약현황에서 특정 월의 실적 합계 조회
 */
export async function getContractRecordsMonthlyActuals(
  year: number,
  month: number
): Promise<Array<{ channel: string; subChannel: string | null; actual: number }>> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get contract records monthly actuals: database not available");
    return [];
  }

  // 해당 월의 모든 계약 데이터 조회
  const records = await db.select().from(contractRecords)
    .where(and(
      eq(contractRecords.year, year),
      eq(contractRecords.month, month)
    ));

  // channel + subChannel별로 주차별 계약 합계 계산
  const actualsMap: Record<string, number> = {};

  for (const record of records) {
    const key = `${record.channel}-${record.subChannel || ''}`;
    const weeklyTotal = 
      (Number(record.week1Count) || 0) +
      (Number(record.week2Count) || 0) +
      (Number(record.week3Count) || 0) +
      (Number(record.week4Count) || 0) +
      (Number(record.week5Count) || 0);
    
    if (!actualsMap[key]) {
      actualsMap[key] = 0;
    }
    actualsMap[key] += weeklyTotal;
  }

  // 결과 배열로 변환
  const result: Array<{ channel: string; subChannel: string | null; actual: number }> = [];
  for (const [key, actual] of Object.entries(actualsMap)) {
    const [channel, subChannel] = key.split('-');
    result.push({ channel, subChannel: subChannel || null, actual });
  }

  return result;
}


/**
 * 계약현황 사업계획 특정 월 실적 업데이트
 */
export async function updateContractBusinessPlanActual(
  year: number,
  channel: string,
  subChannel: string | null,
  month: number,
  value: number
): Promise<ContractBusinessPlan | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update contract business plan actual: database not available");
    return null;
  }

  // 기존 데이터 확인
  const conditions = [
    eq(contractBusinessPlans.year, year),
    eq(contractBusinessPlans.channel, channel),
  ];
  
  if (subChannel) {
    conditions.push(eq(contractBusinessPlans.subChannel, subChannel));
  }

  const existing = await db.select().from(contractBusinessPlans)
    .where(and(...conditions))
    .limit(1);

  const actualField = `actual${month}` as keyof ContractBusinessPlan;

  if (existing.length > 0) {
    // 기존 데이터가 있으면 해당 월만 업데이트
    const currentData = existing[0];
    const updateData: Record<string, number> = {};
    updateData[actualField] = value;

    // 실적 합계 재계산
    let actualTotal = 0;
    for (let i = 1; i <= 12; i++) {
      const field = `actual${i}` as keyof typeof currentData;
      if (i === month) {
        actualTotal += value;
      } else {
        actualTotal += Number(currentData[field]) || 0;
      }
    }
    updateData['actualTotal'] = actualTotal;

    await db.update(contractBusinessPlans)
      .set(updateData)
      .where(eq(contractBusinessPlans.id, currentData.id));

    const updated = await db.select().from(contractBusinessPlans).where(eq(contractBusinessPlans.id, currentData.id)).limit(1);
    return updated[0] ?? null;
  } else {
    // 새 레코드 생성
    const newData: Record<string, unknown> = {
      year,
      channel,
      subChannel: subChannel || null,
      actualTotal: value,
    };

    // 모든 월을 0으로 초기화
    for (let i = 1; i <= 12; i++) {
      newData[`month${i}`] = 0;
      newData[`actual${i}`] = i === month ? value : 0;
    }
    newData['total'] = 0;

    const result = await db.insert(contractBusinessPlans).values(newData as InsertContractBusinessPlan);
    const insertId = result[0].insertId;
    const created = await db.select().from(contractBusinessPlans).where(eq(contractBusinessPlans.id, insertId)).limit(1);
    return created[0] ?? null;
  }
}

/**
 * 계약현황 사업계획에서 특정 월의 모든 실적 조회
 */
export async function getContractBusinessPlanAllMonthlyActuals(
  year: number,
  month: number
): Promise<Array<{ channel: string; subChannel: string | null; actual: number }>> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get contract business plan all monthly actuals: database not available");
    return [];
  }

  const plans = await db.select().from(contractBusinessPlans)
    .where(eq(contractBusinessPlans.year, year));

  const actualKey = `actual${month}` as keyof ContractBusinessPlan;
  
  return plans.map(plan => ({
    channel: plan.channel,
    subChannel: plan.subChannel,
    actual: Number(plan[actualKey]) || 0,
  }));
}


/**
 * 매출관리 계약현황에서 연간 월별 실적 합계 조회
 * 각 채널/서브채널별로 1~12월의 실적을 반환
 */
export async function getContractRecordsYearlyActuals(
  year: number
): Promise<Array<{ channel: string; subChannel: string | null; monthlyActuals: Record<number, number> }>> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get contract records yearly actuals: database not available");
    return [];
  }

  // 해당 연도의 모든 계약 데이터 조회
  const records = await db.select().from(contractRecords)
    .where(eq(contractRecords.year, year));

  // channel + subChannel별로 월별 실적 합계 계산
  const actualsMap: Record<string, Record<number, number>> = {};

  for (const record of records) {
    const key = `${record.channel}-${record.subChannel || ''}`;
    const weeklyTotal = 
      (Number(record.week1Count) || 0) +
      (Number(record.week2Count) || 0) +
      (Number(record.week3Count) || 0) +
      (Number(record.week4Count) || 0) +
      (Number(record.week5Count) || 0);
    
    if (!actualsMap[key]) {
      actualsMap[key] = {};
      for (let i = 1; i <= 12; i++) {
        actualsMap[key][i] = 0;
      }
    }
    actualsMap[key][record.month] = (actualsMap[key][record.month] || 0) + weeklyTotal;
  }

  // 결과 배열로 변환
  const result: Array<{ channel: string; subChannel: string | null; monthlyActuals: Record<number, number> }> = [];
  for (const [key, monthlyActuals] of Object.entries(actualsMap)) {
    const [channel, subChannel] = key.split('-');
    result.push({ channel, subChannel: subChannel || null, monthlyActuals });
  }

  return result;
}


// ===== Task Attachments =====

export async function getTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(taskAttachments).where(eq(taskAttachments.taskId, taskId)).orderBy(desc(taskAttachments.createdAt));
}

export async function createTaskAttachment(data: {
  taskId: string;
  userId: number;
  fileName: string;
  fileKey: string;
  url: string;
  mimeType: string;
  fileSize: number;
}): Promise<TaskAttachment | null> {
  const db = await getDb();
  if (!db) return null;
  await db.insert(taskAttachments).values({
    taskId: data.taskId,
    userId: data.userId,
    fileName: data.fileName,
    fileKey: data.fileKey,
    url: data.url,
    mimeType: data.mimeType,
    fileSize: data.fileSize,
  });
  const [attachment] = await db.select().from(taskAttachments)
    .where(eq(taskAttachments.fileKey, data.fileKey))
    .limit(1);
  return attachment ?? null;
}

export async function deleteTaskAttachment(id: number, userId: number, isAdmin: boolean = false): Promise<void> {
  const db = await getDb();
  if (!db) return;
  if (isAdmin) {
    await db.delete(taskAttachments).where(eq(taskAttachments.id, id));
  } else {
    await db.delete(taskAttachments).where(
      and(eq(taskAttachments.id, id), eq(taskAttachments.userId, userId))
    );
  }
}


// ==================== Financial Records Functions ====================

// 재무 레코드 조회 (월별)
export async function getFinancialRecords(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(financialRecords)
    .where(and(eq(financialRecords.year, year), eq(financialRecords.month, month)))
    .orderBy(financialRecords.week, financialRecords.sortOrder);
}

// 재무 레코드 생성
export async function createFinancialRecord(data: Omit<InsertFinancialRecord, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) return null;
  const id = nanoid();
  await db.insert(financialRecords).values({ ...data, id });
  const [record] = await db.select().from(financialRecords).where(eq(financialRecords.id, id));
  return record;
}

// 재무 레코드 수정
export async function updateFinancialRecord(id: string, data: Partial<Omit<InsertFinancialRecord, 'id' | 'createdAt' | 'updatedAt'>>) {
  const db = await getDb();
  if (!db) return null;
  await db.update(financialRecords).set(data).where(eq(financialRecords.id, id));
  const [record] = await db.select().from(financialRecords).where(eq(financialRecords.id, id));
  return record;
}

// 재무 레코드 삭제
export async function deleteFinancialRecord(id: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(financialRecords).where(eq(financialRecords.id, id));
}

// 재무 잔액 조회 (월별)
export async function getFinancialBalance(year: number, month: number) {
  const db = await getDb();
  if (!db) return null;
  const [balance] = await db.select().from(financialBalances)
    .where(and(eq(financialBalances.year, year), eq(financialBalances.month, month)));
  return balance || null;
}

// 재무 잔액 upsert (월별 기초잔액)
export async function upsertFinancialBalance(year: number, month: number, openingBalance: number) {
  const db = await getDb();
  if (!db) return null;
  const existing = await getFinancialBalance(year, month);
  if (existing) {
    await db.update(financialBalances).set({ openingBalance }).where(eq(financialBalances.id, existing.id));
    const [updated] = await db.select().from(financialBalances).where(eq(financialBalances.id, existing.id));
    return updated;
  } else {
    const id = nanoid();
    await db.insert(financialBalances).values({ id, year, month, openingBalance });
    const [created] = await db.select().from(financialBalances).where(eq(financialBalances.id, id));
    return created;
  }
}


// ==================== KPI Functions ====================

/**
 * KPI 항목 전체 조회 (지표 포함)
 */
export async function getKpiItemsWithIndicators() {
  const db = await getDb();
  if (!db) return [];
  
  const items = await db.select().from(kpiItems).where(eq(kpiItems.isActive, true)).orderBy(kpiItems.sortOrder);
  const indicators = await db.select().from(kpiIndicators).orderBy(kpiIndicators.sortOrder);
  
  return items.map(item => ({
    ...item,
    indicators: indicators.filter(ind => ind.kpiItemId === item.id),
  }));
}

/**
 * 특정 사업부의 KPI 항목 조회
 */
export async function getKpiItemsByDivision(division: string) {
  const db = await getDb();
  if (!db) return [];
  
  const items = await db.select().from(kpiItems)
    .where(and(eq(kpiItems.division, division), eq(kpiItems.isActive, true)))
    .orderBy(kpiItems.sortOrder);
  const indicators = await db.select().from(kpiIndicators).orderBy(kpiIndicators.sortOrder);
  
  return items.map(item => ({
    ...item,
    indicators: indicators.filter(ind => ind.kpiItemId === item.id),
  }));
}

/**
 * 특정 부서의 KPI 항목 조회
 */
export async function getKpiItemsByDepartment(division: string, department: string) {
  const db = await getDb();
  if (!db) return [];
  
  const items = await db.select().from(kpiItems)
    .where(and(
      eq(kpiItems.division, division),
      eq(kpiItems.department, department),
      eq(kpiItems.isActive, true)
    ))
    .orderBy(kpiItems.sortOrder);
  const indicators = await db.select().from(kpiIndicators).orderBy(kpiIndicators.sortOrder);
  
  return items.map(item => ({
    ...item,
    indicators: indicators.filter(ind => ind.kpiItemId === item.id),
  }));
}

/**
 * KPI 실적 데이터 조회 (연도/월 기준)
 */
export async function getKpiRecords(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(kpiRecords)
    .where(and(eq(kpiRecords.year, year), eq(kpiRecords.month, month)));
}

/**
 * KPI 실적 데이터 조회 (연도 기준 - 월간 요약용)
 */
export async function getKpiRecordsByYear(year: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(kpiRecords)
    .where(eq(kpiRecords.year, year));
}

/**
 * KPI 실적 데이터 upsert (지표ID + 연도 + 월 + 주차 기준)
 */
export async function upsertKpiRecord(data: {
  kpiIndicatorId: number;
  year: number;
  month: number;
  week: number;
  value: string;
}) {
  const db = await getDb();
  if (!db) return null;
  
  const existing = await db.select().from(kpiRecords)
    .where(and(
      eq(kpiRecords.kpiIndicatorId, data.kpiIndicatorId),
      eq(kpiRecords.year, data.year),
      eq(kpiRecords.month, data.month),
      eq(kpiRecords.week, data.week)
    ));
  
  if (existing.length > 0) {
    await db.update(kpiRecords).set({ value: data.value })
      .where(eq(kpiRecords.id, existing[0].id));
    return existing[0].id;
  } else {
    const [result] = await db.insert(kpiRecords).values(data).$returningId();
    return result.id;
  }
}

/**
 * KPI 실적 데이터 일괄 upsert
 */
export async function bulkUpsertKpiRecords(records: Array<{
  kpiIndicatorId: number;
  year: number;
  month: number;
  week: number;
  value: string;
}>) {
  const results = [];
  for (const record of records) {
    const id = await upsertKpiRecord(record);
    results.push(id);
  }
  return results;
}

/**
 * KPI 실적 데이터 삭제
 */
export async function deleteKpiRecord(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(kpiRecords).where(eq(kpiRecords.id, id));
}

/**
 * KPI 항목 생성
 */
export async function createKpiItem(data: Omit<InsertKpiItem, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(kpiItems).values(data).$returningId();
  return result.id;
}

/**
 * KPI 항목 수정
 */
export async function updateKpiItem(id: number, data: Partial<InsertKpiItem>) {
  const db = await getDb();
  if (!db) return;
  await db.update(kpiItems).set(data).where(eq(kpiItems.id, id));
}

/**
 * KPI 항목 삭제 (soft delete)
 */
export async function deleteKpiItem(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(kpiItems).set({ isActive: false }).where(eq(kpiItems.id, id));
}

/**
 * KPI 지표 생성
 */
export async function createKpiIndicator(data: Omit<InsertKpiIndicator, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(kpiIndicators).values(data).$returningId();
  return result.id;
}

/**
 * KPI 지표 수정
 */
export async function updateKpiIndicator(id: number, data: Partial<InsertKpiIndicator>) {
  const db = await getDb();
  if (!db) return;
  await db.update(kpiIndicators).set(data).where(eq(kpiIndicators.id, id));
}

/**
 * KPI 지표 삭제
 */
export async function deleteKpiIndicator(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(kpiIndicators).where(eq(kpiIndicators.id, id));
}

// ==================== KPI Targets (전월실적/금월목표) ====================

export async function getKpiTargets(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(kpiTargets)
    .where(and(eq(kpiTargets.year, year), eq(kpiTargets.month, month)));
}

export async function getKpiTargetsByYear(year: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(kpiTargets)
    .where(eq(kpiTargets.year, year));
}

export async function upsertKpiTarget(data: {
  kpiIndicatorId: number;
  year: number;
  month: number;
  monthlyTarget?: string;
  previousActual?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  const existing = await db.select().from(kpiTargets)
    .where(and(
      eq(kpiTargets.kpiIndicatorId, data.kpiIndicatorId),
      eq(kpiTargets.year, data.year),
      eq(kpiTargets.month, data.month),
    ))
    .limit(1);

  if (existing.length > 0) {
    const updateData: Record<string, string> = {};
    if (data.monthlyTarget !== undefined) updateData.monthlyTarget = data.monthlyTarget;
    if (data.previousActual !== undefined) updateData.previousActual = data.previousActual;
    await db.update(kpiTargets).set(updateData).where(eq(kpiTargets.id, existing[0].id));
    return existing[0].id;
  } else {
    const [result] = await db.insert(kpiTargets).values({
      kpiIndicatorId: data.kpiIndicatorId,
      year: data.year,
      month: data.month,
      monthlyTarget: data.monthlyTarget || '0',
      previousActual: data.previousActual || '0',
    }).$returningId();
    return result.id;
  }
}

export async function bulkUpsertKpiTargets(records: Array<{
  kpiIndicatorId: number;
  year: number;
  month: number;
  monthlyTarget?: string;
  previousActual?: string;
}>) {
  const ids: number[] = [];
  for (const rec of records) {
    const id = await upsertKpiTarget(rec);
    if (id != null) ids.push(id);
  }
  return ids;
}


// ==================== KPI Item Details (전월평가/금월계획/실행) ====================

export async function getKpiItemDetail(kpiItemId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(kpiItemDetails)
    .where(and(
      eq(kpiItemDetails.kpiItemId, kpiItemId),
      eq(kpiItemDetails.year, year),
      eq(kpiItemDetails.month, month),
    ));
  return rows[0] || null;
}

export async function getKpiItemDetailsByMonth(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(kpiItemDetails)
    .where(and(
      eq(kpiItemDetails.year, year),
      eq(kpiItemDetails.month, month),
    ));
}

export async function upsertKpiItemDetail(data: {
  kpiItemId: number;
  year: number;
  month: number;
  previousEvaluation?: string | null;
  currentPlan?: string | null;
  execution?: string | null;
}) {
  const db = await getDb();
  if (!db) return null;
  
  const existing = await getKpiItemDetail(data.kpiItemId, data.year, data.month);
  
  if (existing) {
    const updates: Record<string, any> = {};
    if (data.previousEvaluation !== undefined) updates.previousEvaluation = data.previousEvaluation;
    if (data.currentPlan !== undefined) updates.currentPlan = data.currentPlan;
    if (data.execution !== undefined) updates.execution = data.execution;
    
    if (Object.keys(updates).length > 0) {
      await db.update(kpiItemDetails).set(updates).where(eq(kpiItemDetails.id, existing.id));
    }
    return existing.id;
  } else {
    const result = await db.insert(kpiItemDetails).values({
      kpiItemId: data.kpiItemId,
      year: data.year,
      month: data.month,
      previousEvaluation: data.previousEvaluation ?? null,
      currentPlan: data.currentPlan ?? null,
      execution: data.execution ?? null,
    });
    return result[0].insertId;
  }
}

// ==================== KPI Assignees (담당자 관리) ====================

export async function getKpiAssignees() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(kpiAssignees)
    .where(eq(kpiAssignees.isActive, true))
    .orderBy(kpiAssignees.department, kpiAssignees.sortOrder);
}

export async function getAllKpiAssignees() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(kpiAssignees)
    .orderBy(kpiAssignees.department, kpiAssignees.sortOrder);
}

export async function getKpiAssigneesByDepartment(department: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(kpiAssignees)
    .where(and(
      eq(kpiAssignees.department, department),
      eq(kpiAssignees.isActive, true),
    ))
    .orderBy(kpiAssignees.sortOrder);
}

export async function createKpiAssignee(data: { name: string; department: string; sortOrder?: number }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(kpiAssignees).values({
    name: data.name,
    department: data.department,
    sortOrder: data.sortOrder ?? 0,
  });
  return result[0].insertId;
}

export async function updateKpiAssignee(id: number, data: Partial<{ name: string; department: string; isActive: boolean; sortOrder: number }>) {
  const db = await getDb();
  if (!db) return;
  await db.update(kpiAssignees).set(data).where(eq(kpiAssignees.id, id));
}

export async function deleteKpiAssignee(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(kpiAssignees).where(eq(kpiAssignees.id, id));
}

export async function assignKpiItemPerson(kpiItemId: number, person: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(kpiItems).set({ person }).where(eq(kpiItems.id, kpiItemId));
}


// ==================== Report Functions ====================

export async function getReports(filters: { type?: string; scope?: string; year: number; month: number; week?: number; targetUserId?: number; targetTeamId?: number; targetDivisionId?: number }) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    eq(reports.year, filters.year),
    eq(reports.month, filters.month),
  ];
  
  if (filters.type) conditions.push(eq(reports.type, filters.type as any));
  if (filters.scope) conditions.push(eq(reports.scope, filters.scope as any));
  if (filters.week != null) conditions.push(eq(reports.week, filters.week));
  if (filters.targetUserId != null) conditions.push(eq(reports.targetUserId, filters.targetUserId));
  if (filters.targetTeamId != null) conditions.push(eq(reports.targetTeamId, filters.targetTeamId));
  if (filters.targetDivisionId != null) conditions.push(eq(reports.targetDivisionId, filters.targetDivisionId));
  
  return await db.select().from(reports).where(and(...conditions)).orderBy(desc(reports.createdAt));
}

export async function getReportById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(reports).where(eq(reports.id, id));
  return result[0] || null;
}

export async function createReport(data: Omit<InsertReport, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(reports).values(data);
  return result[0];
}

export async function updateReport(id: number, data: Partial<InsertReport>) {
  const db = await getDb();
  if (!db) return;
  await db.update(reports).set(data).where(eq(reports.id, id));
}

export async function deleteReport(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(reports).where(eq(reports.id, id));
}

// 보고서 자동 생성을 위한 데이터 집계 함수
export async function getReportDataForUser(userId: number, year: number, month: number, week?: number) {
  const db = await getDb();
  if (!db) return null;
  
  // 1. 해당 사용자의 업무 목록
  const userTasks = await db.select().from(tasks).where(eq(tasks.userId, userId));
  
  // 2. 업무 진행 이력
  const taskIds = userTasks.map(t => t.id);
  let progressLogs: any[] = [];
  if (taskIds.length > 0) {
    // 모든 진행 이력 조회 후 필터링
    const allLogs = await db.select().from(taskProgressLogs);
    progressLogs = allLogs.filter(log => taskIds.includes(log.taskId));
  }
  
  // 3. KPI 데이터 - 해당 사용자의 KPI 항목
  const user = await db.select().from(users).where(eq(users.id, userId));
  const userName = user[0]?.koreanName || user[0]?.name || '';
  
  // KPI 항목 중 해당 사용자(담당자)의 항목
  const allKpiItems = await db.select().from(kpiItems);
  const userKpiItems = allKpiItems.filter(item => item.person === userName);
  
  // KPI 지표
  const kpiItemIds = userKpiItems.map(item => item.id);
  let userKpiIndicators: any[] = [];
  if (kpiItemIds.length > 0) {
    const allIndicators = await db.select().from(kpiIndicators);
    userKpiIndicators = allIndicators.filter(ind => kpiItemIds.includes(ind.kpiItemId));
  }
  
  // KPI 실적
  const indicatorIds = userKpiIndicators.map(ind => ind.id);
  let userKpiRecords: any[] = [];
  if (indicatorIds.length > 0) {
    const allRecords = await db.select().from(kpiRecords).where(
      and(eq(kpiRecords.year, year), eq(kpiRecords.month, month))
    );
    userKpiRecords = allRecords.filter(rec => indicatorIds.includes(rec.kpiIndicatorId));
  }
  
  // KPI 목표
  let userKpiTargets: any[] = [];
  if (indicatorIds.length > 0) {
    const allTargets = await db.select().from(kpiTargets).where(
      and(eq(kpiTargets.year, year), eq(kpiTargets.month, month))
    );
    userKpiTargets = allTargets.filter(t => indicatorIds.includes(t.kpiIndicatorId));
  }
  
  // KPI 업무 상세 (전월평가/금월계획/실행)
  let userKpiDetails: any[] = [];
  if (kpiItemIds.length > 0) {
    const allDetails = await db.select().from(kpiItemDetails).where(
      and(eq(kpiItemDetails.year, year), eq(kpiItemDetails.month, month))
    );
    userKpiDetails = allDetails.filter(d => kpiItemIds.includes(d.kpiItemId));
  }
  
  return {
    user: user[0],
    tasks: userTasks,
    progressLogs,
    kpiItems: userKpiItems,
    kpiIndicators: userKpiIndicators,
    kpiRecords: userKpiRecords,
    kpiTargets: userKpiTargets,
    kpiDetails: userKpiDetails,
  };
}

// 팀별 보고서 데이터 집계
export async function getReportDataForTeam(teamId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return null;
  
  // 팀 정보
  const team = await db.select().from(teams).where(eq(teams.id, teamId));
  if (!team[0]) return null;
  
  // 팀원 목록
  const teamMembers = await db.select().from(users).where(eq(users.teamId, teamId));
  
  // 각 팀원의 데이터 집계
  const memberData = await Promise.all(
    teamMembers.map(async (member) => {
      const data = await getReportDataForUser(member.id, year, month);
      return { member, data };
    })
  );
  
  return {
    team: team[0],
    members: memberData,
  };
}


/**
 * 활성 멤버 목록 조회 (프로필 완성된 사용자만)
 * 모든 로그인 사용자가 접근 가능 - 담당자 선택 드롭다운 등에 사용
 */
export async function getActiveMembers(): Promise<Array<{
  id: number;
  koreanName: string | null;
  name: string | null;
  divisionId: number | null;
  teamId: number | null;
  positionId: number | null;
  rankId: number | null;
  divisionName: string | null;
  teamName: string | null;
  positionName: string | null;
  rankName: string | null;
}>> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get active members: database not available");
    return [];
  }

  const result = await db
    .select({
      id: users.id,
      koreanName: users.koreanName,
      name: users.name,
      divisionId: users.divisionId,
      teamId: users.teamId,
      positionId: users.positionId,
      rankId: users.rankId,
      divisionName: divisions.name,
      teamName: teams.name,
      positionName: positions.name,
      rankName: ranks.name,
    })
    .from(users)
    .leftJoin(divisions, eq(users.divisionId, divisions.id))
    .leftJoin(teams, eq(users.teamId, teams.id))
    .leftJoin(positions, eq(users.positionId, positions.id))
    .leftJoin(ranks, eq(users.rankId, ranks.id))
    .where(eq(users.isProfileComplete, true))
    .orderBy(users.koreanName);

  return result;
}
