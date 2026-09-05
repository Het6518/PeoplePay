import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Banknote, ChevronDown, LogOut, Search, Bell, Settings, User
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
        `inline-flex h-9 items-center rounded-full px-4 text-xs font-bold transition-all duration-200 ${
          fullWidth ? 'w-full justify-start text-left' : ''
        } ${
          isActive
            ? 'bg-stone-900 text-white shadow-sm'
            : 'text-stone-600 hover:bg-stone-150 hover:text-stone-900'
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
            ? 'flex h-9 w-full items-center justify-between rounded-full px-4 text-left text-xs font-bold text-stone-600 transition-all hover:bg-stone-100 hover:text-stone-900'
            : 'inline-flex h-9 items-center gap-1 rounded-full px-4 text-xs font-bold text-stone-600 transition-all hover:bg-stone-100 hover:text-stone-900'
        }
      >
        <span>Payroll</span>
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className={
            mobile
              ? 'mt-1 space-y-1 rounded-2xl bg-stone-50 p-2 border border-stone-200/60'
              : 'absolute left-0 top-11 z-50 w-52 rounded-3xl border border-stone-200/80 bg-white p-2 shadow-xl animate-fadeIn'
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
                `block rounded-full px-4 py-2 text-xs font-bold transition-all ${
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
    { to: '/admin/attendance-location', label: 'Geofences', show: isHR() },
    { to: '/admin/users', label: 'Admin', show: isAdmin() },
  ];

  const visibleNavItems = navItems.filter((item) => item.show);
  const visibleBottomNavItems = bottomNavItems.filter((item) => item.show);
  const userInitial = (currentUser?.employee?.firstName?.[0] || currentUser?.email?.[0] || 'U').toUpperCase();

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#FAF8F5] text-stone-900 selection:bg-amber-200 selection:text-stone-900">
      {/* Top Background Ambient Radial Warm Glow */}
      <div className="pointer-events-none absolute right-0 top-0 -z-10 h-96 w-full max-w-5xl bg-gradient-to-bl from-amber-300/35 via-amber-100/15 to-transparent blur-3xl" />

      {/* Header Navigation */}
      <header className="sticky top-0 z-40 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          
          {/* Logo Branding */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-stone-950 text-amber-400 shadow-md shadow-stone-950/10">
              <Banknote size={20} className="text-amber-400" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-black tracking-tight text-stone-950 leading-none">PEOPLEPAY</h1>
              <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-amber-600">360 SUITE</p>
            </div>
          </div>

          {/* Floating Centered Pill Navigation Bar */}
          <nav className="hidden flex-1 items-center justify-center lg:flex">
            <div className="flex items-center gap-1 rounded-full border border-stone-200/80 bg-white/90 p-1.5 shadow-sm backdrop-blur-md">
              {visibleNavItems.map((item) => (
                <NavItem key={item.to} {...item} end={item.to === '/dashboard'} />
              ))}
              <PayrollMenu currentUser={currentUser} isPayroll={isPayroll()} />
              {visibleBottomNavItems.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          </nav>

          {/* Right Top Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-white/80 border border-stone-200/80 text-stone-600 shadow-sm hover:bg-stone-100 hover:text-stone-900 transition-all relative">
              <Bell size={16} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500" />
            </button>

            <span className="hidden rounded-full border border-amber-300/80 bg-amber-100/70 px-3 py-1 text-xs font-extrabold text-stone-900 sm:inline-flex">
              {currentUser?.role?.replace(/_/g, ' ')}
            </span>

            {/* Profile Avatar */}
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-950 text-xs font-black text-amber-400 shadow-sm ring-2 ring-amber-300/50">
              {userInitial}
            </div>

            <button
              onClick={handleLogout}
              className="hidden h-9 w-9 items-center justify-center rounded-full text-stone-500 hover:bg-stone-150 hover:text-stone-900 sm:inline-flex transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Page Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
