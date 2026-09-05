import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Banknote, ChevronDown, LogOut, Menu,
} from 'lucide-react';

const HR_ROLES = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'];
const PAYROLL_ROLES = ['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'];
const MANAGER_ROLES = ['HR_PAYROLL_MANAGER', 'ADMIN'];

const payrollSubItems = [
  { to: '/payroll/payruns', label: 'Payruns', roles: PAYROLL_ROLES },
  { to: '/payroll/payslips', label: 'Payslips', roles: ['EMPLOYEE', ...PAYROLL_ROLES] },
  { to: '/payroll/salary-structures', label: 'Salary Structures', roles: PAYROLL_ROLES },
  { to: '/payroll/salary-rules', label: 'Salary Rules', roles: MANAGER_ROLES },
];

function NavItem({ to, label, end = false, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `inline-flex h-12 items-center rounded-full px-6 text-sm font-semibold transition-all ${
          isActive
            ? 'bg-slate-950 text-white shadow-sm'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        }`
      }
    >
      <span>{label}</span>
    </NavLink>
  );
}

function PayrollMenu({ currentUser, isPayroll, mobile = false, onNavigate }) {
  const [open, setOpen] = useState(false);
  if (!isPayroll) return null;

  const allowedSubItems = payrollSubItems.filter(
    (item) => !item.roles || item.roles.includes(currentUser?.role)
  );

  if (allowedSubItems.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={
          mobile
            ? 'flex h-12 w-full items-center justify-between rounded-full px-6 text-left text-sm font-semibold text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900'
            : 'inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900'
        }
      >
        <span>Payroll</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className={
            mobile
              ? 'mt-1 space-y-1 rounded-3xl bg-slate-50 p-2'
              : 'absolute left-0 top-14 z-20 w-56 rounded-3xl border border-slate-200 bg-white p-2 shadow-lg'
          }
        >
          {allowedSubItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `block rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-slate-950 text-white'
                    : 'text-slate-500 hover:bg-white hover:text-slate-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export function AppLayout({ children }) {
  const { currentUser, logout, isHR, isPayroll, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isEmployeeRole = currentUser?.role === 'EMPLOYEE';
  const empId = currentUser?.employeeId || currentUser?.employee?.id;
  const employeeProfilePath = isEmployeeRole && empId 
    ? `/employees/${empId}` 
    : '/employees';

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', show: !isEmployeeRole },
    { to: employeeProfilePath, label: isEmployeeRole ? 'My Profile' : 'People', show: true },
    { to: '/contracts', label: 'Contracts', show: isHR() },
    { to: '/schedules', label: 'Calendar', show: isHR() },
    { to: '/attendance', label: 'Attendance', show: true },
    { to: '/time-off', label: 'Time Off', show: true },
  ];

  const bottomNavItems = [
    { to: '/reports', label: 'Reports', show: isHR() },
    { to: '/admin/users', label: 'Admin', show: isAdmin() },
  ];

  const visibleNavItems = navItems.filter((item) => item.show);
  const visibleBottomNavItems = bottomNavItems.filter((item) => item.show);
  const userInitial = (currentUser?.employee?.firstName?.[0] || currentUser?.email?.[0] || 'U').toUpperCase();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <Banknote size={20} />
            </div>
            <div className="hidden min-w-0 sm:block">
              <h1 className="truncate text-base font-bold leading-none text-slate-950">PeoplePay</h1>
              <p className="mt-1 text-xs font-semibold text-slate-500">360</p>
            </div>
          </div>

          <nav className="hidden flex-1 items-center justify-center lg:flex">
            <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
              {visibleNavItems.map((item) => (
                <NavItem key={item.to} {...item} end={item.to === '/dashboard'} />
              ))}
              <PayrollMenu currentUser={currentUser} isPayroll={isPayroll()} />
              {visibleBottomNavItems.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 sm:inline-flex">
              {currentUser?.role?.replace(/_/g, ' ')}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
              {userInitial}
            </div>
            <button
              onClick={handleLogout}
              className="hidden h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 sm:inline-flex"
              title="Logout"
            >
              <LogOut size={17} />
            </button>
          </div>

          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </button>
        </div>

        {mobileOpen && (
          <>
            <button
              className="fixed inset-0 z-[-1] cursor-default bg-transparent lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            />
            <div className="absolute left-4 right-4 top-[72px] rounded-[2rem] border border-slate-200 bg-white p-3 shadow-xl lg:hidden">
              <div className="grid gap-1">
                {visibleNavItems.map((item) => (
                  <NavItem
                    key={item.to}
                    {...item}
                    end={item.to === '/dashboard'}
                    onClick={() => setMobileOpen(false)}
                  />
                ))}
                <PayrollMenu
                  currentUser={currentUser}
                  isPayroll={isPayroll()}
                  mobile
                  onNavigate={() => setMobileOpen(false)}
                />
                {visibleBottomNavItems.map((item) => (
                  <NavItem key={item.to} {...item} onClick={() => setMobileOpen(false)} />
                ))}
                <button
                  onClick={handleLogout}
                  className="inline-flex h-12 items-center rounded-full px-6 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900"
                >
                  Logout
                </button>
              </div>
            </div>
          </>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
