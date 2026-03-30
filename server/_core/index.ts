import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { sdk } from "./sdk";
import { getReportById } from "../db";
import { generateIndividualPPT, generateTeamPPT, generateWeeklyIndividualPPT, generateWeeklyTeamPPT } from "../pptGenerator";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // PPT 다운로드 REST API
  app.get('/api/report/:id/ppt', async (req, res) => {
    try {
      // 인증 확인
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ error: '로그인이 필요합니다' });
      }

      const reportId = parseInt(req.params.id);
      if (isNaN(reportId)) {
        return res.status(400).json({ error: '잘못된 보고서 ID입니다' });
      }

      const report = await getReportById(reportId);
      if (!report) {
        return res.status(404).json({ error: '보고서를 찾을 수 없습니다' });
      }

      const content = JSON.parse(report.content);
      let pptx;
      const isWeekly = report.type === 'weekly';

      if (report.scope === 'team') {
        if (isWeekly) {
          // DB content 구조를 PPT 생성기가 기대하는 형식으로 변환
          // DB: memberDetails[].taskDetails[] → PPT: memberWeeklyTasks[].tasks[]
          const pptContent = { ...content };
          if (!pptContent.memberWeeklyTasks && pptContent.memberDetails) {
            pptContent.memberWeeklyTasks = pptContent.memberDetails.map((member: any) => {
              const tasks = (member.taskDetails || []).map((td: any, idx: number) => ({
                id: idx + 1,
                title: td.task || td.title || '-',
                assignee: member.name || '-',
                department: td.department || '-',
                status: td.execution ? 'in-progress' : 'pending',
                priority: 'medium',
                progress: 0,
                dueDate: null,
                createdAt: content.generatedAt || new Date().toISOString(),
                updatedAt: content.generatedAt || new Date().toISOString(),
                progressLogs: [],
              }));
              return {
                name: member.name,
                tasks,
                summary: {
                  total: tasks.length,
                  completed: tasks.filter((t: any) => t.status === 'completed').length,
                  inProgress: tasks.filter((t: any) => t.status === 'in-progress').length,
                  pending: tasks.filter((t: any) => t.status === 'pending').length,
                },
              };
            });
          }
          pptx = generateWeeklyTeamPPT(
            report.title,
            pptContent.teamName || '팀',
            pptContent,
            report.summary,
            report.nextPlan,
            report.issues,
          );
        } else {
          pptx = generateTeamPPT(
            report.title,
            content.teamName || '팀',
            content,
            report.summary,
            report.nextPlan,
            report.issues,
          );
        }
      } else {
        const userName = report.title.replace(/\[.*?\]\s*/, '').split(' - ')[0] || '개인';
        if (isWeekly) {
          pptx = generateWeeklyIndividualPPT(
            report.title,
            userName,
            content,
            report.summary,
            report.nextPlan,
            report.issues,
          );
        } else {
          pptx = generateIndividualPPT(
            report.title,
            userName,
            content,
            report.summary,
            report.nextPlan,
            report.issues,
          );
        }
      }

      const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
      const filename = encodeURIComponent(report.title.replace(/[\/\\?%*:|"<>]/g, '_') + '.pptx');

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (error: any) {
      console.error('[PPT Generation Error]', error);
      res.status(500).json({ error: 'PPT 생성 중 오류가 발생했습니다' });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
