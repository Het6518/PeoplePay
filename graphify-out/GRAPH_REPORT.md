# Graph Report - peoplepay360  (2026-09-06)

## Corpus Check
- 109 files · ~75,181 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 757 nodes · 1568 edges · 49 communities (41 shown, 4 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 167 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a3755063`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.jsx
- dependencies
- devDependencies
- employeeController.js
- prisma.js
- dependencies
- authController.js
- adminRoutes.js
- attendanceController.js
- sendSuccess
- app.js
- dashboardController.js
- geofenceTest.js
- salaryRoutes.js
- payrollController.js
- sendError
- client/package.json
- scheduleController.js
- auth.js
- dependencies
- redis.js
- attendanceLocationController.js
- seed.js
- generatePayslipPDF
- .oxlintrc.json
- scripts
- AppLayout.jsx
- scheduleRoutes.js
- attendanceLocationRoutes.js
- GeofenceMap.jsx
- @headlessui/react
- react-dom
- workingDaysRoutes.js
- react-hot-toast
- payrollRoutes.js
- delCachePattern
- React + Vite
- react-leaflet
- schemas.js
- reportRoutes.js
- timeOffRoutes.js
- attendanceLocationService.js
- seed.ts
- holidayService.js
- emailService.js

## God Nodes (most connected - your core abstractions)
1. `sendSuccess()` - 110 edges
2. `sendError()` - 76 edges
3. `react` - 33 edges
4. `formatDate()` - 26 edges
5. `useAuth()` - 24 edges
6. `LoadingSpinner()` - 21 edges
7. `formatINR()` - 21 edges
8. `delCachePattern()` - 18 edges
9. `sendPaginated()` - 17 edges
10. `StatusBadge()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `computeEmployeePayroll()`  [EXTRACTED]
  scratch/test_payroll_fixes.js → server/src/services/payrollEngine.js
- `runTests()` --calls--> `processPayrollRules()`  [EXTRACTED]
  scratch/test_payroll_fixes.js → server/src/services/payrollEngine.js
- `invalidateScheduleCache()` --calls--> `delCachePattern()`  [EXTRACTED]
  server/src/routes/scheduleRoutes.js → server/src/config/redis.js
- `invalidateTimeOffCache()` --calls--> `delCachePattern()`  [EXTRACTED]
  server/src/routes/timeOffRoutes.js → server/src/config/redis.js
- `invalidateWorkingDaysCache()` --calls--> `delCachePattern()`  [EXTRACTED]
  server/src/routes/workingDaysRoutes.js → server/src/config/redis.js

## Import Cycles
- 2-file cycle: `server/src/services/payrollEngine.js -> server/src/services/workingDaysService.js -> server/src/services/payrollEngine.js`

## Communities (49 total, 4 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.05
Nodes (88): ADMIN_ROLES, App(), DefaultRedirect(), HR_ROLES, PAYROLL_MANAGER_ROLES, PAYROLL_ROLES, AdminDashboard(), PayrollManagerDashboard() (+80 more)

### Community 1 - "dependencies"
Cohesion: 0.05
Nodes (42): cors, express, express-async-errors, ioredis, jsonwebtoken, mathjs, nodemailer, nodemon (+34 more)

### Community 2 - "devDependencies"
Cohesion: 0.12
Nodes (17): autoprefixer, devDependencies, autoprefixer, oxlint, postcss, tailwindcss, @types/react, @types/react-dom (+9 more)

### Community 3 - "employeeController.js"
Cohesion: 0.09
Nodes (23): getUsers(), getAttendance(), getContracts(), bcrypt, createEmployee(), { CreateEmployeeSchema, UpdateEmployeeSchema }, deleteEmployee(), EMPLOYEE_SELECT (+15 more)

### Community 4 - "prisma.js"
Cohesion: 0.06
Nodes (28): prisma, { calculateAttendanceStats, processPayrollRules, computeEmployeePayroll }, prisma, runTests(), prisma, prisma, { PrismaClient }, computePayrun() (+20 more)

### Community 5 - "dependencies"
Cohesion: 0.13
Nodes (15): axios, dependencies, axios, date-fns, leaflet, lucide-react, react, react-router-dom (+7 more)

### Community 6 - "authController.js"
Cohesion: 0.11
Nodes (19): bcrypt, { createError }, getMe(), jwt, login(), { LoginSchema, RegisterSchema }, prisma, register() (+11 more)

### Community 7 - "adminRoutes.js"
Cohesion: 0.12
Nodes (23): flushAllCache(), getRedisStatus(), bcrypt, clearRedisCache(), createDepartment(), createUser(), deleteDepartment(), { DepartmentSchema } (+15 more)

### Community 8 - "attendanceController.js"
Cohesion: 0.14
Nodes (17): attendanceLocationService, calculateWorkedHours(), checkIn(), checkOut(), correctAttendance(), createAttendance(), { CreateAttendanceSchema, CorrectAttendanceSchema, CheckInSchema, CheckOutSchema }, determineStatus() (+9 more)

### Community 9 - "sendSuccess"
Cohesion: 0.17
Nodes (20): approveAllocation(), approveTimeOffRequest(), calculateEmployeeLeaveBalance(), cancelTimeOffRequest(), createAllocation(), createTimeOffRequest(), createTimeOffType(), {
  CreateTimeOffTypeSchema,
  UpdateTimeOffTypeSchema,
  CreateAllocationSchema,
  UpdateAllocationSchema,
  CreateTimeOffRequestSchema,
  ApproveRejectRequestSchema,
} (+12 more)

### Community 10 - "app.js"
Cohesion: 0.11
Nodes (18): adminRoutes, app, attendanceLocationRoutes, attendanceRoutes, authRoutes, contractRoutes, cors, dashboardRoutes (+10 more)

### Community 11 - "dashboardController.js"
Cohesion: 0.09
Nodes (22): flagPayslipWarning(), getAdminDashboard(), getAlerts(), getAttendanceReport(), getAttendanceSummary(), { getDashboardAnomalies }, getPayrollManagerDashboard(), getPayrollReport() (+14 more)

### Community 12 - "geofenceTest.js"
Cohesion: 0.15
Nodes (14): calculateDistance(), evaluateGeofence(), isWithinRadius(), toRadians(), validateCoordinates(), distFar, distNear, geofenceService (+6 more)

### Community 13 - "salaryRoutes.js"
Cohesion: 0.25
Nodes (7): PAYROLL_MANAGER_ROLES, { authenticate, authorize, HR_ROLES, PAYROLL_ROLES, PAYROLL_MANAGER_ROLES }, { cacheMiddleware }, ctrl, { delCachePattern }, express, router

### Community 14 - "payrollController.js"
Cohesion: 0.11
Nodes (21): calculateOverlapsForEmployees(), checkOverlaps(), { computeEmployeePayroll }, createPayrun(), { CreatePayrunSchema }, { detectAnomalies }, downloadPayslipPDF(), emailService (+13 more)

### Community 15 - "sendError"
Cohesion: 0.12
Nodes (23): createContract(), { CreateContractSchema, UpdateContractSchema }, deleteContract(), getContract(), prisma, { sendSuccess, sendError, sendPaginated }, updateContract(), createManualHoliday() (+15 more)

### Community 16 - "client/package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 17 - "scheduleController.js"
Cohesion: 0.20
Nodes (11): calculateWeeklyHours(), createSchedule(), { CreateScheduleSchema, UpdateScheduleSchema }, deleteSchedule(), getSchedule(), getSchedules(), prisma, { sendSuccess, sendError } (+3 more)

### Community 18 - "auth.js"
Cohesion: 0.13
Nodes (18): authenticate(), authorize(), HR_ROLES, jwt, PAYROLL_ROLES, { sendError }, { authenticate, authorize, HR_ROLES }, ctrl (+10 more)

### Community 19 - "dependencies"
Cohesion: 0.18
Nodes (10): dependencies, bcryptjs, dotenv, @prisma/client, devDependencies, prisma, bcryptjs, dotenv (+2 more)

### Community 20 - "redis.js"
Cohesion: 0.17
Nodes (11): getCache(), Redis, setCache(), cacheMiddleware(), { getCache, setCache }, { authenticate }, { cacheMiddleware }, ctrl (+3 more)

### Community 21 - "attendanceLocationController.js"
Cohesion: 0.13
Nodes (14): assignLocation(), attendanceLocationService, {
  CreateAttendanceLocationSchema,
  UpdateAttendanceLocationSchema,
  AssignAttendanceLocationSchema,
}, createLocation(), deleteLocation(), getAuditLogs(), getLocationById(), getLocations() (+6 more)

### Community 22 - "seed.js"
Cohesion: 0.18
Nodes (12): bcrypt, BANK_NAMES, FIRST_NAMES_FEMALE, FIRST_NAMES_MALE, JOB_POSITIONS_BY_DEPT, LAST_NAMES, main(), prisma (+4 more)

### Community 23 - "generatePayslipPDF"
Cohesion: 0.36
Nodes (7): COLORS, formatDate(), formatINR(), generatePayslipPDF(), drawTableRow(), getPdfCalculationNote(), PDFDocument

### Community 24 - ".oxlintrc.json"
Cohesion: 0.25
Nodes (7): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, warn

### Community 25 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, preview

### Community 26 - "AppLayout.jsx"
Cohesion: 0.29
Nodes (4): HR_ROLES, MANAGER_ROLES, PAYROLL_ROLES, payrollSubItems

### Community 27 - "scheduleRoutes.js"
Cohesion: 0.25
Nodes (7): { authenticate, authorize, HR_ROLES }, { cacheMiddleware }, ctrl, { delCachePattern }, express, invalidateScheduleCache(), router

### Community 28 - "attendanceLocationRoutes.js"
Cohesion: 0.25
Nodes (7): ADMIN_ROLES, { authenticate, authorize, ADMIN_ROLES }, { cacheMiddleware }, ctrl, { delCachePattern }, express, router

### Community 29 - "GeofenceMap.jsx"
Cohesion: 0.40
Nodes (3): createEmployeeIcon(), GeofenceMap(), officeIcon

### Community 32 - "workingDaysRoutes.js"
Cohesion: 0.25
Nodes (7): { authenticate, authorize, HR_ROLES }, { cacheMiddleware }, ctrl, { delCachePattern }, express, invalidateWorkingDaysCache(), router

### Community 34 - "payrollRoutes.js"
Cohesion: 0.25
Nodes (7): ALL_ROLES, { authenticate, authorize, PAYROLL_ROLES, PAYROLL_MANAGER_ROLES }, { cacheMiddleware }, ctrl, { delCachePattern }, express, router

### Community 35 - "delCachePattern"
Cohesion: 0.18
Nodes (11): delCachePattern(), invalidateDeptCache(), invalidateLocationCache(), { authenticate, authorize, HR_ROLES }, ctrl, { delCachePattern }, express, invalidateEmployeeCache() (+3 more)

### Community 36 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + Vite

### Community 42 - "schemas.js"
Cohesion: 0.08
Nodes (28): createSalaryRule(), createSalaryStructure(), { CreateSalaryStructureSchema, UpdateSalaryStructureSchema, CreateSalaryRuleSchema, UpdateSalaryRuleSchema }, deleteSalaryRule(), deleteSalaryStructure(), getSalaryRule(), getSalaryRules(), getSalaryStructure() (+20 more)

### Community 43 - "reportRoutes.js"
Cohesion: 0.33
Nodes (5): { authenticate }, { cacheMiddleware }, ctrl, express, router

### Community 44 - "timeOffRoutes.js"
Cohesion: 0.25
Nodes (7): { authenticate, authorize, HR_ROLES }, { cacheMiddleware }, ctrl, { delCachePattern }, express, invalidateTimeOffCache(), router

### Community 46 - "attendanceLocationService.js"
Cohesion: 0.20
Nodes (3): prisma, toggleLocationStatus(), updateLocation()

### Community 47 - "seed.ts"
Cohesion: 0.24
Nodes (9): BANK_NAMES, FIRST_NAMES_FEMALE, FIRST_NAMES_MALE, JOB_POSITIONS_BY_DEPT, LAST_NAMES, main(), prisma, randomBetween() (+1 more)

### Community 48 - "holidayService.js"
Cohesion: 0.28
Nodes (4): fetchCalendarificHolidays(), fetchNagerHolidays(), prisma, syncHolidaysForYear()

### Community 49 - "emailService.js"
Cohesion: 0.50
Nodes (7): createTransport(), formatDate(), formatINR(), nodemailer, sendLeaveRequestNotificationToHR(), sendLeaveStatusNotificationToEmployee(), sendPayslipEmail()

## Knowledge Gaps
- **287 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+282 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 324 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `sendSuccess()` connect `sendSuccess` to `employeeController.js`, `prisma.js`, `authController.js`, `adminRoutes.js`, `attendanceController.js`, `schemas.js`, `dashboardController.js`, `payrollController.js`, `sendError`, `scheduleController.js`, `attendanceLocationController.js`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `sendError()` connect `sendError` to `employeeController.js`, `prisma.js`, `authController.js`, `adminRoutes.js`, `attendanceController.js`, `sendSuccess`, `schemas.js`, `dashboardController.js`, `payrollController.js`, `scheduleController.js`, `auth.js`, `attendanceLocationController.js`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `authenticate()` connect `auth.js` to `workingDaysRoutes.js`, `payrollRoutes.js`, `delCachePattern`, `authController.js`, `adminRoutes.js`, `reportRoutes.js`, `timeOffRoutes.js`, `salaryRoutes.js`, `sendError`, `redis.js`, `scheduleRoutes.js`, `attendanceLocationRoutes.js`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _287 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0528123658222413 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._