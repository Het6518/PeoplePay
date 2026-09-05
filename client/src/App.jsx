import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

// Employees
import EmployeeListPage from './pages/employees/EmployeeListPage';
import EmployeeDetailPage from './pages/employees/EmployeeDetailPage';
import EmployeeFormPage from './pages/employees/EmployeeFormPage';

// Contracts
import ContractListPage from './pages/contracts/ContractListPage';

// Schedules
import ScheduleListPage from './pages/schedules/ScheduleListPage';
import ScheduleFormPage from './pages/schedules/ScheduleFormPage';

// Attendance
import AttendancePage from './pages/attendance/AttendancePage';

// Time Off
import TimeOffPage from './pages/timeoff/TimeOffPage';

// Payroll
import PayrunListPage from './pages/payroll/PayrunListPage';
import NewPayrunPage from './pages/payroll/NewPayrunPage';
import PayrunDetailPage from './pages/payroll/PayrunDetailPage';
import PayslipDetailPage from './pages/payroll/PayslipDetailPage';
import PayslipListPage from './pages/payroll/PayslipListPage';
import SalaryStructurePage from './pages/payroll/SalaryStructurePage';
import SalaryRuleFormPage from './pages/payroll/SalaryRuleFormPage';

// Reports & Admin
import ReportsPage from './pages/reports/ReportsPage';
import UsersPage from './pages/admin/UsersPage';
import AttendanceLocationPage from './pages/admin/AttendanceLocationPage';

import { useAuth } from './contexts/AuthContext';

const HR_ROLES = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'];
const PAYROLL_ROLES = ['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'];
const PAYROLL_MANAGER_ROLES = ['HR_PAYROLL_MANAGER', 'ADMIN'];
const ADMIN_ROLES = ['ADMIN'];

function DefaultRedirect() {
  const { currentUser } = useAuth();
  const empId = currentUser?.employeeId || currentUser?.employee?.id;
  if (currentUser?.role === 'EMPLOYEE' && empId) {
    return <Navigate to={`/employees/${empId}`} replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route path="/dashboard" element={<ProtectedRoute roles={HR_ROLES}><DashboardPage /></ProtectedRoute>} />

                {/* Employees */}
                <Route path="/employees" element={<ProtectedRoute roles={HR_ROLES}><EmployeeListPage /></ProtectedRoute>} />
                <Route path="/employees/new" element={<ProtectedRoute roles={HR_ROLES}><EmployeeFormPage /></ProtectedRoute>} />
                <Route path="/employees/:id" element={<EmployeeDetailPage />} />
                <Route path="/employees/:id/edit" element={<ProtectedRoute roles={HR_ROLES}><EmployeeFormPage /></ProtectedRoute>} />

                {/* Contracts */}
                <Route path="/contracts" element={<ProtectedRoute roles={HR_ROLES}><ContractListPage /></ProtectedRoute>} />

                {/* Schedules */}
                <Route path="/schedules" element={<ProtectedRoute roles={HR_ROLES}><ScheduleListPage /></ProtectedRoute>} />
                <Route path="/schedules/new" element={<ProtectedRoute roles={HR_ROLES}><ScheduleFormPage /></ProtectedRoute>} />
                <Route path="/schedules/:id/edit" element={<ProtectedRoute roles={HR_ROLES}><ScheduleFormPage /></ProtectedRoute>} />

                {/* Attendance */}
                <Route path="/attendance" element={<AttendancePage />} />
                <Route path="/admin/attendance-location" element={<ProtectedRoute roles={ADMIN_ROLES}><AttendanceLocationPage /></ProtectedRoute>} />

                {/* Time Off */}
                <Route path="/time-off" element={<TimeOffPage />} />
                <Route path="/time-off/requests" element={<TimeOffPage />} />
                <Route path="/time-off/allocations" element={<ProtectedRoute roles={HR_ROLES}><TimeOffPage initialTab="allocations" /></ProtectedRoute>} />
                <Route path="/time-off/types" element={<ProtectedRoute roles={HR_ROLES}><TimeOffPage initialTab="types" /></ProtectedRoute>} />

                {/* Payroll */}
                <Route path="/payroll/payruns" element={<ProtectedRoute roles={PAYROLL_ROLES}><PayrunListPage /></ProtectedRoute>} />
                <Route path="/payroll/payruns/new" element={<ProtectedRoute roles={PAYROLL_ROLES}><NewPayrunPage /></ProtectedRoute>} />
                <Route path="/payroll/payruns/:id" element={<ProtectedRoute roles={PAYROLL_ROLES}><PayrunDetailPage /></ProtectedRoute>} />
                <Route path="/payroll/payslips" element={<PayslipListPage />} />
                <Route path="/payroll/payslips/:id" element={<PayslipDetailPage />} />
                <Route path="/payroll/salary-structures" element={<ProtectedRoute roles={PAYROLL_ROLES}><SalaryStructurePage /></ProtectedRoute>} />
                <Route path="/payroll/salary-rules" element={<ProtectedRoute roles={PAYROLL_ROLES}><SalaryStructurePage /></ProtectedRoute>} />
                <Route path="/payroll/salary-rules/new" element={<ProtectedRoute roles={PAYROLL_MANAGER_ROLES}><SalaryRuleFormPage /></ProtectedRoute>} />
                <Route path="/payroll/salary-rules/:id/edit" element={<ProtectedRoute roles={PAYROLL_MANAGER_ROLES}><SalaryRuleFormPage /></ProtectedRoute>} />

                {/* Reports */}
                <Route path="/reports" element={<ProtectedRoute roles={HR_ROLES}><ReportsPage /></ProtectedRoute>} />

                {/* Admin */}
                <Route path="/admin/users" element={<ProtectedRoute roles={ADMIN_ROLES}><UsersPage /></ProtectedRoute>} />

                {/* Default redirect */}
                <Route path="/" element={<DefaultRedirect />} />
                <Route path="*" element={<DefaultRedirect />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
              padding: '12px 16px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
