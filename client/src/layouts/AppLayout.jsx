import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Banknote, ChevronDown, LogOut, Menu, X, User
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

function NavItem({ to, label, end = false, onClick, fullWidth = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `inline-flex h-10 items-center rounded-full px-5 text-xs lg:text-sm font-semibold transition-all ${
          fullWidth ? 'w-full justify-start text-left' : ''
        } ${
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
      <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-white/90 px-3 sm:px-4 py-3 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-stone-900 text-amber-400 shadow-sm">
              <Banknote size={19} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm sm:text-base font-extrabold leading-none tracking-tight text-stone-900">PeoplePay</h1>
              <p className="mt-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-600">360 Suite</p>
            </div>
          </div>

          {/* Desktop Navigation Pill Container */}
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
          <div className="flex items-center gap-2 sm:gap-3">
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

            {/* Mobile Menu Toggle Button */}
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200/80 bg-white text-stone-700 shadow-sm hover:bg-stone-50 lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle Navigation"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-30 bg-stone-900/40 backdrop-blur-xs lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute left-3 right-3 top-[64px] z-40 rounded-[28px] border border-stone-200/90 bg-white p-4 shadow-2xl lg:hidden animate-fadeIn space-y-3 max-h-[85vh] overflow-y-auto">
              {/* Mobile User Info Badge */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 px-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center shadow-sm">
                    {userInitial}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-900 truncate max-w-[180px]">{currentUser?.email}</p>
                    <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">{currentUser?.role?.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              </div>

              {/* Mobile Menu Items */}
              <div className="space-y-1">
                {visibleNavItems.map((item) => (
                  <NavItem
                    key={item.to}
                    {...item}
                    end={item.to === '/dashboard'}
                    fullWidth
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
                  <NavItem key={item.to} {...item} fullWidth onClick={() => setMobileOpen(false)} />
                ))}
              </div>

              <div className="pt-2 border-t border-stone-100">
                <button
                  onClick={handleLogout}
                  className="flex h-10 w-full items-center gap-2 rounded-full px-5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all"
                >
                  <LogOut size={15} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="mx-auto max-w-7xl animate-fadeIn">
          {children}
        </div>
      </main>
    </div>
  );
}
