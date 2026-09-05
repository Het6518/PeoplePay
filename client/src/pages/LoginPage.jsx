import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Banknote, Eye, EyeOff, AlertCircle } from 'lucide-react';

const DEMO_USERS = [
  { label: 'Admin', email: 'admin@peoplepay360.com', password: 'Admin@123', color: 'bg-red-100 text-red-700' },
  { label: 'Payroll Mgr', email: 'payrollmanager@peoplepay360.com', password: 'Pmgr@1234', color: 'bg-purple-100 text-purple-700' },
  { label: 'Payroll User', email: 'payrolluser@peoplepay360.com', password: 'Pay@12345', color: 'bg-blue-100 text-blue-700' },
  { label: 'HR Manager', email: 'hr@peoplepay360.com', password: 'Hr@123456', color: 'bg-green-100 text-green-700' },
  { label: 'Employee', email: 'employee@peoplepay360.com', password: 'Emp@12345', color: 'bg-amber-100 text-amber-700' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (user) => {
    setForm({ email: user.email, password: user.password });
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl flex rounded-2xl shadow-2xl overflow-hidden">
        {/* Left panel */}
        <div className="hidden md:flex flex-col justify-between w-1/2 bg-gradient-to-br from-primary-800/50 to-primary-900/50 p-10 text-white">
          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                <Banknote size={22} className="text-primary-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold">PeoplePay360</h1>
                <p className="text-primary-300 text-xs">Integrated HR & Payroll</p>
              </div>
            </div>
            <h2 className="text-3xl font-bold leading-tight mb-4">
              Manage your entire<br />HR & Payroll<br />in one place
            </h2>
            <p className="text-primary-200 text-sm leading-relaxed">
              From employee onboarding to payslip generation — streamline every HR workflow with PeoplePay360.
            </p>
          </div>

          <div className="space-y-3">
            {[
              '✓ Real-time salary rule engine',
              '✓ Period-based contract detection',
              '✓ Automated payroll validation',
              '✓ PDF payslips & bulk email',
            ].map((f) => (
              <p key={f} className="text-primary-200 text-sm">{f}</p>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 bg-white p-8 md:p-10">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-slate-500 text-sm mt-1">Sign in to your PeoplePay360 account</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-sm text-red-700">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="label">Email address</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="label">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-8">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">
              Demo accounts — click to fill
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.email}
                  onClick={() => fillDemo(u)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium text-left hover:opacity-80 transition-opacity ${u.color}`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
