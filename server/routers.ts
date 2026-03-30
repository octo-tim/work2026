import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ENV } from './_core/env';
import { 
  createTask, getTasksByUserId, updateTask, deleteTask, updateTaskStatus, getNextTaskNumber,
  getAccessibleUsers, getTasksByTargetUserId,
  getSalesRecords, createSalesRecord, updateSalesRecord, deleteSalesRecord, upsertSalesRecord, getWeeklySalesSummary,
  getContractRecords, createContractRecord, updateContractRecord, deleteContractRecord, upsertContractRecord,
  getGoalsByUserId, createGoal, updateGoal, deleteGoal,
  // Organization functions
  getAllDivisions, getActiveDivisions, createDivision, updateDivision, deleteDivision,
  getAllTeams, getActiveTeams, getTeamsByDivision, createTeam, updateTeam, deleteTeam,
  getAllPositions, getActivePositions, getPositionById, createPosition, updatePosition, deletePosition,
  getAllRanks, getActiveRanks, createRank, updateRank, deleteRank,
  updateUserProfile, getUserWithOrganization,
  // Quarterly Review functions
  getQuarterlyReviews, getQuarterlyReviewByQuarter, createQuarterlyReview, updateQuarterlyReview, deleteQuarterlyReview,
  // Dashboard functions
  getDashboardStats, getAllTasksStats,
  // Meeting Minutes functions
  getMeetingMinutesByUserId, getAllMeetingMinutes, getMeetingMinuteById, createMeetingMinute, updateMeetingMinute, deleteMeetingMinute,
  // Sales Config functions
  getAllSalesCategories, getActiveSalesCategories, createSalesCategory, updateSalesCategory, deleteSalesCategory,
  getAllSalesItems, getSalesItemsByCategory, getActiveSalesItemsByCategory, createSalesItem, updateSalesItem, deleteSalesItem,
  getSalesCategoriesWithItems,
  // Contract Config functions
  getAllContractChannels, getActiveContractChannels, createContractChannel, updateContractChannel, deleteContractChannel,
  getAllContractSubChannels, getContractSubChannelsByChannel, getActiveContractSubChannelsByChannel, createContractSubChannel, updateContractSubChannel, deleteContractSubChannel,
  getContractChannelsWithSubChannels,
  // Member Management functions
  getAllUsers, deleteUser, updateUserRole, updateUserSalesPermission, updateUserFinancialPermission,
  // Task Progress Log functions
  getTaskProgressLogs, createTaskProgressLog, updateTaskProgressLog, deleteTaskProgressLog, saveTaskProgressLogs,
  // Archive functions
  archiveTasks, getArchivedTasks, getAllArchivedTasks, getArchivedTaskProgressLogs, restoreArchivedTask, deleteArchivedTask,
  // Sales Events functions
  getSalesEventsByMonth, createSalesEvent, updateSalesEvent, deleteSalesEvent, getSalesEventById,
  // Monthly Message functions
  getMonthlyMessage, upsertMonthlyMessage, deleteMonthlyMessage,
  // Business Plan functions
  getBusinessPlansByYear, getBusinessPlansByCategory, createBusinessPlan, updateBusinessPlan, deleteBusinessPlan, deleteBusinessPlansByYear, bulkCreateBusinessPlans,
  // Business Plan Actuals functions
  getBusinessPlanActualsByYear, upsertBusinessPlanActual, updateBusinessPlanActualMonth, deleteBusinessPlanActualsByYear,
  // Business Plan History functions
  getBusinessPlanHistoryByPlanId, getBusinessPlanHistoryByYear, createBusinessPlanHistory, deleteBusinessPlanHistoryByYear,
  // Business Plan <-> Sales Integration functions
  getBusinessPlanMonthlyTarget, syncSalesActualToBusinessPlan,
  getBusinessPlanMonthlyTargetBySubDivision, getSalesMonthlyActualBySubDivision, getBusinessPlanAllMonthlyTargets, getSalesAllMonthlyActuals, getBusinessPlanMonthlyActuals, getSalesRecordsMonthlyActuals,
  // Contract Business Plan functions
  getContractBusinessPlansByYear, getContractBusinessPlansByChannel, createContractBusinessPlan, updateContractBusinessPlan, deleteContractBusinessPlan, upsertContractBusinessPlan, updateContractBusinessPlanMonth, deleteContractBusinessPlansByYear,
  // Contract Business Plan History functions
  getContractBusinessPlanHistoryByPlanId, getContractBusinessPlanHistoryByYear, createContractBusinessPlanHistory, deleteContractBusinessPlanHistoryByYear,
  // Contract Business Plan <-> Sales Integration functions
  getContractBusinessPlanMonthlyTarget, getContractBusinessPlanAllMonthlyTargets, getContractRecordsMonthlyActuals, getContractRecordsYearlyActuals,
  // Contract Business Plan Actual functions
  updateContractBusinessPlanActual, getContractBusinessPlanAllMonthlyActuals,
  // Task Attachment functions
  getTaskAttachments, createTaskAttachment, deleteTaskAttachment,
  // Financial Records functions
  getFinancialRecords, createFinancialRecord, updateFinancialRecord, deleteFinancialRecord,
  getFinancialBalance, upsertFinancialBalance, bulkCreateFinancialRecords, deleteFinancialRecordsByMonth, deleteFinancialRecordsByWeeks,
  // KPI functions
  getKpiItemsWithIndicators, getKpiItemsByDivision, getKpiItemsByDepartment,
  getKpiRecords, getKpiRecordsByYear, upsertKpiRecord, bulkUpsertKpiRecords, deleteKpiRecord,
  createKpiItem, updateKpiItem, deleteKpiItem,
  createKpiIndicator, updateKpiIndicator, deleteKpiIndicator,
  // KPI Targets functions
  getKpiTargets, getKpiTargetsByYear, upsertKpiTarget, bulkUpsertKpiTargets,
  // KPI Item Details functions
  getKpiItemDetail, getKpiItemDetailsByMonth, upsertKpiItemDetail,
  // KPI Assignees functions
  getKpiAssignees, getAllKpiAssignees, getKpiAssigneesByDepartment, createKpiAssignee, updateKpiAssignee, deleteKpiAssignee, assignKpiItemPerson,
  // Report functions
  getReports, getReportById, createReport, updateReport, deleteReport, getReportDataForUser, getReportDataForTeam,
  // Active Members
  getActiveMembers
} from "./db";

const taskStatusEnum = z.enum(["pending", "in-progress", "completed"]);
const divisionEnum = z.enum(["bombom", "ricoco", "manufacturing", "online", "mat", "distribution"]);

// Admin procedure - only allows admin users
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: '관리자 권한이 필요합니다' });
  }
  return next({ ctx });
});

// Sales editor procedure - allows admin users or users with canEditSales permission
const salesEditorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin' && !ctx.user.canEditSales) {
    throw new TRPCError({ code: 'FORBIDDEN', message: '매출 편집 권한이 필요합니다' });
  }
  return next({ ctx });
});

// Owner procedure - only allows the project owner or admin
const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  const isOwner = ctx.user.openId === ENV.ownerOpenId;
  const isAdmin = ctx.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw new TRPCError({ code: 'FORBIDDEN', message: '소유자만 접근할 수 있습니다' });
  }
  return next({ ctx });
});

// Financial editor procedure - allows admin, owner, or users with canEditFinancial permission
const financialEditorProcedure = protectedProcedure.use(({ ctx, next }) => {
  const isOwner = ctx.user.openId === ENV.ownerOpenId;
  const isAdmin = ctx.user.role === 'admin';
  const hasPermission = ctx.user.canEditFinancial;
  if (!isOwner && !isAdmin && !hasPermission) {
    throw new TRPCError({ code: 'FORBIDDEN', message: '재무 편집 권한이 필요합니다' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ==================== User Profile Router ====================
  profile: router({
    // Get current user's profile with organization info
    get: protectedProcedure.query(async ({ ctx }) => {
      const result = await getUserWithOrganization(ctx.user.id);
      return result;
    }),

    // Update current user's profile (organization info)
    update: protectedProcedure
      .input(z.object({
        koreanName: z.string().nullable().optional(),
        divisionId: z.number().nullable().optional(),
        teamId: z.number().nullable().optional(),
        positionId: z.number().nullable().optional(),
        rankId: z.number().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 임원 직책 확인 (임원은 사업부/팀 없이도 프로필 완료)
        let isExecutive = false;
        if (input.positionId) {
          const position = await getPositionById(input.positionId);
          isExecutive = position?.name === '임원';
        }
        
        // 임원은 직책/직급만 있으면 완료, 일반 직원은 모든 항목 필요
        const isComplete = isExecutive 
          ? (input.positionId != null && input.rankId != null)
          : (input.divisionId != null && input.teamId != null && 
             input.positionId != null && input.rankId != null);
        
        await updateUserProfile(ctx.user.id, {
          ...input,
          isProfileComplete: isComplete,
        });
        return { success: true };
      }),
  }),

  // ==================== Organization Router (Admin Only) ====================
  organization: router({
    // Division management
    division: router({
      listAll: adminProcedure.query(async () => {
        return await getAllDivisions();
      }),
      listActive: protectedProcedure.query(async () => {
        return await getActiveDivisions();
      }),
      create: adminProcedure
        .input(z.object({
          name: z.string().min(1, "사업부명은 필수입니다"),
          description: z.string().optional(),
          sortOrder: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
          return await createDivision(input);
        }),
      update: adminProcedure
        .input(z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
          sortOrder: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...updates } = input;
          await updateDivision(id, updates);
          return { success: true };
        }),
      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await deleteDivision(input.id);
          return { success: true };
        }),
    }),

    // Team management
    team: router({
      listAll: adminProcedure.query(async () => {
        return await getAllTeams();
      }),
      listActive: protectedProcedure.query(async () => {
        return await getActiveTeams();
      }),
      listByDivision: protectedProcedure
        .input(z.object({ divisionId: z.number() }))
        .query(async ({ input }) => {
          return await getTeamsByDivision(input.divisionId);
        }),
      create: adminProcedure
        .input(z.object({
          divisionId: z.number(),
          name: z.string().min(1, "팀명은 필수입니다"),
          description: z.string().optional(),
          sortOrder: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
          return await createTeam(input);
        }),
      update: adminProcedure
        .input(z.object({
          id: z.number(),
          divisionId: z.number().optional(),
          name: z.string().optional(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
          sortOrder: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...updates } = input;
          await updateTeam(id, updates);
          return { success: true };
        }),
      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await deleteTeam(input.id);
          return { success: true };
        }),
    }),

    // Position management
    position: router({
      listAll: adminProcedure.query(async () => {
        return await getAllPositions();
      }),
      listActive: protectedProcedure.query(async () => {
        return await getActivePositions();
      }),
      create: adminProcedure
        .input(z.object({
          name: z.string().min(1, "직책명은 필수입니다"),
          description: z.string().optional(),
          sortOrder: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
          return await createPosition(input);
        }),
      update: adminProcedure
        .input(z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
          sortOrder: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...updates } = input;
          await updatePosition(id, updates);
          return { success: true };
        }),
      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await deletePosition(input.id);
          return { success: true };
        }),
    }),

    // Rank management
    rank: router({
      listAll: adminProcedure.query(async () => {
        return await getAllRanks();
      }),
      listActive: protectedProcedure.query(async () => {
        return await getActiveRanks();
      }),
      create: adminProcedure
        .input(z.object({
          name: z.string().min(1, "직급명은 필수입니다"),
          level: z.number().optional(),
          description: z.string().optional(),
          sortOrder: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
          return await createRank(input);
        }),
      update: adminProcedure
        .input(z.object({
          id: z.number(),
          name: z.string().optional(),
          level: z.number().optional(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
          sortOrder: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...updates } = input;
          await updateRank(id, updates);
          return { success: true };
        }),
      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await deleteRank(input.id);
          return { success: true };
        }),
    }),
  }),

  task: router({
    // List all tasks for the current user
    list: protectedProcedure.query(async ({ ctx }) => {
      const tasks = await getTasksByUserId(ctx.user.id);
      return tasks;
    }),

    // Get accessible users based on current user's role
    accessibleUsers: protectedProcedure.query(async ({ ctx }) => {
      const result = await getAccessibleUsers(ctx.user.id);
      return result;
    }),

    // List tasks for a specific user (with permission check)
    listByUser: protectedProcedure
      .input(z.object({
        targetUserId: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        const tasks = await getTasksByTargetUserId(ctx.user.id, input.targetUserId);
        return tasks;
      }),

    // Create a new task
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1, "제목은 필수입니다"),
        department: z.string().optional().default(""),
        assignee: z.string().optional().default(""),
        schedule: z.string().optional().default(""),
        details: z.string().optional().default(""),
        status: taskStatusEnum.optional().default("pending"),
        startDate: z.date().optional().nullable(),
        dueDate: z.date().optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const nextNumber = await getNextTaskNumber(ctx.user.id);
        const task = await createTask({
          userId: ctx.user.id,
          number: nextNumber,
          title: input.title,
          department: input.department,
          assignee: input.assignee,
          schedule: input.schedule,
          details: input.details,
          status: input.status,
          startDate: input.startDate ?? undefined,
          dueDate: input.dueDate ?? undefined,
        });
        return task;
      }),

    // Update a task
    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        title: z.string().min(1, "제목은 필수입니다").optional(),
        department: z.string().optional(),
        assignee: z.string().optional(),
        schedule: z.string().optional(),
        details: z.string().optional(),
        status: taskStatusEnum.optional(),
        startDate: z.date().optional().nullable(),
        dueDate: z.date().optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        const isAdmin = ctx.user.role === 'admin';
        await updateTask(id, ctx.user.id, updates, isAdmin);
        return { success: true };
      }),

    // Update task status only
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.string(),
        status: taskStatusEnum,
      }))
      .mutation(async ({ ctx, input }) => {
        const isAdmin = ctx.user.role === 'admin';
        await updateTaskStatus(input.id, ctx.user.id, input.status, isAdmin);
        return { success: true };
      }),

    // Delete a task
    delete: protectedProcedure
      .input(z.object({
        id: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const isAdmin = ctx.user.role === 'admin';
        await deleteTask(input.id, ctx.user.id, isAdmin);
        return { success: true };
      }),

    // Get progress logs for a task
    getProgressLogs: protectedProcedure
      .input(z.object({
        taskId: z.string(),
      }))
      .query(async ({ input }) => {
        const logs = await getTaskProgressLogs(input.taskId);
        return logs;
      }),

    // Save progress logs for a task (replace all)
    saveProgressLogs: protectedProcedure
      .input(z.object({
        taskId: z.string(),
        logs: z.array(z.object({
          logDate: z.date(),
          content: z.string().min(1, "내용은 필수입니다"),
        })),
      }))
      .mutation(async ({ input }) => {
        const logs = await saveTaskProgressLogs(input.taskId, input.logs);
        return logs;
      }),

    // Add a single progress log
    addProgressLog: protectedProcedure
      .input(z.object({
        taskId: z.string(),
        logDate: z.date(),
        content: z.string().min(1, "내용은 필수입니다"),
      }))
      .mutation(async ({ input }) => {
        const log = await createTaskProgressLog(input);
        return log;
      }),

    // Update a progress log
    updateProgressLog: protectedProcedure
      .input(z.object({
        id: z.number(),
        logDate: z.date().optional(),
        content: z.string().min(1, "내용은 필수입니다").optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await updateTaskProgressLog(id, updates);
        return { success: true };
      }),

    // Delete a progress log
    deleteProgressLog: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        await deleteTaskProgressLog(input.id);
        return { success: true };
      }),

    // ===== Task Attachments =====
    getAttachments: protectedProcedure
      .input(z.object({ taskId: z.string() }))
      .query(async ({ input }) => {
        return getTaskAttachments(input.taskId);
      }),

    uploadAttachment: protectedProcedure
      .input(z.object({
        taskId: z.string(),
        fileName: z.string(),
        fileBase64: z.string(),
        mimeType: z.string().default('application/octet-stream'),
        fileSize: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const { storagePut } = await import('./storage');
        const buffer = Buffer.from(input.fileBase64, 'base64');
        const randomSuffix = Math.random().toString(36).substring(2, 10);
        const fileKey = `task-attachments/${input.taskId}/${randomSuffix}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        const attachment = await createTaskAttachment({
          taskId: input.taskId,
          userId: ctx.user.id,
          fileName: input.fileName,
          fileKey,
          url,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
        });
        return attachment;
      }),

    deleteAttachment: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const isAdmin = ctx.user.role === 'admin';
        await deleteTaskAttachment(input.id, ctx.user.id, isAdmin);
        return { success: true };
      }),

    // Archive multiple tasks
    archive: protectedProcedure
      .input(z.object({
        taskIds: z.array(z.string()).min(1, "아카이브할 업무를 선택해주세요"),
        reason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const archived = await archiveTasks(input.taskIds, ctx.user.id, input.reason);
        return { success: true, archivedCount: archived.length };
      }),

    // Get archived tasks for current user
    listArchived: protectedProcedure.query(async ({ ctx }) => {
      const archived = await getArchivedTasks(ctx.user.id);
      return archived;
    }),

    // Get all archived tasks (admin only)
    listAllArchived: adminProcedure.query(async () => {
      const archived = await getAllArchivedTasks();
      return archived;
    }),

    // Get progress logs for an archived task
    getArchivedProgressLogs: protectedProcedure
      .input(z.object({
        archivedTaskId: z.string(),
      }))
      .query(async ({ input }) => {
        const logs = await getArchivedTaskProgressLogs(input.archivedTaskId);
        return logs;
      }),

    // Restore an archived task
    restore: protectedProcedure
      .input(z.object({
        archivedTaskId: z.string(),
      }))
      .mutation(async ({ input }) => {
        const restored = await restoreArchivedTask(input.archivedTaskId);
        if (!restored) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '아카이브된 업무를 찾을 수 없습니다' });
        }
        return { success: true, task: restored };
      }),

    // Permanently delete an archived task
    deleteArchived: protectedProcedure
      .input(z.object({
        archivedTaskId: z.string(),
      }))
      .mutation(async ({ input }) => {
        await deleteArchivedTask(input.archivedTaskId);
        return { success: true };
      }),
  }),

  // ==================== Sales Router ====================
  sales: router({
    // List sales records for a specific month
    list: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
        division: divisionEnum.optional(),
      }))
      .query(async ({ input }) => {
        const records = await getSalesRecords(
          input.year,
          input.month,
          input.division
        );
        return records;
      }),

    // Create a new sales record (Sales editor)
    create: salesEditorProcedure
      .input(z.object({
        division: divisionEnum,
        productGroup: z.string().min(1, "제품그룹은 필수입니다"),
        monthlyTarget: z.number().optional().default(0),
        previousMonthSales: z.number().optional().default(0),
        week1Sales: z.number().optional().default(0),
        week2Sales: z.number().optional().default(0),
        week3Sales: z.number().optional().default(0),
        week4Sales: z.number().optional().default(0),
        week5Sales: z.number().optional().default(0),
        cumulativeSales: z.number().optional().default(0),
        achievementRate: z.string().optional().default("0"),
        year: z.number(),
        month: z.number().min(1).max(12),
      }))
      .mutation(async ({ ctx, input }) => {
        const record = await createSalesRecord({
          userId: ctx.user.id,
          ...input,
        });
        return record;
      }),

    // Update a sales record (Sales editor)
    update: salesEditorProcedure
      .input(z.object({
        id: z.string(),
        productGroup: z.string().optional(),
        monthlyTarget: z.number().optional(),
        previousMonthSales: z.number().optional(),
        week1Sales: z.number().optional(),
        week2Sales: z.number().optional(),
        week3Sales: z.number().optional(),
        week4Sales: z.number().optional(),
        week5Sales: z.number().optional(),
        cumulativeSales: z.number().optional(),
        achievementRate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await updateSalesRecord(id, ctx.user.id, updates);
        return { success: true };
      }),

    // Delete a sales record (Sales editor)
    delete: salesEditorProcedure
      .input(z.object({
        id: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await deleteSalesRecord(input.id, ctx.user.id);
        return { success: true };
      }),

    // Upsert a sales record (create or update based on division + productGroup + year + month) (Sales editor)
    upsert: salesEditorProcedure
      .input(z.object({
        division: z.string().min(1, "사업부는 필수입니다"),
        productGroup: z.string().min(1, "제품그룹은 필수입니다"),
        monthlyTarget: z.number().optional().default(0),
        previousMonthSales: z.number().optional().default(0),
        week1Sales: z.number().optional().default(0),
        week2Sales: z.number().optional().default(0),
        week3Sales: z.number().optional().default(0),
        week4Sales: z.number().optional().default(0),
        week5Sales: z.number().optional().default(0),
        year: z.number(),
        month: z.number().min(1).max(12),
      }))
      .mutation(async ({ ctx, input }) => {
        const record = await upsertSalesRecord({
          userId: ctx.user.id,
          ...input,
        });
        return record;
      }),

    // Get weekly sales summary for a specific month
    weeklySummary: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      }))
      .query(async ({ input }) => {
        const summary = await getWeeklySalesSummary(input.year, input.month);
        return summary;
      }),

    // Get previous month actuals from sales records (실제 매출 데이터)
    getPreviousMonthActuals: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      }))
      .query(async ({ input }) => {
        // 매출관리 페이지의 실제 매출 데이터에서 조회
        const actuals = await getSalesRecordsMonthlyActuals(input.year, input.month);
        return actuals;
      }),
  }),

  // ==================== Goal Router ====================
  goal: router({
    // List goals for a specific year
    list: protectedProcedure
      .input(z.object({
        year: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        const goals = await getGoalsByUserId(ctx.user.id, input.year);
        return goals;
      }),

    // Create a new goal
    create: protectedProcedure
      .input(z.object({
        year: z.number(),
        category: z.string().min(1, "카테고리는 필수입니다"),
        title: z.string().min(1, "목표 제목은 필수입니다"),
        description: z.string().optional().default(""),
        targetValue: z.number().optional().default(0),
        currentValue: z.number().optional().default(0),
        unit: z.string().optional().default(""),
        priority: z.enum(["high", "medium", "low"]).optional().default("medium"),
        status: z.enum(["not-started", "in-progress", "completed", "delayed"]).optional().default("not-started"),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const goal = await createGoal({
          userId: ctx.user.id,
          ...input,
        });
        return goal;
      }),

    // Update a goal
    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        category: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        targetValue: z.number().optional(),
        currentValue: z.number().optional(),
        unit: z.string().optional(),
        priority: z.enum(["high", "medium", "low"]).optional(),
        status: z.enum(["not-started", "in-progress", "completed", "delayed"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await updateGoal(id, ctx.user.id, updates);
        return { success: true };
      }),

    // Delete a goal
    delete: protectedProcedure
      .input(z.object({
        id: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await deleteGoal(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ==================== Contract Router ====================
  contract: router({
    // List contract records for a specific month
    list: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
        brand: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const records = await getContractRecords(
          input.year,
          input.month,
          input.brand
        );
        return records;
      }),

    // Create a new contract record (Sales editor)
    create: salesEditorProcedure
      .input(z.object({
        brand: z.string().optional().default('bombom'),
        channel: z.string().min(1, "채널은 필수입니다"),
        previousMonthCount: z.number().optional().default(0),
        monthlyTarget: z.number().optional().default(0),
        week1Count: z.number().optional().default(0),
        week2Count: z.number().optional().default(0),
        week3Count: z.number().optional().default(0),
        week4Count: z.number().optional().default(0),
        week5Count: z.number().optional().default(0),
        totalCount: z.number().optional().default(0),
        year: z.number(),
        month: z.number().min(1).max(12),
      }))
      .mutation(async ({ ctx, input }) => {
        const record = await createContractRecord({
          userId: ctx.user.id,
          ...input,
        });
        return record;
      }),

    // Update a contract record (Sales editor)
    update: salesEditorProcedure
      .input(z.object({
        id: z.string(),
        channel: z.string().optional(),
        previousMonthCount: z.number().optional(),
        monthlyTarget: z.number().optional(),
        week1Count: z.number().optional(),
        week2Count: z.number().optional(),
        week3Count: z.number().optional(),
        week4Count: z.number().optional(),
        week5Count: z.number().optional(),
        totalCount: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await updateContractRecord(id, ctx.user.id, updates);
        return { success: true };
      }),

    // Delete a contract record (Sales editor)
    delete: salesEditorProcedure
      .input(z.object({
        id: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await deleteContractRecord(input.id, ctx.user.id);
        return { success: true };
      }),

    // Upsert a contract record (create or update based on brand + channel + subChannel + year + month) (Sales editor)
    upsert: salesEditorProcedure
      .input(z.object({
        brand: z.string().optional().default('bombom'),
        channel: z.string().min(1, "채널은 필수입니다"),
        subChannel: z.string().nullable().optional(),
        previousMonthCount: z.number().optional().default(0),
        monthlyTarget: z.number().optional().default(0),
        week1Count: z.number().optional().default(0),
        week2Count: z.number().optional().default(0),
        week3Count: z.number().optional().default(0),
        week4Count: z.number().optional().default(0),
        week5Count: z.number().optional().default(0),
        year: z.number(),
        month: z.number().min(1).max(12),
      }))
      .mutation(async ({ ctx, input }) => {
        const record = await upsertContractRecord({
          userId: ctx.user.id,
          ...input,
        });
        return record;
      }),
  }),

  // ==================== Quarterly Review Router ====================
  quarterlyReview: router({
    // List quarterly reviews for a specific year
    list: protectedProcedure
      .input(z.object({
        year: z.number(),
      }))
      .query(async ({ input }) => {
        const reviews = await getQuarterlyReviews(input.year);
        return reviews;
      }),

    // Get a specific quarterly review
    get: protectedProcedure
      .input(z.object({
        year: z.number(),
        quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]),
      }))
      .query(async ({ input }) => {
        const review = await getQuarterlyReviewByQuarter(input.year, input.quarter);
        return review;
      }),

    // Create a new quarterly review
    create: protectedProcedure
      .input(z.object({
        year: z.number(),
        quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]),
        salesTarget: z.number().optional().default(0),
        salesActual: z.number().optional().default(0),
        profitTarget: z.number().optional().default(0),
        profitActual: z.number().optional().default(0),
        strategy1Progress: z.number().min(0).max(100).optional().default(0),
        strategy2Progress: z.number().min(0).max(100).optional().default(0),
        strategy3Progress: z.number().min(0).max(100).optional().default(0),
        strategy4Progress: z.number().min(0).max(100).optional().default(0),
        achievements: z.string().optional().default(""),
        improvements: z.string().optional().default(""),
        nextQuarterPlan: z.string().optional().default(""),
        overallRating: z.enum(["excellent", "good", "fair", "poor"]).optional().default("fair"),
        overallComment: z.string().optional().default(""),
      }))
      .mutation(async ({ ctx, input }) => {
        const review = await createQuarterlyReview({
          userId: ctx.user.id,
          ...input,
        });
        return review;
      }),

    // Update a quarterly review
    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        salesTarget: z.number().optional(),
        salesActual: z.number().optional(),
        profitTarget: z.number().optional(),
        profitActual: z.number().optional(),
        strategy1Progress: z.number().min(0).max(100).optional(),
        strategy2Progress: z.number().min(0).max(100).optional(),
        strategy3Progress: z.number().min(0).max(100).optional(),
        strategy4Progress: z.number().min(0).max(100).optional(),
        achievements: z.string().optional(),
        improvements: z.string().optional(),
        nextQuarterPlan: z.string().optional(),
        overallRating: z.enum(["excellent", "good", "fair", "poor"]).optional(),
        overallComment: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await updateQuarterlyReview(id, ctx.user.id, updates);
        return { success: true };
      }),

    // Delete a quarterly review
    delete: protectedProcedure
      .input(z.object({
        id: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await deleteQuarterlyReview(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ==================== Dashboard Router ====================
  dashboard: router({
    // Get dashboard stats for current user
    myStats: protectedProcedure.query(async ({ ctx }) => {
      const stats = await getDashboardStats(ctx.user.id);
      return stats;
    }),

    // Get all tasks stats (admin only)
    allStats: adminProcedure.query(async () => {
      const stats = await getAllTasksStats();
      return stats;
    }),
  }),

  // ==================== Meeting Minutes Router ====================
  meetingMinutes: router({
    // List all meeting minutes (for current user or all for admin)
    list: protectedProcedure.query(async ({ ctx }) => {
      // Admin can see all meeting minutes
      if (ctx.user.role === 'admin') {
        return await getAllMeetingMinutes();
      }
      return await getMeetingMinutesByUserId(ctx.user.id);
    }),

    // Get a single meeting minute by ID
    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        const minute = await getMeetingMinuteById(input.id);
        return minute;
      }),

    // Create a new meeting minute
    create: protectedProcedure
      .input(z.object({
        meetingDate: z.string().transform(s => new Date(s)),
        title: z.string().min(1, "회의 주제는 필수입니다"),
        location: z.string().optional(),
        attendees: z.string().optional(), // JSON string
        content: z.string().optional(),
        decisions: z.string().optional(),
        actionItems: z.string().optional(), // JSON string
        nextMeetingDate: z.string().transform(s => new Date(s)).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const minute = await createMeetingMinute({
          userId: ctx.user.id,
          meetingDate: input.meetingDate,
          title: input.title,
          location: input.location,
          attendees: input.attendees,
          content: input.content,
          decisions: input.decisions,
          actionItems: input.actionItems,
          nextMeetingDate: input.nextMeetingDate,
        });
        return minute;
      }),

    // Update a meeting minute
    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        meetingDate: z.string().transform(s => new Date(s)).optional(),
        title: z.string().min(1).optional(),
        location: z.string().nullable().optional(),
        attendees: z.string().nullable().optional(),
        content: z.string().nullable().optional(),
        decisions: z.string().nullable().optional(),
        actionItems: z.string().nullable().optional(),
        nextMeetingDate: z.string().transform(s => new Date(s)).nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const minute = await updateMeetingMinute(id, data);
        return minute;
      }),

    // Delete a meeting minute
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await deleteMeetingMinute(input.id);
        return { success: true };
      }),
  }),

  // ==================== Sales Config Router ====================
  salesConfig: router({
    // Get all sales categories with items
    getCategoriesWithItems: protectedProcedure
      .query(async () => {
        return await getSalesCategoriesWithItems();
      }),

    // Get all sales categories
    listCategories: adminProcedure
      .query(async () => {
        return await getAllSalesCategories();
      }),

    // Create a sales category
    createCategory: adminProcedure
      .input(z.object({
        name: z.string().min(1, "카테고리명은 필수입니다"),
        division: z.string().min(1, "구분은 필수입니다"),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await createSalesCategory(input);
      }),

    // Update a sales category
    updateCategory: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        division: z.string().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await updateSalesCategory(id, data);
      }),

    // Delete a sales category
    deleteCategory: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteSalesCategory(input.id);
        return { success: true };
      }),

    // Get sales items by category
    listItems: adminProcedure
      .input(z.object({ categoryId: z.number() }))
      .query(async ({ input }) => {
        return await getSalesItemsByCategory(input.categoryId);
      }),

    // Create a sales item
    createItem: adminProcedure
      .input(z.object({
        categoryId: z.number(),
        name: z.string().min(1, "항목명은 필수입니다"),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await createSalesItem(input);
      }),

    // Update a sales item
    updateItem: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await updateSalesItem(id, data);
      }),

    // Delete a sales item
    deleteItem: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteSalesItem(input.id);
        return { success: true };
      }),
  }),

  // ==================== Contract Config Router ====================
  contractConfig: router({
    // Get all contract channels with sub channels
    getChannelsWithSubChannels: protectedProcedure
      .query(async () => {
        return await getContractChannelsWithSubChannels();
      }),

    // Get all contract channels
    listChannels: adminProcedure
      .query(async () => {
        return await getAllContractChannels();
      }),

    // Create a contract channel
    createChannel: adminProcedure
      .input(z.object({
        name: z.string().min(1, "채널명은 필수입니다"),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await createContractChannel(input);
      }),

    // Update a contract channel
    updateChannel: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await updateContractChannel(id, data);
      }),

    // Delete a contract channel
    deleteChannel: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteContractChannel(input.id);
        return { success: true };
      }),

    // Get contract sub channels by channel
    listSubChannels: adminProcedure
      .input(z.object({ channelId: z.number() }))
      .query(async ({ input }) => {
        return await getContractSubChannelsByChannel(input.channelId);
      }),

    // Create a contract sub channel
    createSubChannel: adminProcedure
      .input(z.object({
        channelId: z.number(),
        name: z.string().min(1, "세부 채널명은 필수입니다"),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await createContractSubChannel(input);
      }),

    // Update a contract sub channel
    updateSubChannel: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await updateContractSubChannel(id, data);
      }),

    // Delete a contract sub channel
    deleteSubChannel: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteContractSubChannel(input.id);
        return { success: true };
      }),
  }),

  // ==================== Member Management Router (Admin Only) ====================
  member: router({
    // 활성 멤버 목록 조회 (모든 로그인 사용자 접근 가능) - 담당자 선택 드롭다운 등에 사용
    activeList: protectedProcedure.query(async () => {
      return await getActiveMembers();
    }),

    // List all users (admin only)
    list: adminProcedure.query(async () => {
      return await getAllUsers();
    }),

    // Delete a user
    delete: adminProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 자기 자신은 삭제할 수 없음
        if (ctx.user.id === input.userId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: '자기 자신은 삭제할 수 없습니다' });
        }
        await deleteUser(input.userId);
        return { success: true };
      }),

    // Update user role
    updateRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(['user', 'admin']),
      }))
      .mutation(async ({ ctx, input }) => {
        // 자기 자신의 역할은 변경할 수 없음
        if (ctx.user.id === input.userId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: '자기 자신의 역할은 변경할 수 없습니다' });
        }
        await updateUserRole(input.userId, input.role);
        return { success: true };
      }),

    // Update user sales permission
    updateSalesPermission: adminProcedure
      .input(z.object({
        userId: z.number(),
        canEditSales: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        await updateUserSalesPermission(input.userId, input.canEditSales);
        return { success: true };
      }),

    // Update user financial permission
    updateFinancialPermission: adminProcedure
      .input(z.object({
        userId: z.number(),
        canEditFinancial: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        await updateUserFinancialPermission(input.userId, input.canEditFinancial);
        return { success: true };
      }),
  }),

  // ==================== Sales Event Router ====================
  salesEvent: router({
    // List events for a specific month
    list: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      }))
      .query(async ({ input }) => {
        const events = await getSalesEventsByMonth(input.year, input.month);
        return events;
      }),

    // Get single event by ID
    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        const event = await getSalesEventById(input.id);
        return event;
      }),

    // Create a new event (Admin or users with sales edit permission)
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1, "일정 제목은 필수입니다"),
        description: z.string().optional(),
        eventDate: z.string(), // ISO date string
        endDate: z.string().optional(),
        isAllDay: z.boolean().default(true),
        eventType: z.enum(["meeting", "deadline", "promotion", "holiday", "payment", "launch", "other"]).default("other"),
        color: z.string().optional(),
        division: z.string().optional(),
        reminderDays: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if user has permission (admin or canEditSales)
        if (ctx.user.role !== 'admin' && !ctx.user.canEditSales) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '일정 추가 권한이 없습니다' });
        }
        const event = await createSalesEvent({
          userId: ctx.user.id,
          title: input.title,
          description: input.description ?? null,
          eventDate: new Date(input.eventDate),
          endDate: input.endDate ? new Date(input.endDate) : null,
          isAllDay: input.isAllDay,
          eventType: input.eventType,
          color: input.color ?? "#3b82f6",
          division: input.division ?? null,
          reminderDays: input.reminderDays ?? 0,
        });
        return event;
      }),

    // Update an event
    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        eventDate: z.string().optional(),
        endDate: z.string().optional(),
        isAllDay: z.boolean().optional(),
        eventType: z.enum(["meeting", "deadline", "promotion", "holiday", "payment", "launch", "other"]).optional(),
        color: z.string().optional(),
        division: z.string().optional(),
        reminderDays: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if user has permission
        if (ctx.user.role !== 'admin' && !ctx.user.canEditSales) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '일정 수정 권한이 없습니다' });
        }
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.eventDate !== undefined) updateData.eventDate = new Date(data.eventDate);
        if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
        if (data.isAllDay !== undefined) updateData.isAllDay = data.isAllDay;
        if (data.eventType !== undefined) updateData.eventType = data.eventType;
        if (data.color !== undefined) updateData.color = data.color;
        if (data.division !== undefined) updateData.division = data.division;
        if (data.reminderDays !== undefined) updateData.reminderDays = data.reminderDays;
        
        const event = await updateSalesEvent(id, updateData);
        return event;
      }),

    // Delete an event
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        // Check if user has permission
        if (ctx.user.role !== 'admin' && !ctx.user.canEditSales) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '일정 삭제 권한이 없습니다' });
        }
        await deleteSalesEvent(input.id);
        return { success: true };
      }),
  }),

  // Monthly Message Router - 이달의 한마디
  monthlyMessage: router({
    // Get monthly message for a specific month
    get: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      }))
      .query(async ({ input }) => {
        const message = await getMonthlyMessage(input.year, input.month);
        return message;
      }),

    // Create or update monthly message
    upsert: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
        message: z.string().min(1).max(1000),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if user has permission (admin or canEditSales)
        if (ctx.user.role !== 'admin' && !ctx.user.canEditSales) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '이달의 한마디 수정 권한이 없습니다' });
        }
        
        const result = await upsertMonthlyMessage({
          userId: ctx.user.id,
          year: input.year,
          month: input.month,
          message: input.message,
          authorName: ctx.user.name || undefined,
        });
        
        return result;
      }),

    // Delete monthly message
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        // Check if user has permission
        if (ctx.user.role !== 'admin' && !ctx.user.canEditSales) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '이달의 한마디 삭제 권한이 없습니다' });
        }
        await deleteMonthlyMessage(input.id);
        return { success: true };
      }),
  }),

  // Business Plan Router
  businessPlan: router({
    // Get business plans by year
    getByYear: protectedProcedure
      .input(z.object({ year: z.number() }))
      .query(async ({ input }) => {
        return await getBusinessPlansByYear(input.year);
      }),

    // Get business plans by category
    getByCategory: protectedProcedure
      .input(z.object({ year: z.number(), category: z.string() }))
      .query(async ({ input }) => {
        return await getBusinessPlansByCategory(input.year, input.category);
      }),

    // Create business plan
    create: protectedProcedure
      .input(z.object({
        year: z.number(),
        category: z.string(),
        division: z.string(),
        subDivision: z.string().optional(),
        month1: z.string().optional(),
        month2: z.string().optional(),
        month3: z.string().optional(),
        month4: z.string().optional(),
        month5: z.string().optional(),
        month6: z.string().optional(),
        month7: z.string().optional(),
        month8: z.string().optional(),
        month9: z.string().optional(),
        month10: z.string().optional(),
        month11: z.string().optional(),
        month12: z.string().optional(),
        total: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && !ctx.user.canEditSales) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '사업계획 수정 권한이 없습니다' });
        }
        return await createBusinessPlan(input);
      }),

    // Update business plan
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        year: z.number().optional(),
        category: z.string().optional(),
        division: z.string().optional(),
        subDivision: z.string().optional(),
        month1: z.string().optional(),
        month2: z.string().optional(),
        month3: z.string().optional(),
        month4: z.string().optional(),
        month5: z.string().optional(),
        month6: z.string().optional(),
        month7: z.string().optional(),
        month8: z.string().optional(),
        month9: z.string().optional(),
        month10: z.string().optional(),
        month11: z.string().optional(),
        month12: z.string().optional(),
        total: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && !ctx.user.canEditSales) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '사업계획 수정 권한이 없습니다' });
        }
        const { id, ...data } = input;
        return await updateBusinessPlan(id, data);
      }),

    // Delete business plan
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && !ctx.user.canEditSales) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '사업계획 삭제 권한이 없습니다' });
        }
        await deleteBusinessPlan(input.id);
        return { success: true };
      }),

    // Delete all business plans by year
    deleteByYear: adminProcedure
      .input(z.object({ year: z.number() }))
      .mutation(async ({ input }) => {
        await deleteBusinessPlansByYear(input.year);
        return { success: true };
      }),

    // Bulk create business plans (for Excel import)
    bulkCreate: protectedProcedure
      .input(z.object({
        plans: z.array(z.object({
          year: z.number(),
          category: z.string(),
          division: z.string(),
          subDivision: z.string().optional(),
          month1: z.string().optional(),
          month2: z.string().optional(),
          month3: z.string().optional(),
          month4: z.string().optional(),
          month5: z.string().optional(),
          month6: z.string().optional(),
          month7: z.string().optional(),
          month8: z.string().optional(),
          month9: z.string().optional(),
          month10: z.string().optional(),
          month11: z.string().optional(),
          month12: z.string().optional(),
          total: z.string().optional(),
          sortOrder: z.number().optional(),
        }))
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && !ctx.user.canEditSales) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '사업계획 수정 권한이 없습니다' });
        }
        await bulkCreateBusinessPlans(input.plans);
        return { success: true };
      }),

    // ==================== 실적 관련 API ====================

    // Get actuals by year
    getActualsByYear: protectedProcedure
      .input(z.object({ year: z.number() }))
      .query(async ({ input }) => {
        return await getBusinessPlanActualsByYear(input.year);
      }),

    // Update actual month value
    updateActualMonth: protectedProcedure
      .input(z.object({
        year: z.number(),
        category: z.string(),
        division: z.string(),
        subDivision: z.string().nullable(),
        month: z.number().min(1).max(12),
        value: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && !ctx.user.canEditSales) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '실적 수정 권한이 없습니다' });
        }
        return await updateBusinessPlanActualMonth(
          input.year,
          input.category,
          input.division,
          input.subDivision,
          input.month,
          input.value
        );
      }),

    // Upsert actual (full row)
    upsertActual: protectedProcedure
      .input(z.object({
        year: z.number(),
        category: z.string(),
        division: z.string(),
        subDivision: z.string().optional(),
        month1: z.string().optional(),
        month2: z.string().optional(),
        month3: z.string().optional(),
        month4: z.string().optional(),
        month5: z.string().optional(),
        month6: z.string().optional(),
        month7: z.string().optional(),
        month8: z.string().optional(),
        month9: z.string().optional(),
        month10: z.string().optional(),
        month11: z.string().optional(),
        month12: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && !ctx.user.canEditSales) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '실적 수정 권한이 없습니다' });
        }
        return await upsertBusinessPlanActual(input);
      }),

    // Delete actuals by year
    deleteActualsByYear: adminProcedure
      .input(z.object({ year: z.number() }))
      .mutation(async ({ input }) => {
        await deleteBusinessPlanActualsByYear(input.year);
        return { success: true };
      }),

    // ==================== 변경 이력 관련 API ====================

    // Get history by plan ID
    getHistoryByPlanId: protectedProcedure
      .input(z.object({ businessPlanId: z.number() }))
      .query(async ({ input }) => {
        return await getBusinessPlanHistoryByPlanId(input.businessPlanId);
      }),

    // Get history by year
    getHistoryByYear: protectedProcedure
      .input(z.object({ year: z.number() }))
      .query(async ({ input }) => {
        return await getBusinessPlanHistoryByYear(input.year);
      }),

    // Create history (save current state before update)
    createHistory: protectedProcedure
      .input(z.object({
        businessPlanId: z.number(),
        year: z.number(),
        category: z.string(),
        division: z.string(),
        subDivision: z.string().nullable().optional(),
        month1: z.string().nullable().optional(),
        month2: z.string().nullable().optional(),
        month3: z.string().nullable().optional(),
        month4: z.string().nullable().optional(),
        month5: z.string().nullable().optional(),
        month6: z.string().nullable().optional(),
        month7: z.string().nullable().optional(),
        month8: z.string().nullable().optional(),
        month9: z.string().nullable().optional(),
        month10: z.string().nullable().optional(),
        month11: z.string().nullable().optional(),
        month12: z.string().nullable().optional(),
        total: z.string().nullable().optional(),
        changeReason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && !ctx.user.canEditSales) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '사업계획 수정 권한이 없습니다' });
        }
        return await createBusinessPlanHistory({
          ...input,
          changedBy: ctx.user.id,
        });
      }),

    // Delete history by year
    deleteHistoryByYear: adminProcedure
      .input(z.object({ year: z.number() }))
      .mutation(async ({ input }) => {
        await deleteBusinessPlanHistoryByYear(input.year);
        return { success: true };
      }),

    // ==================== 연동 관련 API ====================

    // Get monthly target from business plan for sales page
    getMonthlyTarget: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number(),
        division: z.string(),
      }))
      .query(async ({ input }) => {
        return await getBusinessPlanMonthlyTarget(input.year, input.month, input.division);
      }),

    // Sync sales actual to business plan
    syncSalesActual: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number(),
        division: z.string(),
        actualValue: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && !ctx.user.canEditSales) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '실적 동기화 권한이 없습니다' });
        }
        await syncSalesActualToBusinessPlan(input.year, input.month, input.division, input.actualValue);
        return { success: true };
      }),

    // Get monthly target by sub-division from business plan
    getMonthlyTargetBySubDivision: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number(),
        division: z.string(),
        subDivision: z.string().nullable(),
      }))
      .query(async ({ input }) => {
        return await getBusinessPlanMonthlyTargetBySubDivision(input.year, input.month, input.division, input.subDivision);
      }),

    // Get all monthly targets for a specific month
    getAllMonthlyTargets: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number(),
      }))
      .query(async ({ input }) => {
        return await getBusinessPlanAllMonthlyTargets(input.year, input.month);
      }),

    // Get monthly actual by sub-division from sales
    getMonthlyActualBySubDivision: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number(),
        division: z.string(),
        subDivision: z.string().nullable(),
      }))
      .query(async ({ input }) => {
        return await getSalesMonthlyActualBySubDivision(input.year, input.month, input.division, input.subDivision);
      }),

    // Get all monthly actuals for a specific month
    getAllMonthlyActuals: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number(),
      }))
      .query(async ({ input }) => {
        return await getSalesAllMonthlyActuals(input.year, input.month);
      }),

    // Update actual (alias for updateActualMonth for backward compatibility)
    updateActual: protectedProcedure
      .input(z.object({
        year: z.number(),
        category: z.string(),
        division: z.string(),
        subDivision: z.string().nullable(),
        month: z.number().min(1).max(12),
        value: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && !ctx.user.canEditSales) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '실적 수정 권한이 없습니다' });
        }
        return await updateBusinessPlanActualMonth(
          input.year,
          input.category,
          input.division,
          input.subDivision,
          input.month,
          input.value
        );
      }),
  }),

  // 계약현황 사업계획 라우터
  contractBusinessPlan: router({
    // 연도별 계약현황 사업계획 조회
    getByYear: protectedProcedure
      .input(z.object({ year: z.number() }))
      .query(async ({ input }) => {
        return await getContractBusinessPlansByYear(input.year);
      }),

    // 채널별 계약현황 사업계획 조회
    getByChannel: protectedProcedure
      .input(z.object({
        year: z.number(),
        channel: z.string(),
      }))
      .query(async ({ input }) => {
        return await getContractBusinessPlansByChannel(input.year, input.channel);
      }),

    // 계약현황 사업계획 생성
    create: protectedProcedure
      .input(z.object({
        year: z.number(),
        channel: z.string(),
        subChannel: z.string().nullable().optional(),
        month1: z.number().default(0),
        month2: z.number().default(0),
        month3: z.number().default(0),
        month4: z.number().default(0),
        month5: z.number().default(0),
        month6: z.number().default(0),
        month7: z.number().default(0),
        month8: z.number().default(0),
        month9: z.number().default(0),
        month10: z.number().default(0),
        month11: z.number().default(0),
        month12: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && !ctx.user.canEditSales) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '계획 수정 권한이 없습니다' });
        }
        return await createContractBusinessPlan(input);
      }),

    // 계약현황 사업계획 수정
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        month1: z.number().optional(),
        month2: z.number().optional(),
        month3: z.number().optional(),
        month4: z.number().optional(),
        month5: z.number().optional(),
        month6: z.number().optional(),
        month7: z.number().optional(),
        month8: z.number().optional(),
        month9: z.number().optional(),
        month10: z.number().optional(),
        month11: z.number().optional(),
        month12: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && !ctx.user.canEditSales) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '계획 수정 권한이 없습니다' });
        }
        const { id, ...data } = input;
        return await updateContractBusinessPlan(id, data);
      }),

    // 계약현황 사업계획 삭제
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && !ctx.user.canEditSales) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '계획 삭제 권한이 없습니다' });
        }
        await deleteContractBusinessPlan(input.id);
        return { success: true };
      }),

    // 계약현황 사업계획 upsert (생성 또는 업데이트)
    upsert: protectedProcedure
      .input(z.object({
        year: z.number(),
        channel: z.string(),
        subChannel: z.string().nullable().optional(),
        month1: z.number().default(0),
        month2: z.number().default(0),
        month3: z.number().default(0),
        month4: z.number().default(0),
        month5: z.number().default(0),
        month6: z.number().default(0),
        month7: z.number().default(0),
        month8: z.number().default(0),
        month9: z.number().default(0),
        month10: z.number().default(0),
        month11: z.number().default(0),
        month12: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && !ctx.user.canEditSales) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '계획 수정 권한이 없습니다' });
        }
        return await upsertContractBusinessPlan(input);
      }),

    // 특정 월 목표 업데이트
    updateMonth: protectedProcedure
      .input(z.object({
        year: z.number(),
        channel: z.string(),
        subChannel: z.string().nullable(),
        month: z.number().min(1).max(12),
        value: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && !ctx.user.canEditSales) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '계획 수정 권한이 없습니다' });
        }
        return await updateContractBusinessPlanMonth(
          input.year,
          input.channel,
          input.subChannel,
          input.month,
          input.value
        );
      }),

    // 연도별 삭제
    deleteByYear: protectedProcedure
      .input(z.object({ year: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '관리자 권한이 필요합니다' });
        }
        await deleteContractBusinessPlansByYear(input.year);
        return { success: true };
      }),

    // 변경 이력 조회 (계획 ID별)
    getHistoryByPlanId: protectedProcedure
      .input(z.object({ contractBusinessPlanId: z.number() }))
      .query(async ({ input }) => {
        return await getContractBusinessPlanHistoryByPlanId(input.contractBusinessPlanId);
      }),

    // 변경 이력 조회 (연도별)
    getHistoryByYear: protectedProcedure
      .input(z.object({ year: z.number() }))
      .query(async ({ input }) => {
        return await getContractBusinessPlanHistoryByYear(input.year);
      }),

    // 변경 이력 생성
    createHistory: protectedProcedure
      .input(z.object({
        contractBusinessPlanId: z.number(),
        year: z.number(),
        channel: z.string(),
        subChannel: z.string().nullable().optional(),
        month1: z.number().default(0),
        month2: z.number().default(0),
        month3: z.number().default(0),
        month4: z.number().default(0),
        month5: z.number().default(0),
        month6: z.number().default(0),
        month7: z.number().default(0),
        month8: z.number().default(0),
        month9: z.number().default(0),
        month10: z.number().default(0),
        month11: z.number().default(0),
        month12: z.number().default(0),
        total: z.number().default(0),
        changeReason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await createContractBusinessPlanHistory({
          ...input,
          changedBy: ctx.user.id,
        });
      }),

    // 특정 월 목표 조회
    getMonthlyTarget: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number(),
        channel: z.string(),
        subChannel: z.string().nullable(),
      }))
      .query(async ({ input }) => {
        return await getContractBusinessPlanMonthlyTarget(
          input.year,
          input.month,
          input.channel,
          input.subChannel
        );
      }),

    // 특정 월 모든 목표 조회
    getAllMonthlyTargets: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number(),
      }))
      .query(async ({ input }) => {
        return await getContractBusinessPlanAllMonthlyTargets(input.year, input.month);
      }),

    // 특정 월 모든 실적 조회 (매출관리 계약현황에서)
    getAllMonthlyActuals: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number(),
      }))
      .query(async ({ input }) => {
        return await getContractRecordsMonthlyActuals(input.year, input.month);
      }),

    // 특정 월 실적 업데이트
    updateActual: protectedProcedure
      .input(z.object({
        year: z.number(),
        channel: z.string(),
        subChannel: z.string().nullable(),
        month: z.number().min(1).max(12),
        value: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && !ctx.user.canEditSales) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '실적 수정 권한이 없습니다' });
        }
        return await updateContractBusinessPlanActual(
          input.year,
          input.channel,
          input.subChannel,
          input.month,
          input.value
        );
      }),

    // 특정 월 모든 실적 조회 (사업계획 테이블에서)
    getStoredActuals: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number(),
      }))
      .query(async ({ input }) => {
        return await getContractBusinessPlanAllMonthlyActuals(input.year, input.month);
      }),

    // 연간 월별 실적 조회 (매출관리 계약현황에서)
    getYearlyActuals: protectedProcedure
      .input(z.object({
        year: z.number(),
      }))
      .query(async ({ input }) => {
        return await getContractRecordsYearlyActuals(input.year);
      }),
  }),

  // ==================== Financial Records Router ====================
  financial: router({
    // 재무 레코드 조회 (월별)
    getRecords: financialEditorProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      }))
      .query(async ({ input }) => {
        return await getFinancialRecords(input.year, input.month);
      }),

    // 재무 레코드 생성
    createRecord: financialEditorProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
        week: z.number().min(1).max(5),
        category: z.string().min(1),
        type: z.enum(['income', 'expense']),
        amount: z.number().min(0),
        description: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await createFinancialRecord(input);
      }),

    // 재무 레코드 수정
    updateRecord: financialEditorProcedure
      .input(z.object({
        id: z.string(),
        category: z.string().min(1).optional(),
        type: z.enum(['income', 'expense']).optional(),
        amount: z.number().min(0).optional(),
        week: z.number().min(1).max(5).optional(),
        description: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await updateFinancialRecord(id, data);
      }),

    // 재무 레코드 삭제
    deleteRecord: financialEditorProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await deleteFinancialRecord(input.id);
        return { success: true };
      }),

    // 재무 잔액 조회 (월별 기초잔액)
    getBalance: financialEditorProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      }))
      .query(async ({ input }) => {
        return await getFinancialBalance(input.year, input.month);
      }),

    // 재무 잔액 설정 (월별 기초잔액)
    setBalance: financialEditorProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
        openingBalance: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await upsertFinancialBalance(input.year, input.month, input.openingBalance);
      }),

    // 재무 레코드 일괄 업로드 (엑셀 파싱 결과)
    bulkUpload: financialEditorProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
        replaceExisting: z.boolean().default(false),
        records: z.array(z.object({
          week: z.number().min(1).max(5),
          category: z.string().min(1),
          type: z.enum(['income', 'expense']),
          amount: z.number().min(0),
          description: z.string().optional(),
        })).min(1),
      }))
      .mutation(async ({ input }) => {
        const { year, month, replaceExisting, records } = input;
        
        if (replaceExisting) {
          // 업로드하는 주차만 삭제 (다른 주차 데이터는 보존)
          const uploadedWeeks = Array.from(new Set(records.map(r => r.week)));
          await deleteFinancialRecordsByWeeks(year, month, uploadedWeeks);
        }
        
        await bulkCreateFinancialRecords(records.map(r => ({
          ...r,
          year,
          month,
        })));
        
        return { success: true, count: records.length };
      }),
  }),

  // ==================== KPI 실적관리 Router ====================
  kpi: router({
    // KPI 항목 전체 조회 (지표 포함)
    getItems: protectedProcedure
      .input(z.object({
        division: z.string().optional(),
        department: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        if (input?.division && input?.department) {
          return await getKpiItemsByDepartment(input.division, input.department);
        }
        if (input?.division) {
          return await getKpiItemsByDivision(input.division);
        }
        return await getKpiItemsWithIndicators();
      }),

    // KPI 실적 데이터 조회 (월별)
    getRecords: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      }))
      .query(async ({ input }) => {
        return await getKpiRecords(input.year, input.month);
      }),

    // KPI 실적 데이터 조회 (연도별 - 월간 요약용)
    getRecordsByYear: protectedProcedure
      .input(z.object({
        year: z.number(),
      }))
      .query(async ({ input }) => {
        return await getKpiRecordsByYear(input.year);
      }),

    // KPI 실적 데이터 저장 (단건 upsert)
    saveRecord: salesEditorProcedure
      .input(z.object({
        kpiIndicatorId: z.number(),
        year: z.number(),
        month: z.number().min(1).max(12),
        week: z.number().min(1).max(5),
        value: z.string(),
      }))
      .mutation(async ({ input }) => {
        const id = await upsertKpiRecord(input);
        return { success: true, id };
      }),

    // KPI 실적 데이터 일괄 저장
    bulkSaveRecords: salesEditorProcedure
      .input(z.object({
        records: z.array(z.object({
          kpiIndicatorId: z.number(),
          year: z.number(),
          month: z.number().min(1).max(12),
          week: z.number().min(1).max(5),
          value: z.string(),
        })),
      }))
      .mutation(async ({ input }) => {
        const ids = await bulkUpsertKpiRecords(input.records);
        return { success: true, count: ids.length };
      }),

    // KPI 실적 데이터 삭제
    deleteRecord: salesEditorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteKpiRecord(input.id);
        return { success: true };
      }),

    // KPI 항목 관리 (관리자 전용)
    createItem: adminProcedure
      .input(z.object({
        division: z.string().min(1),
        department: z.string().min(1),
        person: z.string().min(1),
        category: z.string().min(1),
        task: z.string().min(1),
        goal: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await createKpiItem(input);
        return { success: true, id };
      }),

    updateItem: adminProcedure
      .input(z.object({
        id: z.number(),
        division: z.string().optional(),
        department: z.string().optional(),
        person: z.string().optional(),
        category: z.string().optional(),
        task: z.string().optional(),
        goal: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateKpiItem(id, data);
        return { success: true };
      }),

    deleteItem: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteKpiItem(input.id);
        return { success: true };
      }),

    // KPI 지표 관리 (관리자 전용)
    createIndicator: adminProcedure
      .input(z.object({
        kpiItemId: z.number(),
        name: z.string().min(1),
        unit: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await createKpiIndicator(input);
        return { success: true, id };
      }),

    updateIndicator: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        unit: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateKpiIndicator(id, data);
        return { success: true };
      }),

    deleteIndicator: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteKpiIndicator(input.id);
        return { success: true };
      }),

    // KPI 목표/전월실적 조회 (월별)
    getTargets: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      }))
      .query(async ({ input }) => {
        return await getKpiTargets(input.year, input.month);
      }),

    // KPI 목표/전월실적 조회 (연도별)
    getTargetsByYear: protectedProcedure
      .input(z.object({
        year: z.number(),
      }))
      .query(async ({ input }) => {
        return await getKpiTargetsByYear(input.year);
      }),

    // KPI 목표/전월실적 저장 (단건)
    saveTarget: salesEditorProcedure
      .input(z.object({
        kpiIndicatorId: z.number(),
        year: z.number(),
        month: z.number().min(1).max(12),
        monthlyTarget: z.string().optional(),
        previousActual: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await upsertKpiTarget(input);
        return { success: true, id };
      }),

    // KPI 목표/전월실적 일괄 저장
    bulkSaveTargets: salesEditorProcedure
      .input(z.object({
        records: z.array(z.object({
          kpiIndicatorId: z.number(),
          year: z.number(),
          month: z.number().min(1).max(12),
          monthlyTarget: z.string().optional(),
          previousActual: z.string().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        const ids = await bulkUpsertKpiTargets(input.records);
        return { success: true, count: ids.length };
      }),

    // ── KPI 업무 상세 (전월평가/금월계획/실행) ──
    getItemDetail: protectedProcedure
      .input(z.object({
        kpiItemId: z.number(),
        year: z.number(),
        month: z.number().min(1).max(12),
      }))
      .query(async ({ input }) => {
        return await getKpiItemDetail(input.kpiItemId, input.year, input.month);
      }),

    getItemDetailsByMonth: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      }))
      .query(async ({ input }) => {
        return await getKpiItemDetailsByMonth(input.year, input.month);
      }),

    saveItemDetail: salesEditorProcedure
      .input(z.object({
        kpiItemId: z.number(),
        year: z.number(),
        month: z.number().min(1).max(12),
        previousEvaluation: z.string().nullable().optional(),
        currentPlan: z.string().nullable().optional(),
        execution: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await upsertKpiItemDetail(input);
        return { success: true, id };
      }),

    // ── KPI 담당자 관리 ──
    getAssignees: protectedProcedure
      .query(async () => {
        return await getKpiAssignees();
      }),

    getAllAssignees: adminProcedure
      .query(async () => {
        return await getAllKpiAssignees();
      }),

    getAssigneesByDepartment: protectedProcedure
      .input(z.object({ department: z.string() }))
      .query(async ({ input }) => {
        return await getKpiAssigneesByDepartment(input.department);
      }),

    createAssignee: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        department: z.string().min(1),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await createKpiAssignee(input);
        return { success: true, id };
      }),

    updateAssignee: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        department: z.string().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateKpiAssignee(id, data);
        return { success: true };
      }),

    deleteAssignee: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteKpiAssignee(input.id);
        return { success: true };
      }),

      // 업무에 담당자 배정
    assignPerson: salesEditorProcedure
      .input(z.object({
        kpiItemId: z.number(),
        person: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        await assignKpiItemPerson(input.kpiItemId, input.person);
        return { success: true };
      }),
  }),

  // ==================== Report Router ====================
  report: router({
    // 보고서 목록 조회
    list: protectedProcedure
      .input(z.object({
        type: z.enum(["weekly", "monthly"]).optional(),
        scope: z.enum(["individual", "team", "division"]).optional(),
        year: z.number(),
        month: z.number(),
        week: z.number().optional(),
        targetUserId: z.number().optional(),
        targetTeamId: z.number().optional(),
        targetDivisionId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await getReports(input);
      }),

    // 보고서 상세 조회
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getReportById(input.id);
      }),

    // 보고서 자동 생성 (개인)
    generateIndividual: protectedProcedure
      .input(z.object({
        type: z.enum(["weekly", "monthly"]),
        targetUserId: z.number(),
        year: z.number(),
        month: z.number(),
        week: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const reportData = await getReportDataForUser(input.targetUserId, input.year, input.month, input.week);
        if (!reportData || !reportData.user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '사용자를 찾을 수 없습니다' });
        }

        const userName = reportData.user.koreanName || reportData.user.name || '미지정';
        const periodLabel = input.type === 'weekly'
          ? `${input.year}년 ${input.month}월 ${input.week}주차`
          : `${input.year}년 ${input.month}월`;
        const typeLabel = input.type === 'weekly' ? '주간' : '월간';

        // 업무별 KPI 실적 + 팝업 내용(전월평가/금월계획/실행) 집계
        const taskDetails = reportData.kpiItems.map(item => {
          const indicators = reportData.kpiIndicators.filter(ind => ind.kpiItemId === item.id);
          const detail = reportData.kpiDetails.find(d => d.kpiItemId === item.id);
          
          const indicatorSummary = indicators.map(ind => {
            const records = reportData.kpiRecords.filter(r => r.kpiIndicatorId === ind.id);
            const target = reportData.kpiTargets.find(t => t.kpiIndicatorId === ind.id);
            const totalValue = records.reduce((sum, r) => sum + Number(r.value || 0), 0);
            const targetValue = Number(target?.monthlyTarget || 0);
            const achievementRate = targetValue > 0 ? Math.round((totalValue / targetValue) * 100) : 0;
            return {
              name: ind.name,
              unit: ind.unit,
              previousActual: Number(target?.previousActual || 0),
              monthlyTarget: targetValue,
              monthlyTotal: totalValue,
              achievementRate,
              weeklyRecords: records.map(r => ({ week: r.week, value: Number(r.value || 0) })),
            };
          });

          return {
            category: item.category,
            task: item.task,
            department: item.department,
            previousEvaluation: detail?.previousEvaluation || '',
            currentPlan: detail?.currentPlan || '',
            execution: detail?.execution || '',
            indicators: indicatorSummary,
          };
        });

        // KPI 실적 요약 통계
        const allIndicators = taskDetails.flatMap(t => t.indicators);
        const indicatorsWithTarget = allIndicators.filter(ind => ind.monthlyTarget > 0);
        const achieved = indicatorsWithTarget.filter(ind => ind.achievementRate >= 100);
        const nearTarget = indicatorsWithTarget.filter(ind => ind.achievementRate >= 70 && ind.achievementRate < 100);
        const belowTarget = indicatorsWithTarget.filter(ind => ind.achievementRate < 70);
        const avgAchievement = indicatorsWithTarget.length > 0
          ? Math.round(indicatorsWithTarget.reduce((sum, ind) => sum + ind.achievementRate, 0) / indicatorsWithTarget.length)
          : 0;

        // 카테고리별 달성률
        const categoryMap = new Map<string, { total: number; count: number }>();
        taskDetails.forEach(item => {
          const catIndicators = item.indicators.filter(ind => ind.monthlyTarget > 0);
          if (catIndicators.length > 0) {
            const existing = categoryMap.get(item.category) || { total: 0, count: 0 };
            catIndicators.forEach(ind => {
              existing.total += ind.achievementRate;
              existing.count += 1;
            });
            categoryMap.set(item.category, existing);
          }
        });
        const categoryAchievements = Array.from(categoryMap.entries()).map(([category, data]) => ({
          category,
          avgRate: Math.round(data.total / data.count),
          count: data.count,
        }));

        const kpiOverview = {
          totalTasks: taskDetails.length,
          totalIndicators: allIndicators.length,
          indicatorsWithTarget: indicatorsWithTarget.length,
          avgAchievementRate: avgAchievement,
          achieved: achieved.length,
          nearTarget: nearTarget.length,
          belowTarget: belowTarget.length,
          categoryAchievements,
        };

        const content = JSON.stringify({
          kpiOverview,
          taskDetails,
          period: periodLabel,
          generatedAt: new Date().toISOString(),
        });

        const title = `[${typeLabel}보고서] ${userName} - ${periodLabel}`;

        await createReport({
          type: input.type,
          scope: 'individual',
          targetUserId: input.targetUserId,
          year: input.year,
          month: input.month,
          week: input.week || null,
          title,
          content,
          generatedBy: ctx.user.id,
          status: 'draft',
        });

        return { success: true, title };
      }),

    // 보고서 자동 생성 (팀)
    generateTeam: protectedProcedure
      .input(z.object({
        type: z.enum(["weekly", "monthly"]),
        targetTeamId: z.number(),
        year: z.number(),
        month: z.number(),
        week: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const teamData = await getReportDataForTeam(input.targetTeamId, input.year, input.month);
        if (!teamData || !teamData.team) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '팀을 찾을 수 없습니다' });
        }

        const teamName = teamData.team.name;
        const periodLabel = input.type === 'weekly'
          ? `${input.year}년 ${input.month}월 ${input.week}주차`
          : `${input.year}년 ${input.month}월`;
        const typeLabel = input.type === 'weekly' ? '주간' : '월간';

        // 팀원별 업무 상세 + KPI 실적 집계
        const memberDetails = teamData.members.map(({ member, data }) => {
          if (!data) return { name: member.koreanName || member.name, taskDetails: [] };
          
          const taskDetails = data.kpiItems.map(item => {
            const indicators = data.kpiIndicators.filter(ind => ind.kpiItemId === item.id);
            const detail = data.kpiDetails.find(d => d.kpiItemId === item.id);
            return {
              category: item.category,
              task: item.task,
              department: item.department,
              previousEvaluation: detail?.previousEvaluation || '',
              currentPlan: detail?.currentPlan || '',
              execution: detail?.execution || '',
              indicators: indicators.map(ind => {
                const records = data.kpiRecords.filter(r => r.kpiIndicatorId === ind.id);
                const target = data.kpiTargets.find(t => t.kpiIndicatorId === ind.id);
                const totalValue = records.reduce((sum, r) => sum + Number(r.value || 0), 0);
                const targetValue = Number(target?.monthlyTarget || 0);
                return {
                  name: ind.name,
                  unit: ind.unit,
                  monthlyTotal: totalValue,
                  monthlyTarget: targetValue,
                  achievementRate: targetValue > 0 ? Math.round((totalValue / targetValue) * 100) : 0,
                };
              }),
            };
          });

          return {
            name: member.koreanName || member.name,
            taskDetails,
          };
        });

        // 팀 KPI 요약 통계
        const allTeamIndicators = memberDetails.flatMap(m => m.taskDetails.flatMap(t => t.indicators));
        const indicatorsWithTarget = allTeamIndicators.filter(ind => ind.monthlyTarget > 0);
        const achieved = indicatorsWithTarget.filter(ind => ind.achievementRate >= 100);
        const nearTarget = indicatorsWithTarget.filter(ind => ind.achievementRate >= 70 && ind.achievementRate < 100);
        const belowTarget = indicatorsWithTarget.filter(ind => ind.achievementRate < 70);
        const avgAchievement = indicatorsWithTarget.length > 0
          ? Math.round(indicatorsWithTarget.reduce((sum, ind) => sum + ind.achievementRate, 0) / indicatorsWithTarget.length)
          : 0;

        // 팀원별 평균 달성률
        const memberAchievements = memberDetails
          .filter(m => m.taskDetails.length > 0)
          .map(m => {
            const mIndicators = m.taskDetails.flatMap(t => t.indicators).filter(ind => ind.monthlyTarget > 0);
            const mAvg = mIndicators.length > 0
              ? Math.round(mIndicators.reduce((sum, ind) => sum + ind.achievementRate, 0) / mIndicators.length)
              : 0;
            return { name: m.name, avgRate: mAvg, taskCount: m.taskDetails.length, indicatorCount: mIndicators.length };
          })
          .sort((a, b) => b.avgRate - a.avgRate);

        // 카테고리별 달성률
        const categoryMap = new Map<string, { total: number; count: number }>();
        memberDetails.forEach(m => {
          m.taskDetails.forEach(item => {
            const catIndicators = item.indicators.filter(ind => ind.monthlyTarget > 0);
            if (catIndicators.length > 0) {
              const existing = categoryMap.get(item.category) || { total: 0, count: 0 };
              catIndicators.forEach(ind => {
                existing.total += ind.achievementRate;
                existing.count += 1;
              });
              categoryMap.set(item.category, existing);
            }
          });
        });
        const categoryAchievements = Array.from(categoryMap.entries()).map(([category, data]) => ({
          category,
          avgRate: Math.round(data.total / data.count),
          count: data.count,
        }));

        const kpiOverview = {
          totalMembers: teamData.members.length,
          totalTasks: memberDetails.reduce((sum, m) => sum + m.taskDetails.length, 0),
          totalIndicators: allTeamIndicators.length,
          indicatorsWithTarget: indicatorsWithTarget.length,
          avgAchievementRate: avgAchievement,
          achieved: achieved.length,
          nearTarget: nearTarget.length,
          belowTarget: belowTarget.length,
          memberAchievements,
          categoryAchievements,
        };

        const content = JSON.stringify({
          teamName,
          kpiOverview,
          memberDetails,
          period: periodLabel,
          generatedAt: new Date().toISOString(),
        });

        const title = `[${typeLabel}보고서] ${teamName} - ${periodLabel}`;

        await createReport({
          type: input.type,
          scope: 'team',
          targetTeamId: input.targetTeamId,
          year: input.year,
          month: input.month,
          week: input.week || null,
          title,
          content,
          generatedBy: ctx.user.id,
          status: 'draft',
        });

        return { success: true, title };
      }),

    // 보고서 수정 (요약/계획/이슈 추가)
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        summary: z.string().optional(),
        nextPlan: z.string().optional(),
        issues: z.string().optional(),
        status: z.enum(["draft", "finalized"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateReport(id, data);
        return { success: true };
      }),

    // 보고서 삭제
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteReport(input.id);
        return { success: true };
      }),

    // 보고서 생성 가능한 사용자 목록 (팀원 목록)
    getAvailableUsers: protectedProcedure
      .query(async () => {
        return await getAllUsers();
      }),

    // 보고서 생성 가능한 팀 목록
    getAvailableTeams: protectedProcedure
      .query(async () => {
        return await getActiveTeams();
      }),
  }),
});
export type AppRouter = typeof appRouter;
