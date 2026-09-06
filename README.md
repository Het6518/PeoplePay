# 💼 PeoplePay360 — Integrated HR & Payroll Operations Platform

> A production-grade, full-stack HR and Payroll platform built with React, Node.js, Express, PostgreSQL, Prisma, and Redis — connecting employee master data, attendance, leave, and payroll into a single operational flow.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-blue)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-blueviolet)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/Redis-Caching-red)](https://redis.io/)

---

## The Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Database Design](#-database-design)
- [Folder Structure](#-folder-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Overview](#-api-overview)
- [Authentication & Authorization](#-authentication--authorization)
- [Payroll Computation Flow](#-payroll-computation-flow)
- [Role Guide](#-role-guide)
- [Known Limitations](#-known-limitations)
- [Future Improvements](#-future-improvements)
- [Contributing](#-contributing)
- [Team](#-team)

---

## 🌐 Overview

**PeoplePay360** is a feature-rich HR and Payroll intelligence platform that manages the complete employee lifecycle — from master data and time tracking to payroll calculation and reporting:

- HR Managers maintain employee master records, contracts, working schedules, and attendance.
- HR Payroll Users and Payroll Managers run Payruns, resolve payroll warnings, and configure Salary Structures and Rules.
- Admins oversee user provisioning, role assignment, and system-wide data integrity.
- Employees view their own attendance, leave balances, and submit time-off requests.
- A dynamic, holiday-aware payroll engine adjusts working days automatically based on an admin-configured policy and externally-sourced public holidays.
- Geofenced attendance validates check-in/check-out against configured office locations.
- Payslips are generated strictly from each employee's resolved Salary Structure, rendered to PDF, and delivered by email in bulk per Payrun.

Most basic HR tools treat employee, attendance, leave, and salary records as disconnected data. PeoplePay360 is built around the opposite principle: an employee may have multiple contracts over time, but payroll must resolve only the contract applicable to the pay period; working hours come from an assigned schedule; attendance carries exceptions that need review; leave balances depend on allocations and approvals; and payroll must turn all of that into an accurate, auditable payslip before payment.

---

## ✨ Features

### 🏢 HR Manager
- Employee master management (Kanban/List/Form views) with department, manager, schedule, and job position.
- Full CRUD on Contracts, Working Schedules, and Attendance.
- Time Off request approval/refusal workflows, with balances auto-deducted on approval.

### 💰 HR Payroll User / Payroll Manager
- Two-step Payrun wizard: define scope (Period + Salary Structure) → filter and select eligible employees.
- Configurable Salary Structures and sequenced Salary Rules (Fixed / Percentage / Formula computation types).
- Payslip generation strictly limited to the rules belonging to each employee's resolved Salary Structure — no static or leftover line items.
- Duplicate/overlapping pay-period detection with guided period adjustment or explicit, audited override.
- Payroll anomaly and validation warnings (missing bank details, duplicate payslips, negative net, structure mismatches) surfaced before finalization.
- PDF payslip generation and bulk email delivery directly from the Payrun.
- Bank advice report generation for finance handoff.

### 🛡️ Admin
- Full system access across all modules and models.
- User provisioning and role assignment (Employee, HR Manager, HR Payroll User, HR Payroll Manager, Admin).
- Department and attendance location management, including audit history of location changes.
- System-wide data integrity alerts and a chronological activity/audit feed.

### 📅 Attendance & Time Off
- Check-in/check-out with geofence validation against registered Attendance Locations.
- Per-employee, schedule-aware Late and Overtime calculation.
- Configurable Time Off Types (paid/unpaid, allocation-required, approval-required), with allocations and balances tracked per employee.

### 📊 Dynamic, Holiday-Aware Payroll Engine
- Configurable **Working Days Policy** (21/22-day months, per-period override) instead of a hardcoded constant.
- Public holidays and regional festivals fetched from an external holiday API, surfaced to HR as pending suggestions, and only affect payroll once explicitly approved.
- Indian income tax (TDS) calculator with slab comparison.

### 📈 Reporting & Dashboards
- Role-specific dashboards for Admin, HR Payroll Manager, HR Payroll User, and HR Manager.
- Payroll Dashboard: salary cost by department, monthly net salary trends, attendance health, and leave patterns, aggregated from live data.
- Payroll, attendance, and time-off report exports.

---

## 🛠️ Tech Stack

### Frontend (`client`)

| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| Vite | Build tool & dev server |
| React Router | Client-side routing |
| Tailwind CSS | Utility styling framework |
| Recharts | Payroll & attendance data visualization |
| React Leaflet | Geofenced attendance location maps |
| Axios | API client layer |
| React Hot Toast | Notifications |

### Backend (`server`)

| Technology | Purpose |
|---|---|
| Node.js + Express | Web framework & API |
| Prisma ORM | Type-safe database mapping |
| PostgreSQL | Relational database |
| Redis (ioredis) | API response caching |
| Zod | Route input validation schemas |
| JWT | Stateless authentication |
| bcryptjs | Secure password hashing |
| mathjs | Formula-based salary rule evaluation |
| PDFKit | Payslip PDF generation |
| Nodemailer | Payslip email delivery (SMTP) |

---

## 🏗️ System Architecture

### High-Level Overview

```
┌──────────────────────────────┐
│    Frontend (React/Vite)     │
│  Leaflet │ Tailwind │ Recharts│
└─────────────┬─────────────────┘
              │ HTTP/REST
┌─────────────▼─────────────────┐
│   Backend API (Express/JS)    │
│ Routes │ Middleware │ Controllers │
│      │ Services (Payroll,     │
│      │ Working Days, Holiday) │
└─────────────┬─────────────────┘
              │ Prisma ORM
┌─────────────▼─────────────────┐
│       PostgreSQL Database     │
└─────────────┬──────────────────┘
              │
┌─────────────▼─────────────────┐
│        Redis Cache            │
└─────────────┬──────────────────┘
              │
┌─────────────▼─────────────────┐
│      External Services        │
│  Holiday API │ SMTP (Gmail)   │
└────────────────────────────────┘
```

### Request Lifecycle

```
Client Request
   ↓
Route Layer          ← Express Router
   ↓
Middleware           ← authenticate → authorize (RBAC) → validate (Zod)
   ↓
Controller           ← Handles HTTP request/response
   ↓
Service Layer        ← Payroll Engine, Working Days, Holiday, Tax, PDF, Email
   ↓
Prisma ORM           ← Transactional database queries
   ↓
PostgreSQL / Redis    ← Persistent store / cache layer
   ↓
HTTP Response
```

### Architecture Philosophy

- **Structure-Strict Computation** — Payslips are computed and rendered using only the Salary Rules belonging to the employee's resolved Salary Structure for that period — never a default or leftover rule set.
- **Period-Aware Resolution** — Every payroll calculation resolves the contract, structure, and working-days policy applicable to the *specific period* being processed, not just the employee's current state.
- **Client Separation** — The client handles visualization (dashboards, maps, charts); the backend enforces all business validation and computation.
- **Role-based routing** — Client permissions and navigation dynamically adjust based on the authenticated user's role.

---

## 🗄️ Database Design

### Core Entities

| Entity | Description |
|---|---|
| `User` | Login credentials linked to a Role and optionally an Employee |
| `Employee` | Central hub record — department, manager, schedule, status |
| `Contract` | Time-bound employment terms, wage, and assigned Salary Structure |
| `WorkingSchedule` / `WorkingScheduleDay` | Weekly working pattern per employee |
| `Attendance` | Daily check-in/out, worked hours, status, geofence metadata |
| `AttendanceLocation` | Registered geofenced office/site locations |
| `TimeOffType` / `TimeOffAllocation` / `TimeOffRequest` | Leave policy, balances, and requests |
| `SalaryStructure` / `SalaryRule` | Configurable payroll "recipe" and its sequenced computation steps |
| `Payrun` / `Payslip` / `PayslipLine` | Payroll batch, individual computed payslip, and rule-level line items |
| `WorkingDaysPolicy` | Configurable total working days per period |
| `HolidaySuggestion` / `CompanyHoliday` | Externally-sourced festivals pending HR approval, and confirmed company holidays |
| `AuditLog` | System-wide record of significant state-changing actions |

### Key Relationships

```
Employee ──────────► Contract ──────────► SalaryStructure ──────────► SalaryRule
Employee ──────────► Attendance / TimeOffRequest / TimeOffAllocation
Payrun ────────────► Payslip ──────────► PayslipLine ──► SalaryRule
Payslip ───────────► Contract (period-resolved) / SalaryStructure (resolved)
HolidaySuggestion ─► CompanyHoliday ───────────► WorkingDaysPolicy (effective calculation)
AuditLog ──────────► Tracks entity states per performing user
```

---

## 📁 Folder Structure

### Frontend (`client`)

```
client/
├── public/
└── src/
    ├── pages/                # Route pages (Dashboard, Payroll, Attendance, Payslips, etc.)
    ├── components/           # Reusable UI components
    ├── layouts/              # Role-based dashboard layouts
    ├── contexts/             # Auth / role-based state providers
    ├── hooks/
    ├── routes/               # Route definitions & guards
    ├── services/             # Axios API client layer
    └── utils/
```

### Backend (`server`)

```
server/
└── src/
    ├── routes/               # API route definitions (auth, payroll, attendance, contracts, etc.)
    ├── controllers/          # Request handlers per module
    ├── middleware/           # auth, RBAC, Redis cache, error handling
    ├── services/             # Business logic — payrollEngine, workingDaysService,
    │                         # holidayService, indianTaxService, overtimeService,
    │                         # payrollAnomaly, payrollValidation, pdfService, emailService
    ├── validators/           # Zod schemas
    └── utils/
```

### Database

```
prisma/
├── schema.prisma             # Full data model
├── seed.js / seed.ts         # Database seeding
└── migrations/
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **PostgreSQL**
- **Redis**
- **npm**

---

### 1. Clone the Repository

```bash
git clone https://github.com/<org>/PeoplePay-project-initial-setup.git
cd PeoplePay-project-initial-setup
```

---

### 2. Install Dependencies

```bash
# Root (Prisma)
npm install

# Backend
cd server && npm install

# Frontend
cd ../client && npm install
```

---

### 3. Configure Environment Variables

```bash
cp server/.env.example server/.env
```

See [Environment Variables](#-environment-variables) below for the required values.

---

### 4. Set Up the Database

```bash
cd server
npm run db:generate
npm run db:migrate
npm run db:seed
```

---

### 5. Start the Development Servers

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm run dev
```

- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`

### Useful Prisma Commands

```bash
npm run db:studio   # Open Prisma Studio (visual DB browser)
npm run db:reset    # Reset the database (destructive)
```

---

## 🔧 Environment Variables

### Backend (`server/.env`)

```env
NODE_ENV=development
PORT=5000

# PostgreSQL
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/peoplepay360"

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# Gmail SMTP (payslip delivery)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
EMAIL_FROM="PeoplePay360 <your_email@gmail.com>"

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:5173
```

---

## 📡 API Overview

All API routes are prefixed with `/api`.

| Module | Base Path | Description |
|---|---|---|
| Auth | `/api/auth` | Login, session (`/me`) |
| Admin | `/api/admin` | Department & user management, Redis status |
| Dashboard | `/api/dashboard` | Role-specific KPIs, trends, and alerts |
| Employee | `/api/employee` | Employee CRUD and related-record lookups |
| Contract | `/api/contract` | Contract CRUD |
| Schedule | `/api/schedule` | Working Schedule CRUD |
| Attendance | `/api/attendance` | Check-in/out, correction, history |
| Attendance Location | `/api/attendance-location` | Geofenced location CRUD, audits, assignment |
| Overtime | `/api/overtime` | Overtime review, approval, correction |
| Time Off | `/api/timeoff` | Types, allocations, requests, approvals |
| Salary | `/api/salary` | Salary Structures and Rules CRUD, rule reordering |
| Payroll | `/api/payroll` | Payrun lifecycle, overlap checks, payslips, bank advice |
| Working Days | `/api/working-days` | Working Days Policy and period calculation |
| Holiday | `/api/holiday` | Holiday suggestions, sync, approval, manual entries |
| Tax | `/api/tax` | Income tax calculation and slab comparison |
| Reports | `/api/reports` | Payroll, attendance, and time-off reports |

---

## 🔐 Authentication & Authorization

### Authentication
- Stateless authentication using **JSON Web Tokens (JWT)**.
- Passwords hashed with **bcryptjs**.
- Authenticated requests attach `Authorization: Bearer <token>`.

### Roles & RBAC

The system enforces a layered Role-Based Access Control model, where each role inherits the permissions of the one before it:

- **`ADMIN`** — Full access to all modules, plus user management and role assignment.
- **`HR_PAYROLL_MANAGER`** — All HR Payroll User permissions + full CRUD on Payruns, Payslips, Salary Structures, and Salary Rules.
- **`HR_PAYROLL_USER`** — All HR Manager permissions + Create/Read/Update on Payruns and Payslips, read-only Salary Structures/Rules.
- **`HR_MANAGER`** — Full CRUD on Employees, Attendance, Contracts, Working Schedules, and Time Off; approve/refuse leave requests.
- **`EMPLOYEE`** — View own profile, attendance, and leave balances; submit attendance/time-off requests.

> User accounts are provisioned by Admin/HR — there is no open self-registration flow into production use.

---

## 💸 Payroll Computation Flow

```
1. HR Payroll (Manager/User) creates a Payrun
   → selects Period + Salary Structure (scope), then eligible Employees
                        ↓
2. Compute
   → resolve each employee's active Contract for the period
   → resolve Salary Structure (Payrun's structure overrides Contract's, if manually selected)
   → calculate Payable Days = Present + Late + Overtime + Paid Leave
   → run Salary Rules in Sequence order (Fixed / Percentage / Formula)
   → flag warnings: missing bank details, duplicate/overlapping periods, negative net
                        ↓
3. Validate
   → HR reviews computed Payslips and resolves/acknowledges warnings
                        ↓
4. Mark Paid
   → Payrun and Payslips become permanent historical records
                        ↓
5. Send Payslips
   → PDF generated per employee, bulk-emailed from the Payrun
```

---

## 🎓 Role Guide

### As an Admin
1. Provision new user accounts and assign roles from the Users screen.
2. Review the Data Integrity Alerts widget for employees missing contracts or structures.
3. Monitor the system-wide Audit Log for recent structure, payrun, and employee changes.

### As an HR Payroll Manager
1. Configure Salary Structures and sequence Salary Rules.
2. Create a Payrun, resolve the Pending Actions queue, and Validate once warnings are cleared.
3. Review and approve/reject pending Holiday Suggestions before period-end.

### As an HR Manager
1. Maintain Employee, Contract, and Working Schedule records.
2. Review Attendance exceptions and approve/refuse Time Off Requests.

### As an Employee
1. Check in/out from a registered location.
2. Submit Time Off Requests and track leave balances.
3. View and download your own Payslips.

---

## ⚠️ Known Limitations

- **No refresh token cycle** — sessions expire per `JWT_EXPIRES_IN` and require re-login.
- **Single-country holiday sourcing** — the holiday API integration is scoped to India by default.
- **Synchronous payslip PDF/email generation** — bulk sends process sequentially rather than via a background queue for very large batches.

---

## 🔮 Future Improvements

- [ ] **Employee self-service mobile view** for attendance and payslip access.
- [ ] **Multi-country/multi-state holiday calendars** for organizations outside India.
- [ ] **Report exports** to CSV/Excel.
- [ ] **Configurable payroll anomaly rules** beyond the current fixed warning set.

---

## 🤝 Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature-name`
3. Commit your changes following the existing modular route/controller/service layout
4. Push your branch and open a Pull Request

---

## 👥 Team

| Name | Role | GitHub |
|---|---|---|
| **Het Shah** | Team Leader — Database & Frontend support | [@Het6518](https://github.com/Het6518) |
| **Poojan Parekh** | Frontend Development | [@poojanparekh-26](https://github.com/poojanparekh-26) |
| **Nirbhay Shingala** | Backend Development | [@Nirbhay71](https://github.com/Nirbhay71) |

---

> Built as an integrated HR & Payroll operations platform for hackathon evaluation.
