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
  { to: '/payroll/payslips', label: 'Payslips', roles: PAYROLL_ROLES },
  { to: '/payroll/salary-structures', label: 'Salary Structures', roles: PAYROLL_ROLES },
  { to: '/payroll/salary-rules', label: 'Salary Rules', roles: PAYROLL_ROLES },
];

function NavItem({ to, label, end = false, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `inline-flex h-10 items-center rounded-full px-5 text-xs lg:text-sm font-semibold transition-all ${
          isActive
            ? 'bg-stone-900 text-white shadow-sm'
            : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
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
            ? 'flex h-10 w-full items-center justify-between rounded-full px-5 text-left text-xs lg:text-sm font-semibold text-stone-600 transition-all hover:bg-stone-100 hover:text-stone-900'
            : 'inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-xs lg:text-sm font-semibold text-stone-600 transition-all hover:bg-stone-100 hover:text-stone-900'
        }
      >
        <span>Payroll</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className={
            mobile
              ? 'mt-1 space-y-1 rounded-2xl bg-stone-50 p-2 border border-stone-200/60'
              : 'absolute left-0 top-12 z-50 w-56 rounded-3xl border border-stone-200/80 bg-white p-2 shadow-xl animate-fadeIn'
          }
        >
          {allowedSubItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => {
                setOpen(false);
                if (onNavigate) onNavigate();
              }}
              className={({ isActive }) =>
                `block rounded-full px-4 py-2 text-xs lg:text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
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
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#FAF9F5] text-stone-900">
      {/* Top Ambient Warm Glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-72 w-full max-w-7xl -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-200/25 via-amber-100/10 to-transparent blur-3xl" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-white/80 px-4 py-3 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          {/* Logo */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-stone-900 text-amber-400 shadow-sm">
              <Banknote size={19} />
            </div>
            <div className="hidden min-w-0 sm:block">
              <h1 className="truncate text-base font-extrabold leading-none tracking-tight text-stone-900">PeoplePay</h1>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">360 Suite</p>
            </div>
          </div>

          {/* Navigation Pill Container */}
          <nav className="hidden flex-1 items-center justify-center lg:flex">
            <div className="flex items-center gap-1 rounded-full border border-stone-200/80 bg-white p-1 shadow-sm">
              {visibleNavItems.map((item) => (
                <NavItem key={item.to} {...item} end={item.to === '/dashboard'} />
              ))}
              <PayrollMenu currentUser={currentUser} isPayroll={isPayroll()} />
              {visibleBottomNavItems.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          </nav>

          {/* Right Action Bar */}
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden rounded-full border border-amber-200/80 bg-amber-50 px-3.5 py-1 text-xs font-bold text-amber-900 sm:inline-flex">
              {currentUser?.role?.replace(/_/g, ' ')}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-900 text-xs font-extrabold text-amber-400 shadow-sm">
              {userInitial}
            </div>
            <button
              onClick={handleLogout}
              className="hidden h-9 w-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 sm:inline-flex"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200/80 bg-white text-stone-700 shadow-sm lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <Menu size={18} />
          </button>
        </div>

        {/* Mobile Navigation Panel */}
        {mobileOpen && (
          <>
            <button
              className="fixed inset-0 z-[-1] cursor-default bg-black/20 backdrop-blur-xs lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            />
            <div className="absolute left-4 right-4 top-[68px] rounded-[24px] border border-stone-200/80 bg-white p-3 shadow-2xl lg:hidden animate-fadeIn">
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
                  className="inline-flex h-10 items-center rounded-full px-5 text-xs font-semibold text-rose-600 transition-all hover:bg-rose-50"
                >
                  Logout
                </button>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl animate-fadeIn">
          {children}
        </div>
      </main>
    </div>
  );
}
