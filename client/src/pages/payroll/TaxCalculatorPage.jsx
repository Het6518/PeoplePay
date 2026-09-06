import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Sparkles, 
  HelpCircle, 
  CheckCircle2, 
  TrendingDown, 
  Info, 
  FileText, 
  ShieldCheck, 
  UserCheck, 
  Building2, 
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { taxApi, employeeApi } from '../../services/apiServices';
import { formatINR } from '../../utils/formatters';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export default function TaxCalculatorPage() {
  const [financialYear, setFinancialYear] = useState('2024-25');
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // Income Inputs
  const [grossAnnual, setGrossAnnual] = useState(1200000);
  const [basicSalaryAnnual, setBasicSalaryAnnual] = useState(600000);

  // Old Regime Declarations
  const [section80C, setSection80C] = useState(150000);
  const [section80DSelf, setSection80DSelf] = useState(25000);
  const [section80DParents, setSection80DParents] = useState(0);
  const [homeLoanInterest, setHomeLoanInterest] = useState(0);
  const [section80CCDNPS, setSection80CCDNPS] = useState(0);
  const [rentPaidAnnual, setRentPaidAnnual] = useState(0);
  const [actualHraReceived, setActualHraReceived] = useState(300000);
  const [isMetroCity, setIsMetroCity] = useState(true);
  const [otherDeductions, setOtherDeductions] = useState(0);

  // Comparison Results
  const [comparisonResult, setComparisonResult] = useState(null);
  const [showSlabDetails, setShowSlabDetails] = useState(false);
  const [showDeductionsGuide, setShowDeductionsGuide] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const res = await employeeApi.getAll({ limit: 100, status: 'ACTIVE' });
      const data = res?.data?.employees || res?.data?.data || res?.data || [];
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load employees', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleSelectEmployee = async (empId) => {
    setSelectedEmployeeId(empId);
    if (!empId) return;

    try {
      const res = await taxApi.getEmployeeTaxProfile(empId, { financialYear });
      const data = res?.data?.data || res?.data;
      if (data) {
        if (data.contract) {
          setGrossAnnual(data.contract.annualGross || 0);
          setBasicSalaryAnnual(data.contract.annualBasic || 0);
          setSection80C(data.contract.annualPF || 150000);
          setActualHraReceived(Math.round(data.contract.annualBasic * 0.5));
        }
        if (data.comparison) {
          setComparisonResult(data.comparison);
        }
        toast.success(`Loaded salary profile for ${data.employee.name}`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load employee tax profile');
    }
  };

  // Re-calculate whenever inputs change
  useEffect(() => {
    const runCalculation = async () => {
      setCalculating(true);
      try {
        const payload = {
          grossAnnual: Number(grossAnnual) || 0,
          financialYear,
          basicSalaryAnnual: Number(basicSalaryAnnual) || 0,
          declarations: {
            section80C: Number(section80C) || 0,
            section80DSelf: Number(section80DSelf) || 0,
            section80DParents: Number(section80DParents) || 0,
            homeLoanInterest: Number(homeLoanInterest) || 0,
            section80CCDNPS: Number(section80CCDNPS) || 0,
            rentPaidAnnual: Number(rentPaidAnnual) || 0,
            actualHraReceived: Number(actualHraReceived) || 0,
            isMetroCity,
            otherDeductions: Number(otherDeductions) || 0,
          }
        };
        const res = await taxApi.compare(payload);
        setComparisonResult(res?.data?.data || res?.data);
      } catch (err) {
        console.error('Tax calculation error', err);
      } finally {
        setCalculating(false);
      }
    };

    const timer = setTimeout(() => {
      runCalculation();
    }, 200);

    return () => clearTimeout(timer);
  }, [
    grossAnnual, 
    financialYear, 
    basicSalaryAnnual, 
    section80C, 
    section80DSelf, 
    section80DParents, 
    homeLoanInterest, 
    section80CCDNPS, 
    rentPaidAnnual, 
    actualHraReceived, 
    isMetroCity, 
    otherDeductions
  ]);

  const newRegime = comparisonResult?.newRegime;
  const oldRegime = comparisonResult?.oldRegime;
  const comparison = comparisonResult?.comparison;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Income Tax Department (India)
            </span>
            <span className="text-xs font-semibold text-stone-500">Finance Act 2024 / FY 2024-25 & FY 2025-26</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900 mt-1 flex items-center gap-3">
            Income Tax & Regime Comparison
          </h1>
          <p className="text-sm font-medium text-stone-500 mt-0.5">
            Compare Old vs. New Tax Regime with standard deduction, Section 87A rebate, and calculate exact monthly TDS.
          </p>
        </div>

        {/* Financial Year Selector */}
        <div className="flex items-center gap-2 p-1.5 bg-stone-100 rounded-2xl border border-stone-200">
          <button
            type="button"
            onClick={() => setFinancialYear('2024-25')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              financialYear === '2024-25'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            FY 2024-25 (AY 2025-26)
          </button>
          <button
            type="button"
            onClick={() => setFinancialYear('2025-26')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              financialYear === '2025-26'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            FY 2025-26 (Budget 2025)
          </button>
        </div>
      </div>

      {/* Quick Employee Auto-fill Toolbar */}
      <div className="bg-white rounded-[24px] border border-stone-200/80 shadow-soft p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <UserCheck className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="text-xs font-bold text-stone-800">
            Quick Auto-Fill from Employee Contract:
          </div>
        </div>
        <div className="w-full sm:w-80">
          <select
            value={selectedEmployeeId}
            onChange={(e) => handleSelectEmployee(e.target.value)}
            disabled={loadingEmployees}
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-medium bg-stone-50/70 text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="">-- Select an Employee to Load Profile --</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName} ({emp.employeeCode})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hero Recommendation Banner */}
      {comparison && (
        <div className={`p-6 rounded-[28px] border shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all ${
          comparison.recommendedRegime === 'NEW'
            ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-50/50 to-teal-50/30 border-emerald-200 text-emerald-950'
            : 'bg-gradient-to-r from-indigo-500/10 via-indigo-50/50 to-purple-50/30 border-indigo-200 text-indigo-950'
        }`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                comparison.recommendedRegime === 'NEW'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 text-white'
              }`}>
                Recommended: {comparison.recommendedRegime === 'NEW' ? 'New Tax Regime' : 'Old Tax Regime'}
              </span>
              {comparison.savingsAmount === 0 && (
                <span className="text-xs font-bold text-stone-500">Both regimes yield identical tax</span>
              )}
            </div>
            <p className="text-base font-bold text-stone-900 pt-1">
              {comparison.summaryMessage}
            </p>
            <p className="text-xs text-stone-600">
              Tax in New Regime: <strong className="text-stone-900">{formatINR(newRegime?.totalTax)}</strong> (TDS: {formatINR(newRegime?.monthlyTDS)}/mo) vs. Old Regime: <strong className="text-stone-900">{formatINR(oldRegime?.totalTax)}</strong> (TDS: {formatINR(oldRegime?.monthlyTDS)}/mo)
            </p>
          </div>

          <div className="shrink-0 text-left md:text-right bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-stone-200/60 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">Annual Tax Savings</span>
            <span className="text-2xl font-black text-stone-900 block">{formatINR(comparison.savingsAmount)}</span>
            <span className="text-xs font-bold text-emerald-600 mt-0.5 block">≈ {formatINR(comparison.monthlySavings)} / month</span>
          </div>
        </div>
      )}

      {/* Main Form & Calculation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Salary & Old Regime Deduction Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Income Details Card */}
          <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-soft p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
              <Calculator className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800">1. Annual Income Details</h2>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600">Gross Annual Salary (CTC)</label>
                <span className="text-xs font-bold text-amber-600 font-mono">{formatINR(grossAnnual)}</span>
              </div>
              <input
                type="number"
                step="10000"
                min="0"
                value={grossAnnual}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setGrossAnnual(val);
                  setBasicSalaryAnnual(Math.round(val * 0.5));
                }}
                className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 font-bold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              <p className="text-[11px] text-stone-400 mt-1">Monthly equivalent: {formatINR(grossAnnual / 12)} / month</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600">Annual Basic Salary (for HRA / PF)</label>
                <span className="text-xs font-bold text-stone-700 font-mono">{formatINR(basicSalaryAnnual)}</span>
              </div>
              <input
                type="number"
                step="5000"
                min="0"
                value={basicSalaryAnnual}
                onChange={(e) => setBasicSalaryAnnual(Number(e.target.value))}
                className="w-full rounded-2xl border border-stone-200 px-4 py-2 text-xs bg-stone-50/50 font-semibold text-stone-900 focus:bg-white focus:outline-none"
              />
              <p className="text-[11px] text-stone-400 mt-1">Typically 50% of CTC in standard Indian salary structures</p>
            </div>
          </div>

          {/* Old Regime Statutory Deductions Card */}
          <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-soft p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800">2. Old Regime Deductions (Chapter VI-A)</h2>
              </div>
              <button 
                type="button" 
                onClick={() => setShowDeductionsGuide(!showDeductionsGuide)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" /> Guide
              </button>
            </div>

            {showDeductionsGuide && (
              <div className="p-3 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-xs text-indigo-950 space-y-1">
                <div className="font-bold">Standard Statutory Limits:</div>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-indigo-900">
                  <li><strong>80C</strong>: Max ₹1,50,000 (PF, ELSS, PPF, Life Insurance, Tuition)</li>
                  <li><strong>80D</strong>: Max ₹25,000 (Self) + ₹50,000 (Senior Parents)</li>
                  <li><strong>24(b)</strong>: Max ₹2,00,000 Home Loan Interest</li>
                  <li><strong>80CCD(1B)</strong>: Max ₹50,000 Additional NPS</li>
                  <li><strong>HRA Exemption</strong>: Auto-calculated under Section 10(13A)</li>
                </ul>
              </div>
            )}

            {/* Section 80C */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-stone-700">Section 80C (PF, PPF, ELSS, Insurance)</label>
                <span className="text-[11px] font-bold text-stone-500">Max ₹1.5L</span>
              </div>
              <input
                type="number"
                max="150000"
                min="0"
                value={section80C}
                onChange={(e) => setSection80C(e.target.value)}
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs bg-stone-50/50 font-bold focus:bg-white focus:outline-none"
              />
            </div>

            {/* Section 80D Self & Parents */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">80D Mediclaim (Self)</label>
                <input
                  type="number"
                  max="25000"
                  min="0"
                  value={section80DSelf}
                  onChange={(e) => setSection80DSelf(e.target.value)}
                  placeholder="Max ₹25k"
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs bg-stone-50/50 font-bold focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">80D (Senior Parents)</label>
                <input
                  type="number"
                  max="50000"
                  min="0"
                  value={section80DParents}
                  onChange={(e) => setSection80DParents(e.target.value)}
                  placeholder="Max ₹50k"
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs bg-stone-50/50 font-bold focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Home Loan & NPS */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">24(b) Home Loan Int.</label>
                <input
                  type="number"
                  max="200000"
                  min="0"
                  value={homeLoanInterest}
                  onChange={(e) => setHomeLoanInterest(e.target.value)}
                  placeholder="Max ₹2L"
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs bg-stone-50/50 font-bold focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">80CCD(1B) NPS</label>
                <input
                  type="number"
                  max="50000"
                  min="0"
                  value={section80CCDNPS}
                  onChange={(e) => setSection80CCDNPS(e.target.value)}
                  placeholder="Max ₹50k"
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs bg-stone-50/50 font-bold focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* HRA Calculator */}
            <div className="p-3 rounded-2xl bg-stone-50/70 border border-stone-200/60 space-y-2">
              <div className="text-xs font-bold text-stone-800">HRA Exemption Calculator:</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500">Rent Paid (Annual)</label>
                  <input
                    type="number"
                    min="0"
                    value={rentPaidAnnual}
                    onChange={(e) => setRentPaidAnnual(e.target.value)}
                    placeholder="e.g. 180000"
                    className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500">HRA Component</label>
                  <input
                    type="number"
                    min="0"
                    value={actualHraReceived}
                    onChange={(e) => setActualHraReceived(e.target.value)}
                    placeholder="e.g. 300000"
                    className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs bg-white font-medium"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="metroCheck"
                  checked={isMetroCity}
                  onChange={(e) => setIsMetroCity(e.target.checked)}
                  className="h-3.5 w-3.5 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
                />
                <label htmlFor="metroCheck" className="text-[11px] font-medium text-stone-700">
                  Metro City (Delhi, Mumbai, Kolkata, Chennai - 50% Basic)
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Comparative Side-by-Side Analysis (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Regime Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* NEW REGIME CARD */}
            <div className={`p-6 rounded-[28px] border shadow-soft space-y-4 relative ${
              comparison?.recommendedRegime === 'NEW' 
                ? 'bg-emerald-50/40 border-emerald-300 ring-2 ring-emerald-500/20' 
                : 'bg-white border-stone-200'
            }`}>
              {comparison?.recommendedRegime === 'NEW' && (
                <span className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                  Beneficial
                </span>
              )}

              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">Section 115BAC</div>
                <h3 className="text-lg font-black text-stone-900 mt-0.5">New Tax Regime</h3>
                <p className="text-xs text-stone-500">Default regime with lower slab rates</p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-stone-200/80 space-y-2">
                <div className="flex justify-between text-xs text-stone-600">
                  <span>Gross Salary:</span>
                  <span className="font-semibold text-stone-900">{formatINR(newRegime?.grossAnnual)}</span>
                </div>
                <div className="flex justify-between text-xs text-stone-600">
                  <span>Standard Deduction:</span>
                  <span className="font-semibold text-emerald-700">- {formatINR(newRegime?.standardDeduction)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-stone-900 pt-1 border-t border-stone-100">
                  <span>Net Taxable Income:</span>
                  <span>{formatINR(newRegime?.taxableIncome)}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Calculated Tax:</span>
                  <span>{formatINR(newRegime?.rawTax)}</span>
                </div>
                {newRegime?.rebate87A > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Section 87A Rebate:</span>
                    <span>- {formatINR(newRegime?.rebate87A)}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-600">
                  <span>Health & Edu Cess (4%):</span>
                  <span>{formatINR(newRegime?.cess)}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-stone-900 text-white space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Total Annual Tax</span>
                <div className="text-2xl font-black text-amber-400">{formatINR(newRegime?.totalTax)}</div>
                <div className="text-xs text-stone-300 font-mono pt-1 border-t border-stone-800">
                  Monthly TDS: <strong className="text-white">{formatINR(newRegime?.monthlyTDS)}</strong>
                </div>
              </div>
            </div>

            {/* OLD REGIME CARD */}
            <div className={`p-6 rounded-[28px] border shadow-soft space-y-4 relative ${
              comparison?.recommendedRegime === 'OLD' 
                ? 'bg-indigo-50/40 border-indigo-300 ring-2 ring-indigo-500/20' 
                : 'bg-white border-stone-200'
            }`}>
              {comparison?.recommendedRegime === 'OLD' && (
                <span className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider">
                  Beneficial
                </span>
              )}

              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-800">Traditional</div>
                <h3 className="text-lg font-black text-stone-900 mt-0.5">Old Tax Regime</h3>
                <p className="text-xs text-stone-500">Includes 80C, 80D, HRA & interest</p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-stone-200/80 space-y-2">
                <div className="flex justify-between text-xs text-stone-600">
                  <span>Gross Salary:</span>
                  <span className="font-semibold text-stone-900">{formatINR(oldRegime?.grossAnnual)}</span>
                </div>
                <div className="flex justify-between text-xs text-stone-600">
                  <span>Standard Deduction:</span>
                  <span className="font-semibold text-indigo-700">- {formatINR(oldRegime?.standardDeduction)}</span>
                </div>
                <div className="flex justify-between text-xs text-stone-600">
                  <span>Declared Deductions:</span>
                  <span className="font-semibold text-indigo-700">- {formatINR((oldRegime?.totalDeductions || 50000) - 50000)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-stone-900 pt-1 border-t border-stone-100">
                  <span>Net Taxable Income:</span>
                  <span>{formatINR(oldRegime?.taxableIncome)}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Calculated Tax:</span>
                  <span>{formatINR(oldRegime?.rawTax)}</span>
                </div>
                {oldRegime?.rebate87A > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Section 87A Rebate:</span>
                    <span>- {formatINR(oldRegime?.rebate87A)}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-600">
                  <span>Health & Edu Cess (4%):</span>
                  <span>{formatINR(oldRegime?.cess)}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-stone-900 text-white space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Total Annual Tax</span>
                <div className="text-2xl font-black text-amber-400">{formatINR(oldRegime?.totalTax)}</div>
                <div className="text-xs text-stone-300 font-mono pt-1 border-t border-stone-800">
                  Monthly TDS: <strong className="text-white">{formatINR(oldRegime?.monthlyTDS)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Slab-by-Slab Calculation Drill-Down */}
          <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-soft p-6 space-y-4">
            <button
              type="button"
              onClick={() => setShowSlabDetails(!showSlabDetails)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-800">
                  Slab-by-Slab Computation Breakdown ({financialYear})
                </h3>
              </div>
              {showSlabDetails ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
            </button>

            {showSlabDetails && (
              <div className="pt-2 space-y-4">
                <div className="overflow-x-auto rounded-2xl border border-stone-200/80">
                  <table className="min-w-full divide-y divide-stone-200/60 text-xs">
                    <thead className="bg-stone-50/80 font-bold text-stone-600">
                      <tr>
                        <th className="px-4 py-3 text-left">Income Slab Range</th>
                        <th className="px-4 py-3 text-center">Tax Rate</th>
                        <th className="px-4 py-3 text-right">New Regime Tax</th>
                        <th className="px-4 py-3 text-right">Old Regime Tax</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 bg-white">
                      {newRegime?.slabs?.map((slab, i) => {
                        const oldSlab = oldRegime?.slabs?.[i];
                        return (
                          <tr key={i} className="hover:bg-stone-50/50">
                            <td className="px-4 py-2.5 font-semibold text-stone-900">{slab.label}</td>
                            <td className="px-4 py-2.5 text-center font-bold text-amber-600">{slab.ratePercent}%</td>
                            <td className="px-4 py-2.5 text-right font-mono font-medium">{formatINR(slab.taxAmount)}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-medium">
                              {oldSlab ? formatINR(oldSlab.taxAmount) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
                  <p><strong>Section 87A Rule:</strong> In the New Regime, if taxable income is $\le ₹7,00,000$ (FY 2024-25), tax is 100% rebated up to ₹25,000. In the Old Regime, if taxable income is $\le ₹5,00,000$, tax is rebated up to ₹12,500.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
