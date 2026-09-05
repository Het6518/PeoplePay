import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Search, ArrowLeft, Users, Calendar } from 'lucide-react';
import { payrollApi, salaryApi, employeeApi } from '../../services/apiServices';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export default function NewPayrunPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1 Data
  const [structures, setStructures] = useState([]);
  const [selectedStructureId, setSelectedStructureId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  
  // Step 2 Data
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchStructures = async () => {
      try {
        const res = await salaryApi.getStructures();
        const list = Array.isArray(res) ? res : (res?.data || []);
        setStructures(list);
        if (list.length > 0) setSelectedStructureId(list[0].id);
      } catch (error) {
        console.error('Error fetching structures', error);
      }
    };
    fetchStructures();
  }, []);

  useEffect(() => {
    if (currentStep === 2 && employees.length === 0) {
      const fetchEmployees = async () => {
        setLoading(true);
        try {
          const res = await employeeApi.getAll({ status: 'ACTIVE' });
          const list = Array.isArray(res) ? res : (res?.data || []);
          const normalized = list.map(e => ({
            ...e,
            name: e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim(),
            code: e.code || e.employeeCode || '',
            department: typeof e.department === 'string' ? e.department : e.department?.name || '',
          }));
          setEmployees(normalized);
          setSelectedEmployeeIds(normalized.map(e => e.id));
        } catch (error) {
          console.error('Error fetching employees', error);
        } finally {
          setLoading(false);
        }
      };
      fetchEmployees();
    }
  }, [currentStep, employees.length]);

  const generatePayrunName = () => {
    if (!periodStart) return 'New Payrun';
    const date = new Date(periodStart);
    return `Payrun - ${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
  };

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const res = await payrollApi.createPayrun({
        name: generatePayrunName(),
        periodStart,
        periodEnd,
        salaryStructureId: selectedStructureId,
        employeeIds: selectedEmployeeIds
      });
      const payrunId = res?.id || res?.data?.id;
      if (payrunId) {
        navigate(`/payroll/payruns/${payrunId}`);
      } else {
        console.error('Created payrun did not return a valid ID', res);
      }
    } catch (error) {
      console.error('Failed to create payrun', error);
      setSubmitting(false);
    }
  };

  const toggleEmployeeSelection = (id) => {
    if (selectedEmployeeIds.includes(id)) {
      setSelectedEmployeeIds(selectedEmployeeIds.filter(eId => eId !== id));
    } else {
      setSelectedEmployeeIds([...selectedEmployeeIds, id]);
    }
  };

  const toggleAll = () => {
    if (selectedEmployeeIds.length === filteredEmployees.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(filteredEmployees.map(e => e.id));
    }
  };

  const filteredEmployees = employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter ? e.department === deptFilter : true;
    return matchesSearch && matchesDept;
  });

  const selectedStructure = structures.find(s => s.id === selectedStructureId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/payroll/payruns')} className="p-2 rounded-full bg-stone-200/60 hover:bg-stone-300 text-stone-700 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">Create New Payrun</h1>
          <p className="text-sm font-medium text-stone-500 mt-0.5">Select salary structure, period, and included employees</p>
        </div>
      </div>

      {/* Step Stepper Pill Container */}
      <div className="bg-stone-200/50 p-2 rounded-full border border-stone-300/40 flex items-center justify-around max-w-xl mx-auto">
        {[
          { num: 1, label: '1. Setup' },
          { num: 2, label: '2. Employees' },
          { num: 3, label: '3. Review' },
        ].map((step) => {
          const isActive = currentStep === step.num;
          const isDone = currentStep > step.num;
          return (
            <div
              key={step.num}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-stone-900 text-white shadow-sm'
                  : isDone
                  ? 'bg-amber-100 text-amber-900'
                  : 'text-stone-500'
              }`}
            >
              {isDone ? <Check className="w-4 h-4 text-amber-600" /> : <span>{step.num}</span>}
              <span>{step.label}</span>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-soft p-6">
        {/* STEP 1: SETUP */}
        {currentStep === 1 && (
          <div className="space-y-6 max-w-lg mx-auto py-2">
            <h2 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">Step 1: Setup Details</h2>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Salary Structure</label>
              <select
                value={selectedStructureId}
                onChange={(e) => setSelectedStructureId(e.target.value)}
                className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
              >
                {structures.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Period Start</label>
                <input 
                  type="date" 
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Period End</label>
                <input 
                  type="date" 
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Generated Payrun Name</label>
              <input 
                type="text" 
                disabled 
                value={generatePayrunName()}
                className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-100/60 font-bold text-stone-700"
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-stone-100">
              <button
                disabled={!periodStart || !periodEnd || !selectedStructureId}
                onClick={() => setCurrentStep(2)}
                className="btn-primary rounded-full px-6 py-2.5 text-xs font-bold bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SELECT EMPLOYEES */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h2 className="text-lg font-bold text-stone-900">Step 2: Select Employees</h2>
              <span className="text-xs font-bold text-stone-900 bg-amber-100 px-3.5 py-1 rounded-full">
                {selectedEmployeeIds.length} Selected
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-2xl border border-stone-200 bg-stone-50/50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="rounded-2xl border border-stone-200 bg-stone-50/50 px-4 py-2 text-xs font-semibold text-stone-700 focus:bg-white focus:outline-none"
              >
                <option value="">All Departments</option>
                {[...new Set(employees.map(e => e.department))].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center"><LoadingSpinner /></div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-stone-200/60">
                  <thead className="bg-stone-50/80 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3.5 text-left">
                        <input 
                          type="checkbox" 
                          checked={selectedEmployeeIds.length === filteredEmployees.length && filteredEmployees.length > 0}
                          onChange={toggleAll}
                          className="h-4 w-4 text-amber-500 focus:ring-amber-400 border-stone-300 rounded"
                        />
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Employee</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Department</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Position</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {filteredEmployees.map(emp => (
                      <tr key={emp.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="px-6 py-3.5">
                          <input 
                            type="checkbox" 
                            checked={selectedEmployeeIds.includes(emp.id)}
                            onChange={() => toggleEmployeeSelection(emp.id)}
                            className="h-4 w-4 text-amber-500 focus:ring-amber-400 border-stone-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-stone-900 text-white font-bold text-xs flex items-center justify-center">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-stone-900">{emp.name}</div>
                              <div className="text-xs font-medium text-stone-400">{emp.code} • {emp.employeeType}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-xs font-medium text-stone-600">{emp.department}</td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-xs font-medium text-stone-600">{emp.jobPosition}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-stone-100">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2 rounded-full border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                disabled={selectedEmployeeIds.length === 0}
                onClick={() => setCurrentStep(3)}
                className="btn-primary rounded-full px-6 py-2 text-xs font-bold bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW */}
        {currentStep === 3 && (
          <div className="space-y-6 max-w-xl mx-auto py-2">
            <h2 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">Step 3: Review & Create</h2>
            
            <div className="bg-stone-50/80 p-6 rounded-[24px] border border-stone-200/80 grid grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Payrun Name</p>
                <p className="font-bold text-stone-900 text-sm mt-0.5">{generatePayrunName()}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Salary Structure</p>
                <p className="font-bold text-stone-900 text-sm mt-0.5">{selectedStructure?.name}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Period</p>
                <p className="font-semibold text-stone-700 text-xs mt-0.5">{periodStart} to {periodEnd}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Selected Employees</p>
                <p className="font-bold text-stone-900 text-sm mt-0.5 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-600" />
                  {selectedEmployeeIds.length} Employees
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-stone-100">
              <button
                onClick={() => setCurrentStep(2)}
                disabled={submitting}
                className="px-5 py-2.5 rounded-full border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="btn-primary rounded-full px-6 py-2.5 text-xs font-bold bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-sm flex items-center gap-2"
              >
                {submitting ? (
                  <>Creating Payrun...</>
                ) : (
                  <><Check className="w-4 h-4" /> Create Payrun Batch</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
