# 담당자 관리 현황 분석

## 멤버관리 (users 테이블) - 기준 데이터
- users.koreanName: 한글 이름
- users.divisionId → divisions: 사업부
- users.teamId → teams: 팀
- users.positionId → positions: 직책
- users.rankId → ranks: 직급

## 각 페이지별 담당자 관리 방식

### 1. 업무관리 (tasks 테이블)
- tasks.assignee: varchar(100) - 텍스트 문자열로 담당자 이름 저장
- tasks.userId: int - 업무 소유자 (users FK)
- 프론트엔드에서 팀원 드롭다운으로 선택

### 2. KPI 실적관리 (kpi_items 테이블)
- kpi_items.person: varchar(100) - 텍스트 문자열로 담당자 이름 저장
- kpi_items.department: varchar(100) - 텍스트 문자열로 부서 이름 저장
- kpi_items.division: varchar(100) - 텍스트 문자열로 사업부 이름 저장

### 3. KPI 담당자 (kpi_assignees 테이블)
- kpi_assignees.name: varchar(100) - 별도 담당자 이름
- kpi_assignees.department: varchar(100) - 별도 부서 이름
- 멤버관리와 완전히 분리된 별도 테이블

### 4. 회의록 (meeting_minutes 테이블)
- 참석자/작성자는 users FK 사용 (이미 멤버 기반)

### 5. 보고서 (reports 테이블)
- targetUserId: users FK (이미 멤버 기반)
- 보고서 내용(content JSON)에 담당자 이름이 텍스트로 포함

## 변경 필요 사항
1. tasks.assignee → 멤버 이름 기반 드롭다운 (이미 팀원 드롭다운 사용 중, 확인 필요)
2. kpi_items.person → 멤버 이름 기반으로 변경
3. kpi_items.department/division → 멤버의 소속 정보 기반으로 변경
4. kpi_assignees 테이블 → 멤버(users) 테이블 기반으로 변경
5. 보고서 생성 시 담당자 정보를 멤버 테이블에서 가져오도록 변경
