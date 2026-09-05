# Graph Report - peoplepay360  (2026-09-05)

## Corpus Check
- 86 files · ~51,302 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 607 nodes · 1194 edges · 42 communities (34 shown, 4 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 121 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `05c17d46`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.jsx
- dependencies
- devDependencies
- employeeController.js
- sendSuccess
- dependencies
- authController.js
- adminController.js
- attendanceController.js
- schemas.js
- app.js
- sendError
- geofenceTest.js
- auth.js
- payrollController.js
- contractController.js
- client/package.json
- scheduleController.js
- authorize
- dependencies
- authenticate
- prisma.js
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

## God Nodes (most connected - your core abstractions)
1. `sendSuccess()` - 92 edges
2. `sendError()` - 62 edges
3. `react` - 27 edges
4. `useAuth()` - 23 edges
5. `formatDate()` - 22 edges
6. `LoadingSpinner()` - 17 edges
7. `sendPaginated()` - 17 edges
8. `formatINR()` - 15 edges
9. `authenticate()` - 14 edges
10. `StatusBadge()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `getTodayAttendance()` --calls--> `sendSuccess()`  [EXTRACTED]
  server/src/controllers/attendanceController.js → server/src/utils/response.js
- `updateEmployee()` --calls--> `sendSuccess()`  [EXTRACTED]
  server/src/controllers/employeeController.js → server/src/utils/response.js
- `getEmployeeContracts()` --calls--> `sendSuccess()`  [EXTRACTED]
  server/src/controllers/employeeController.js → server/src/utils/response.js
- `getEmployeePayslips()` --calls--> `sendSuccess()`  [EXTRACTED]
  server/src/controllers/employeeController.js → server/src/utils/response.js
- `downloadPayslipPDF()` --calls--> `sendError()`  [EXTRACTED]
  server/src/controllers/payrollController.js → server/src/utils/response.js

## Import Cycles
- None detected.

## Communities (42 total, 4 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.05
Nodes (78): ADMIN_ROLES, App(), DefaultRedirect(), HR_ROLES, PAYROLL_MANAGER_ROLES, PAYROLL_ROLES, COLOR_CLASSES, formatLabel() (+70 more)

### Community 1 - "dependencies"
Cohesion: 0.05
Nodes (40): cors, express, express-async-errors, jsonwebtoken, mathjs, nodemailer, nodemon, pdfkit (+32 more)

### Community 2 - "devDependencies"
Cohesion: 0.12
Nodes (17): autoprefixer, devDependencies, autoprefixer, oxlint, postcss, tailwindcss, @types/react, @types/react-dom (+9 more)

### Community 3 - "employeeController.js"
Cohesion: 0.09
Nodes (23): getUsers(), getAttendance(), getContracts(), bcrypt, createEmployee(), { CreateEmployeeSchema, UpdateEmployeeSchema }, deleteEmployee(), EMPLOYEE_SELECT (+15 more)

### Community 4 - "sendSuccess"
Cohesion: 0.11
Nodes (26): assignLocation(), attendanceLocationService, {
  CreateAttendanceLocationSchema,
  UpdateAttendanceLocationSchema,
  AssignAttendanceLocationSchema,
}, createLocation(), deleteLocation(), getAuditLogs(), getLocationById(), getLocations() (+18 more)

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
Cohesion: 0.17
Nodes (14): attendanceLocationService, calculateWorkedHours(), checkIn(), checkOut(), correctAttendance(), createAttendance(), { CreateAttendanceSchema, CorrectAttendanceSchema, CheckInSchema, CheckOutSchema }, determineStatus() (+6 more)

### Community 9 - "schemas.js"
Cohesion: 0.09
Nodes (26): approveTimeOffRequest(), createAllocation(), createTimeOffType(), {
  CreateTimeOffTypeSchema,
  UpdateTimeOffTypeSchema,
  CreateAllocationSchema,
  UpdateAllocationSchema,
  CreateTimeOffRequestSchema,
  ApproveRejectRequestSchema,
}, deleteTimeOffType(), getTimeOffRequest(), getTimeOffTypes(), prisma (+18 more)

### Community 10 - "app.js"
Cohesion: 0.12
Nodes (16): adminRoutes, app, attendanceLocationRoutes, attendanceRoutes, authRoutes, contractRoutes, cors, dashboardRoutes (+8 more)

### Community 11 - "sendError"
Cohesion: 0.12
Nodes (21): createSalaryRule(), createSalaryStructure(), { CreateSalaryStructureSchema, UpdateSalaryStructureSchema, CreateSalaryRuleSchema, UpdateSalaryRuleSchema }, deleteSalaryRule(), deleteSalaryStructure(), getSalaryRule(), getSalaryRules(), getSalaryStructure() (+13 more)

### Community 12 - "geofenceTest.js"
Cohesion: 0.15
Nodes (14): calculateDistance(), evaluateGeofence(), isWithinRadius(), toRadians(), validateCoordinates(), distFar, distNear, geofenceService (+6 more)

### Community 13 - "auth.js"
Cohesion: 0.16
Nodes (13): ADMIN_ROLES, jwt, PAYROLL_MANAGER_ROLES, PAYROLL_ROLES, { sendError }, { authenticate, authorize, PAYROLL_ROLES, PAYROLL_MANAGER_ROLES }, ctrl, express (+5 more)

### Community 14 - "payrollController.js"
Cohesion: 0.07
Nodes (37): getAlerts(), { computeEmployeePayroll }, computePayrun(), createPayrun(), { CreatePayrunSchema }, { detectAnomalies }, downloadPayslipPDF(), emailService (+29 more)

### Community 15 - "contractController.js"
Cohesion: 0.20
Nodes (9): createContract(), { CreateContractSchema, UpdateContractSchema }, deleteContract(), getContract(), prisma, { sendSuccess, sendError, sendPaginated }, updateContract(), CreateContractSchema (+1 more)

### Community 16 - "client/package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 17 - "scheduleController.js"
Cohesion: 0.18
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

### Community 21 - "prisma.js"
Cohesion: 0.10
Nodes (8): prisma, { PrismaClient }, app, prisma, prisma, toggleLocationStatus(), updateLocation(), prisma

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

## Knowledge Gaps
- **225 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+220 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 254 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `sendSuccess()` connect `sendSuccess` to `employeeController.js`, `authController.js`, `adminController.js`, `attendanceController.js`, `schemas.js`, `sendError`, `payrollController.js`, `contractController.js`, `scheduleController.js`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `sendError()` connect `sendError` to `employeeController.js`, `sendSuccess`, `authController.js`, `adminController.js`, `attendanceController.js`, `schemas.js`, `auth.js`, `payrollController.js`, `contractController.js`, `scheduleController.js`, `authorize`, `authenticate`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `react` connect `App.jsx` to `.oxlintrc.json`, `AppLayout.jsx`, `GeofenceMap.jsx`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _225 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05234159779614325 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._