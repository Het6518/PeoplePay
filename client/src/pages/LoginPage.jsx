import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Banknote, Eye, EyeOff, AlertCircle } from 'lucide-react';

const DEMO_USERS = [
  { label: 'Admin', role: 'ADMIN', email: 'admin@peoplepay360.com', password: 'Password123!', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  { label: 'Payroll Manager', role: 'HR_PAYROLL_MANAGER', email: 'payrollmanager@peoplepay360.com', password: 'Password123!', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { label: 'Payroll User', role: 'HR_PAYROLL_USER', email: 'payrolluser@peoplepay360.com', password: 'Password123!', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { label: 'HR Manager', role: 'HR_MANAGER', email: 'hr@peoplepay360.com', password: 'Password123!', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { label: 'Employee', role: 'EMPLOYEE', email: 'employee@peoplepay360.com', password: 'Password123!', color: 'bg-amber-100 text-amber-900 border-amber-300' },
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
    <div className="relative min-h-screen bg-[#FAF9F5] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Top Ambient Glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-96 w-full max-w-7xl -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-200/30 via-amber-100/10 to-transparent blur-3xl" />

      <div className="w-full max-w-4xl flex rounded-[32px] border border-stone-200/80 shadow-2xl overflow-hidden bg-white">
        {/* Left panel - Matte Dark Charcoal */}
        <div className="hidden md:flex flex-col justify-between w-1/2 bg-stone-900 p-10 text-white relative">
          <div className="absolute right-0 top-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
          
          <div>
            <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center text-stone-950 shadow-md">
                <Banknote size={20} />
              </div>
              <div>
                <h1 className="text-lg font-extrabold tracking-tight">PeoplePay360</h1>
                <p className="text-amber-400/90 text-xs font-bold uppercase tracking-wider">Integrated HR Suite</p>
              </div>
            </div>
            <h2 className="text-3xl font-extrabold leading-tight mb-4 tracking-tight">
              Manage your entire<br />HR & Payroll<br />effortlessly
            </h2>
            <p className="text-stone-300 text-sm leading-relaxed font-medium">
              From employee records to precision payslip calculations — streamline every workflow with PeoplePay360.
            </p>
          </div>

          <div className="space-y-3 pt-8 border-t border-stone-800">
            {[
              '✓ Real-time salary rule calculation',
              '✓ Period-based contract handling',
              '✓ Automated payroll validation',
              '✓ PDF payslip generation',
            ].map((f) => (
              <p key={f} className="text-stone-300 text-xs font-semibold">{f}</p>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 bg-white p-8 md:p-12 flex flex-col justify-center">
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">Welcome back</h2>
            <p className="text-stone-500 text-sm font-medium mt-1">Sign in to your PeoplePay360 account</p>
          </div>

          {error && (
            <div className="mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs font-bold text-rose-800">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm tracking-wide mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-stone-950/30 border-t-stone-950 rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-7 pt-5 border-t border-stone-100">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                Demo Accounts (1-Click Fill)
              </p>
              <span className="text-[10px] font-mono text-stone-400">Pass: Password123!</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => fillDemo(u)}
                  className="p-2.5 rounded-2xl border border-stone-200/80 bg-stone-50/70 text-left hover:bg-amber-400/20 hover:border-amber-400 transition-all flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${u.color}`}>
                        {u.label}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-stone-600 truncate mt-1 group-hover:text-stone-900 font-mono">
                      {u.email}
                    </p>
                  </div>
                  <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100 px-2 py-1 rounded-full shrink-0 group-hover:bg-amber-400 group-hover:text-stone-950 transition-colors">
                    Use
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
