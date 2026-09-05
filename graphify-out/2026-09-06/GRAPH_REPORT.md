# Graph Report - peoplepay360  (2026-09-06)

## Corpus Check
- 106 files · ~69,155 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 700 nodes · 1455 edges · 44 communities (36 shown, 4 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 150 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9c01ba71`
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
- schemas.js
- app.js
- sendSuccess
- geofenceTest.js
- payrollRoutes.js
- payrollController.js
- sendError
- client/package.json
- scheduleController.js
- attendanceRoutes.js
- dependencies
- authenticate
- holidayRoutes.js
- seed.js
- generatePayslipPDF
- .oxlintrc.json
- scripts
- AppLayout.jsx
- scheduleRoutes.js
- auth.js
- GeofenceMap.jsx
- @headlessui/react
- react-dom
- workingDaysRoutes.js
- react-hot-toast
- contractRoutes.js
- employeeRoutes.js
- React + Vite
- react-leaflet
- contractController.js
- HR_ROLES

## God Nodes (most connected - your core abstractions)
1. `sendSuccess()` - 108 edges
2. `sendError()` - 76 edges
3. `react` - 33 edges
4. `formatDate()` - 26 edges
5. `useAuth()` - 24 edges
6. `LoadingSpinner()` - 21 edges
7. `formatINR()` - 21 edges
8. `sendPaginated()` - 17 edges
9. `StatusBadge()` - 16 edges
10. `authenticate()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `computeEmployeePayroll()`  [EXTRACTED]
  scratch/test_payroll_fixes.js → server/src/services/payrollEngine.js
- `runTests()` --calls--> `processPayrollRules()`  [EXTRACTED]
  scratch/test_payroll_fixes.js → server/src/services/payrollEngine.js
- `getTodayAttendance()` --calls--> `sendSuccess()`  [EXTRACTED]
  server/src/controllers/attendanceController.js → server/src/utils/response.js
- `getLocations()` --calls--> `sendSuccess()`  [EXTRACTED]
  server/src/controllers/attendanceLocationController.js → server/src/utils/response.js
- `getAuditLogs()` --calls--> `sendSuccess()`  [EXTRACTED]
  server/src/controllers/attendanceLocationController.js → server/src/utils/response.js

## Import Cycles
- 2-file cycle: `server/src/services/payrollEngine.js -> server/src/services/workingDaysService.js -> server/src/services/payrollEngine.js`

## Communities (44 total, 4 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.05
Nodes (87): ADMIN_ROLES, App(), DefaultRedirect(), HR_ROLES, PAYROLL_MANAGER_ROLES, PAYROLL_ROLES, AdminDashboard(), PayrollManagerDashboard() (+79 more)

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
Cohesion: 0.05
Nodes (16): prisma, prisma, prisma, { PrismaClient }, app, prisma, prisma, toggleLocationStatus() (+8 more)

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

### Community 9 - "schemas.js"
Cohesion: 0.07
Nodes (32): approveAllocation(), approveTimeOffRequest(), calculateEmployeeLeaveBalance(), cancelTimeOffRequest(), createAllocation(), createTimeOffRequest(), createTimeOffType(), {
  CreateTimeOffTypeSchema,
  UpdateTimeOffTypeSchema,
  CreateAllocationSchema,
  UpdateAllocationSchema,
  CreateTimeOffRequestSchema,
  ApproveRejectRequestSchema,
} (+24 more)

### Community 10 - "app.js"
Cohesion: 0.11
Nodes (18): adminRoutes, app, attendanceLocationRoutes, attendanceRoutes, authRoutes, contractRoutes, cors, dashboardRoutes (+10 more)

### Community 11 - "sendSuccess"
Cohesion: 0.09
Nodes (36): flagPayslipWarning(), getAdminDashboard(), getAlerts(), getAttendanceReport(), getAttendanceSummary(), { getDashboardAnomalies }, getPayrollManagerDashboard(), getPayrollReport() (+28 more)

### Community 12 - "geofenceTest.js"
Cohesion: 0.15
Nodes (14): calculateDistance(), evaluateGeofence(), isWithinRadius(), toRadians(), validateCoordinates(), distFar, distNear, geofenceService (+6 more)

### Community 13 - "payrollRoutes.js"
Cohesion: 0.17
Nodes (11): PAYROLL_MANAGER_ROLES, PAYROLL_ROLES, ALL_ROLES, { authenticate, authorize, PAYROLL_ROLES, PAYROLL_MANAGER_ROLES }, ctrl, express, router, { authenticate, authorize, HR_ROLES, PAYROLL_ROLES, PAYROLL_MANAGER_ROLES } (+3 more)

### Community 14 - "payrollController.js"
Cohesion: 0.06
Nodes (49): { calculateAttendanceStats, processPayrollRules, computeEmployeePayroll }, prisma, runTests(), calculateOverlapsForEmployees(), checkOverlaps(), { computeEmployeePayroll }, computePayrun(), { CreatePayrunSchema } (+41 more)

### Community 15 - "sendError"
Cohesion: 0.09
Nodes (28): assignLocation(), attendanceLocationService, {
  CreateAttendanceLocationSchema,
  UpdateAttendanceLocationSchema,
  AssignAttendanceLocationSchema,
}, createLocation(), deleteLocation(), getAuditLogs(), getLocationById(), getLocations() (+20 more)

### Community 16 - "client/package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 17 - "scheduleController.js"
Cohesion: 0.20
Nodes (11): calculateWeeklyHours(), createSchedule(), { CreateScheduleSchema, UpdateScheduleSchema }, deleteSchedule(), getSchedule(), getSchedules(), prisma, { sendSuccess, sendError } (+3 more)

### Community 18 - "attendanceRoutes.js"
Cohesion: 0.40
Nodes (4): { authenticate, authorize, HR_ROLES }, ctrl, express, router

### Community 19 - "dependencies"
Cohesion: 0.18
Nodes (10): dependencies, bcryptjs, dotenv, @prisma/client, devDependencies, prisma, bcryptjs, dotenv (+2 more)

### Community 20 - "authenticate"
Cohesion: 0.18
Nodes (9): authenticate(), { authenticate }, ctrl, express, router, { authenticate }, ctrl, express (+1 more)

### Community 21 - "holidayRoutes.js"
Cohesion: 0.40
Nodes (4): { authenticate, authorize, HR_ROLES }, ctrl, express, router

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

### Community 27 - "scheduleRoutes.js"
Cohesion: 0.40
Nodes (4): { authenticate, authorize, HR_ROLES }, ctrl, express, router

### Community 28 - "auth.js"
Cohesion: 0.24
Nodes (8): ADMIN_ROLES, authorize(), jwt, { sendError }, { authenticate, authorize, ADMIN_ROLES }, ctrl, express, router

### Community 29 - "GeofenceMap.jsx"
Cohesion: 0.40
Nodes (3): createEmployeeIcon(), GeofenceMap(), officeIcon

### Community 32 - "workingDaysRoutes.js"
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

### Community 43 - "contractController.js"
Cohesion: 0.20
Nodes (9): createContract(), { CreateContractSchema, UpdateContractSchema }, deleteContract(), getContract(), prisma, { sendSuccess, sendError, sendPaginated }, updateContract(), CreateContractSchema (+1 more)

### Community 44 - "HR_ROLES"
Cohesion: 0.33
Nodes (5): HR_ROLES, { authenticate, authorize, HR_ROLES }, ctrl, express, router

## Knowledge Gaps
- **253 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+248 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 289 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `sendSuccess()` connect `sendSuccess` to `employeeController.js`, `authController.js`, `adminController.js`, `attendanceController.js`, `schemas.js`, `contractController.js`, `payrollController.js`, `sendError`, `scheduleController.js`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `sendError()` connect `sendError` to `employeeController.js`, `authController.js`, `adminController.js`, `attendanceController.js`, `schemas.js`, `sendSuccess`, `contractController.js`, `payrollController.js`, `scheduleController.js`, `authenticate`, `auth.js`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `authenticate()` connect `authenticate` to `workingDaysRoutes.js`, `contractRoutes.js`, `employeeRoutes.js`, `authController.js`, `adminController.js`, `HR_ROLES`, `payrollRoutes.js`, `sendError`, `attendanceRoutes.js`, `holidayRoutes.js`, `scheduleRoutes.js`, `auth.js`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _253 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05348583877995643 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._