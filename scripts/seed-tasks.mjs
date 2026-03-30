/**
 * Seed script to import initial tasks from Excel data
 * Run with: node scripts/seed-tasks.mjs
 */

import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import mysql from "mysql2/promise";
import { nanoid } from "nanoid";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Task data from Excel file
const initialTasks = [
  { number: 1, title: "성동구 어린이집 시공", department: "채널영업팀", assignee: "서범주팀장", schedule: "2월초", details: "성동구내 어린이집 매트 시공건으로 전년도 중반부터 3회 시공하였음. 구청 담당자 영업을 통해 확대 가능함.", status: "pending" },
  { number: 2, title: "2026년 연봉협상", department: "", assignee: "", schedule: "1월말", details: "1월말까지 기존 직원대상 26년 연봉 확정. 생산 및 물류 직원 연봉협의 완료", status: "completed" },
  { number: 3, title: "신규생산라인 진행사항 확인", department: "제조사업부", assignee: "오인석이사", schedule: "", details: "예정된 일정대로 진행 중", status: "in-progress" },
  { number: 4, title: "물류. 포장라인 직원채용", department: "", assignee: "", schedule: "완료", details: "1월 26일(물류) 2월 1일(생산)출근예정", status: "completed" },
  { number: 5, title: "유비플러스 세틩 - 리코코", department: "고객영업팀", assignee: "이주홍파트장", schedule: "2월중", details: "담당자에게 진행 방법 전달", status: "pending" },
  { number: 6, title: "싱가폴 수출물량입력", department: "물류팀", assignee: "최재형부장", schedule: "2월초", details: "2월 출고 요청 건 접수", status: "pending" },
  { number: 7, title: "미국 수출 인보이스", department: "", assignee: "", schedule: "완료", details: "신규 거래선으로 금주 수요일 샘플 출고 예정", status: "completed" },
  { number: 8, title: "아기소파 리오더", department: "물류팀", assignee: "최재형부장", schedule: "2월초", details: "사은품으로 사용되던 아기 소파 리오더 발주 총 수량 240개 중 150개 우선 발주", status: "pending" },
  { number: 9, title: "2026년 인센티브 제안 확정", department: "", assignee: "", schedule: "", details: "월별 매출목표를 확정하고 달성 시 직원별로 지급할 인센티브 금액 확정, 26년 실적 확정", status: "pending" },
  { number: 10, title: "조직별 KPI와 OKR 제시", department: "", assignee: "", schedule: "", details: "개인별, 팀별 업무명세를 확정하고 목표 제시", status: "pending" },
  { number: 11, title: "베이비룸 제품 리뉴얼", department: "", assignee: "", schedule: "", details: "50센치 사이즈 매트 단종에 따라 60센치 매트에 맞는 신규 금형 제작 여부 검토", status: "in-progress" },
  { number: 12, title: "롤매트 생산업체 확인", department: "", assignee: "", schedule: "", details: "확인중", status: "in-progress" },
  { number: 13, title: "매트 프로모션 스킴 세팅 - 채널별", department: "", assignee: "", schedule: "", details: "판매 채널별 프로모션 정책 확정 및 공유", status: "in-progress" },
  { number: 14, title: "엔레드- 마케팅/영업 협력 방안", department: "", assignee: "", schedule: "", details: "수요일 미팅 예정", status: "in-progress" },
  { number: 15, title: "부산지사 전시회 실적 확인", department: "채널영업팀", assignee: "조희태과장", schedule: "완료", details: "계약- 32건", status: "completed" },
  { number: 16, title: "네이버라이브 방송", department: "채널영업팀", assignee: "송채림대리", schedule: "2026-01-29", details: "금주 진행 예정", status: "in-progress" },
  { number: 17, title: "신규공장 보험가입", department: "", assignee: "", schedule: "2월말", details: "삼성화재 문의", status: "pending" },
  { number: 18, title: "생산직 근로자 채용", department: "제조사업부", assignee: "정시영차장", schedule: "2월초", details: "2월 초 부터 순차적으로 진행예정", status: "in-progress" },
  { number: 19, title: "화관법 신고", department: "제조사업부", assignee: "정시영차장", schedule: "3월", details: "신규공장 세팅 후 진행예정으로 컨설팅 업체 방문 예정", status: "pending" },
  { number: 20, title: "마케팅리뷰", department: "꿈비", assignee: "방승현팀장", schedule: "1월말", details: "꿈비 마케팅 담당자가 리뷰한 봄봄매트 마케팅 현황", status: "in-progress" },
  { number: 21, title: "매장사인물-봄봄", department: "채널영업팀", assignee: "조희태과장", schedule: "2월말", details: "봄봄매트 취급 매장 사인물 제작", status: "pending" },
  { number: 22, title: "리코코매트 샘플 확인", department: "", assignee: "", schedule: "완료", details: "UV인쇄 제품 확인", status: "completed" },
  { number: 23, title: "수원코베 베이비페어", department: "채널영업팀", assignee: "조희태과장", schedule: "", details: "", status: "pending" },
];

async function seedTasks() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  console.log("Connecting to database...");
  
  const connection = await mysql.createConnection(databaseUrl);
  const db = drizzle(connection);

  try {
    // Get the owner user (first admin user)
    const [users] = await connection.execute(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );

    if (!users || users.length === 0) {
      console.error("No admin user found. Please login first to create your account.");
      process.exit(1);
    }

    const userId = users[0].id;
    console.log(`Found admin user with ID: ${userId}`);

    // Check if tasks already exist for this user
    const [existingTasks] = await connection.execute(
      "SELECT COUNT(*) as count FROM tasks WHERE userId = ?",
      [userId]
    );

    if (existingTasks[0].count > 0) {
      console.log(`User already has ${existingTasks[0].count} tasks. Skipping seed.`);
      console.log("To re-seed, delete existing tasks first.");
      process.exit(0);
    }

    console.log(`Inserting ${initialTasks.length} tasks...`);

    // Insert tasks
    for (const task of initialTasks) {
      const id = nanoid();
      await connection.execute(
        `INSERT INTO tasks (id, userId, number, title, department, assignee, schedule, details, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          userId,
          task.number,
          task.title,
          task.department,
          task.assignee,
          task.schedule,
          task.details,
          task.status,
        ]
      );
      console.log(`  ✓ Task #${task.number}: ${task.title}`);
    }

    console.log(`\n✅ Successfully inserted ${initialTasks.length} tasks!`);
  } catch (error) {
    console.error("Error seeding tasks:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedTasks();
