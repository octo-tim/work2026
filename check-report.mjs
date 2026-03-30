import { getReportById } from './server/db.ts';

const report = await getReportById(210002);
if (report) {
  const content = JSON.parse(report.content);
  console.log('content keys:', Object.keys(content));
  console.log('memberWeeklyTasks:', content.memberWeeklyTasks ? 'EXISTS' : 'MISSING');
  console.log('memberTasks:', content.memberTasks ? 'EXISTS' : 'MISSING');
  console.log('members:', content.members ? 'EXISTS' : 'MISSING');
  console.log('kpiOverview:', content.kpiOverview ? 'EXISTS' : 'MISSING');
  console.log('weeklyTaskSummary:', content.weeklyTaskSummary ? 'EXISTS' : 'MISSING');
  for (const key of Object.keys(content)) {
    const val = content[key];
    console.log(key, ':', typeof val, Array.isArray(val) ? '(array, len=' + val.length + ')' : '');
  }
} else {
  console.log('Report not found');
}
process.exit(0);
