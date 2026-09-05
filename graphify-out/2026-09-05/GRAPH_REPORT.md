# Graph Report - peoplepay360  (2026-09-05)

## Corpus Check
- 88 files · ~51,972 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 612 nodes · 1208 edges · 43 communities (35 shown, 4 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 121 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7eca5e8f`
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
- adminController.js
- attendanceController.js
- sendSuccess
- app.js
- salaryController.js
- geofenceTest.js
- auth.js
- payrollController.js
- sendError
- client/package.json
- scheduleController.js
- authorize
- dependencies
- authenticate
- attendanceLocationService.js
- seed.js
- generatePayslipPDF
- .oxlintrc.json
- scripts
- AppLayout.jsx
- reportRoutes.js
- scheduleRoutes.js
- GeofenceMap.jsx
- @headlessui/react
- react-dom
- attendanceLocationRoutes.js
- react-hot-toast
- contractRoutes.js
- employeeRoutes.js
- React + Vite
- react-leaflet
- schemas.js

## God Nodes (most connected - your core abstractions)
1. `sendSuccess()` - 92 edges
2. `sendError()` - 62 edges
3. `react` - 27 edges
4. `useAuth()` - 25 edges
5. `formatDate()` - 22 edges
6. `LoadingSpinner()` - 18 edges
7. `sendPaginated()` - 17 edges
8. `formatINR()` - 15 edges
9. `StatusBadge()` - 14 edges
10. `authenticate()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `getTodayAttendance()` --calls--> `sendSuccess()`  [EXTRACTED]
  server/src/controllers/attendanceController.js → server/src/utils/response.js
- `getLocations()` --calls--> `sendSuccess()`  [EXTRACTED]
  server/src/controllers/attendanceLocationController.js → server/src/utils/response.js
- `getAuditLogs()` --calls--> `sendSuccess()`  [EXTRACTED]
  server/src/controllers/attendanceLocationController.js → server/src/utils/response.js
- `createLocation()` --calls--> `sendSuccess()`  [EXTRACTED]
  server/src/controllers/attendanceLocationController.js → server/src/utils/response.js
- `getSummary()` --calls--> `sendSuccess()`  [EXTRACTED]
  server/src/controllers/dashboardController.js → server/src/utils/response.js

## Import Cycles
- None detected.

## Communities (43 total, 4 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.05
Nodes (77): ADMIN_ROLES, App(), DefaultRedirect(), HR_ROLES, PAYROLL_MANAGER_ROLES, PAYROLL_ROLES, COLOR_CLASSES, formatLabel() (+69 more)

### Community 1 - "dependencies"
Cohesion: 0.05
Nodes (40): cors, express, express-async-errors, jsonwebtoken, mathjs, nodemailer, nodemon, pdfkit (+32 more)

### Community 2 - "devDependencies"
Cohesion: 0.12
Nodes (17): autoprefixer, devDependencies, autoprefixer, oxlint, postcss, tailwindcss, @types/react, @types/react-dom (+9 more)

### Community 3 - "employeeController.js"
Cohesion: 0.09
Nodes (23): getUsers(), getAttendance(), getContracts(), bcrypt, createEmployee(), { CreateEmployeeSchema, UpdateEmployeeSchema }, deleteEmployee(), EMPLOYEE_SELECT (+15 more)

### Community 4 - "prisma.js"
Cohesion: 0.07
Nodes (22): prisma, { PrismaClient }, getAlerts(), getAttendanceReport(), getAttendanceSummary(), { getDashboardAnomalies }, getPayrollReport(), getPayrollTrend() (+14 more)

### Community 5 - "dependencies"
Cohesion: 0.13
Nodes (15): axios, dependencies, axios, date-fns, leaflet, lucide-react, react, react-router-dom (+7 more)

### Community 6 - "authController.js"
Cohesion: 0.11
Nodes (19): bcrypt, { createError }, getMe(), jwt, login(), { LoginSchema, RegisterSchema }, prisma, register() (+11 more)

### Community 7 - "adminController.js"
Cohesion: 0.16
Nodes (16): bcrypt, createDepartment(), createUser(), deleteDepartment(), { DepartmentSchema }, getDepartment(), getDepartments(), prisma (+8 more)

### Community 8 - "attendanceController.js"
Cohesion: 0.14
Nodes (17): attendanceLocationService, calculateWorkedHours(), checkIn(), checkOut(), correctAttendance(), createAttendance(), { CreateAttendanceSchema, CorrectAttendanceSchema, CheckInSchema, CheckOutSchema }, determineStatus() (+9 more)

### Community 9 - "sendSuccess"
Cohesion: 0.20
Nodes (17): approveAllocation(), approveTimeOffRequest(), cancelTimeOffRequest(), createAllocation(), createTimeOffRequest(), createTimeOffType(), {
  CreateTimeOffTypeSchema,
  UpdateTimeOffTypeSchema,
  CreateAllocationSchema,
  UpdateAllocationSchema,
  CreateTimeOffRequestSchema,
  ApproveRejectRequestSchema,
}, deleteTimeOffType() (+9 more)

### Community 10 - "app.js"
Cohesion: 0.12
Nodes (16): adminRoutes, app, attendanceLocationRoutes, attendanceRoutes, authRoutes, contractRoutes, cors, dashboardRoutes (+8 more)

### Community 11 - "salaryController.js"
Cohesion: 0.12
Nodes (16): createSalaryRule(), createSalaryStructure(), { CreateSalaryStructureSchema, UpdateSalaryStructureSchema, CreateSalaryRuleSchema, UpdateSalaryRuleSchema }, deleteSalaryRule(), deleteSalaryStructure(), getSalaryRule(), getSalaryRules(), getSalaryStructure() (+8 more)

### Community 12 - "geofenceTest.js"
Cohesion: 0.15
Nodes (14): calculateDistance(), evaluateGeofence(), isWithinRadius(), toRadians(), validateCoordinates(), distFar, distNear, geofenceService (+6 more)

### Community 13 - "auth.js"
Cohesion: 0.16
Nodes (13): ADMIN_ROLES, jwt, PAYROLL_MANAGER_ROLES, PAYROLL_ROLES, { sendError }, { authenticate, authorize, PAYROLL_ROLES, PAYROLL_MANAGER_ROLES }, ctrl, express (+5 more)

### Community 14 - "payrollController.js"
Cohesion: 0.08
Nodes (33): { computeEmployeePayroll }, computePayrun(), createPayrun(), { CreatePayrunSchema }, { detectAnomalies }, downloadPayslipPDF(), emailService, getPayrun() (+25 more)

### Community 15 - "sendError"
Cohesion: 0.12
Nodes (21): assignLocation(), attendanceLocationService, {
  CreateAttendanceLocationSchema,
  UpdateAttendanceLocationSchema,
  AssignAttendanceLocationSchema,
}, createLocation(), deleteLocation(), getAuditLogs(), getLocationById(), getLocations() (+13 more)

### Community 16 - "client/package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 17 - "scheduleController.js"
Cohesion: 0.20
Nodes (11): calculateWeeklyHours(), createSchedule(), { CreateScheduleSchema, UpdateScheduleSchema }, deleteSchedule(), getSchedule(), getSchedules(), prisma, { sendSuccess, sendError } (+3 more)

### Community 18 - "authorize"
Cohesion: 0.18
Nodes (10): authorize(), HR_ROLES, { authenticate, authorize, HR_ROLES }, ctrl, express, router, { authenticate, authorize, HR_ROLES }, ctrl (+2 more)

### Community 19 - "dependencies"
Cohesion: 0.18
Nodes (10): dependencies, bcryptjs, dotenv, @prisma/client, devDependencies, prisma, bcryptjs, dotenv (+2 more)

### Community 20 - "authenticate"
Cohesion: 0.33
Nodes (5): authenticate(), { authenticate }, ctrl, express, router

### Community 21 - "attendanceLocationService.js"
Cohesion: 0.20
Nodes (3): prisma, toggleLocationStatus(), updateLocation()

### Community 22 - "seed.js"
Cohesion: 0.27
Nodes (8): bcrypt, hashPassword(), path, prisma, { PrismaClient }, randomBetween(), seed(), workingDaysInMonth()

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

### Community 27 - "reportRoutes.js"
Cohesion: 0.40
Nodes (4): { authenticate }, ctrl, express, router

### Community 28 - "scheduleRoutes.js"
Cohesion: 0.40
Nodes (4): { authenticate, authorize, HR_ROLES }, ctrl, express, router

### Community 29 - "GeofenceMap.jsx"
Cohesion: 0.40
Nodes (3): createEmployeeIcon(), GeofenceMap(), officeIcon

### Community 32 - "attendanceLocationRoutes.js"
Cohesion: 0.40
Nodes (4): { authenticate, authorize, HR_ROLES }, ctrl, express, router

### Community 34 - "contractRoutes.js"
Cohesion: 0.40
Nodes (4): { authenticate, authorize, HR_ROLES }, ctrl, express, router

### Community 35 - "employeeRoutes.js"
Cohesion: 0.40
Nodes (4): { authenticate, authorize, HR_ROLES }, ctrl, express, router

### Community 36 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + Vite

### Community 42 - "schemas.js"
Cohesion: 0.13
Nodes (14): ApproveRejectRequestSchema, AssignAttendanceLocationSchema, CreateAllocationSchema, CreateAttendanceLocationSchema, CreateSalaryStructureSchema, CreateTimeOffRequestSchema, CreateTimeOffTypeSchema, SelectEmployeesSchema (+6 more)

## Knowledge Gaps
- **226 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+221 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 257 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `sendSuccess()` connect `sendSuccess` to `employeeController.js`, `prisma.js`, `authController.js`, `adminController.js`, `attendanceController.js`, `salaryController.js`, `payrollController.js`, `sendError`, `scheduleController.js`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `sendError()` connect `sendError` to `employeeController.js`, `authController.js`, `adminController.js`, `attendanceController.js`, `sendSuccess`, `salaryController.js`, `auth.js`, `payrollController.js`, `scheduleController.js`, `authorize`, `authenticate`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `authenticate()` connect `authenticate` to `attendanceLocationRoutes.js`, `contractRoutes.js`, `employeeRoutes.js`, `authController.js`, `adminController.js`, `auth.js`, `sendError`, `authorize`, `reportRoutes.js`, `scheduleRoutes.js`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _226 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05434173669467787 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._