import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Users, FileText, Calendar, Clock, CreditCard,
  BarChart3, Settings, LogOut, Menu, X, ChevronDown, ChevronRight,
  UserCircle, Building2, ClipboardList, Banknote, ListChecks,
} from 'lucide-react';

const payrollSubItems = [
  { to: '/payroll/payruns', label: 'Payruns' },
  { to: '/payroll/payslips', label: 'Payslips' },
  { to: '/payroll/salary-structures', label: 'Salary Structures' },
  { to: '/payroll/salary-rules', label: 'Salary Rules' },
];

function SidebarItem({ to, icon: Icon, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
      }
    >
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  );
}

function PayrollMenu({ isPayroll }) {
  const [open, setOpen] = useState(false);
  if (!isPayroll) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full sidebar-link-inactive flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Banknote size={18} />
          <span>Payroll</span>
        </div>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div className="ml-6 mt-1 space-y-1 border-l border-white/20 pl-3">
          {payrollSubItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-primary-500 text-white font-medium'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
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

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', always: true },
    { to: '/employees', icon: Users, label: 'Employees', show: true },
    { to: '/contracts', icon: FileText, label: 'Contracts', show: isHR() },
    { to: '/schedules', icon: Calendar, label: 'Schedules', show: isHR() },
    { to: '/attendance', icon: Clock, label: 'Attendance', show: true },
    { to: '/time-off', icon: ClipboardList, label: 'Time Off', show: true },
  ];

  const bottomNavItems = [
    { to: '/reports', icon: BarChart3, label: 'Reports', show: isHR() },
    { to: '/admin/users', icon: Settings, label: 'Admin', show: isAdmin() },
  ];

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-gradient-to-b from-primary-950 to-primary-900">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center">
            <Banknote size={20} className="text-primary-600" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-none">PeoplePay</h1>
            <p className="text-primary-300 text-xs">360°</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.filter((i) => i.always || i.show).map((item) => (
          <SidebarItem key={item.to} {...item} end={item.to === '/dashboard'} />
        ))}
        <PayrollMenu isPayroll={isPayroll()} />
        <div className="pt-2 border-t border-white/10 mt-2 space-y-1">
          {bottomNavItems.filter((i) => i.show).map((item) => (
            <SidebarItem key={item.to} {...item} />
          ))}
        </div>
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/10">
          <div className="w-8 h-8 rounded-full bg-primary-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {(currentUser?.employee?.firstName?.[0] || currentUser?.email?.[0] || 'U').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {currentUser?.employee
                ? `${currentUser.employee.firstName} ${currentUser.employee.lastName}`
                : currentUser?.email}
            </p>
            <p className="text-primary-300 text-xs truncate">{currentUser?.role?.replace(/_/g, ' ')}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-primary-300 hover:text-white transition-colors flex-shrink-0"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-64 z-10">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top nav */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 h-14 flex items-center justify-between flex-shrink-0">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} className="text-slate-600" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
              {currentUser?.role?.replace(/_/g, ' ')}
            </span>
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-bold">
              {(currentUser?.employee?.firstName?.[0] || currentUser?.email?.[0] || 'U').toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
