import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Search, ArrowLeft, Users, Calendar, AlertTriangle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { payrollApi, salaryApi, employeeApi } from '../../services/apiServices';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { OverlapResolutionModal } from '../../components/payroll/OverlapResolutionModal';

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

  // Overlap Detection & Overrides Data
  const [overlapsMap, setOverlapsMap] = useState({});
  const [employeeOverrides, setEmployeeOverrides] = useState({});
  const [activeOverlapModal, setActiveOverlapModal] = useState(null);
  
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

  const checkContractInRange = (employee, pStartStr, pEndStr, targetStructureId) => {
    if (!pStartStr || !pEndStr) return { isValid: true, isStructureMatch: true, reason: null };
    
    const pStart = new Date(pStartStr);
    const pEnd = new Date(pEndStr);
    pStart.setHours(0, 0, 0, 0);
    pEnd.setHours(23, 59, 59, 999);

    const contracts = employee.contracts || [];
    if (!contracts || contracts.length === 0) {
      return { isValid: false, isStructureMatch: false, reason: 'No contract found' };
    }

    const activeContracts = contracts.filter(c => c.status === 'ACTIVE');
    if (activeContracts.length === 0) {
      return { isValid: false, isStructureMatch: false, reason: 'No active contract' };
    }

    const validContract = activeContracts.find(c => {
      const cStart = new Date(c.startDate);
      cStart.setHours(0, 0, 0, 0);
      const cEnd = c.endDate ? new Date(c.endDate) : null;
      if (cEnd) cEnd.setHours(23, 59, 59, 999);

      const startsBeforePeriodEnd = cStart <= pEnd;
      const endsAfterPeriodStart = !cEnd || cEnd >= pStart;

      return startsBeforePeriodEnd && endsAfterPeriodStart;
    });

    if (!validContract) {
      return { isValid: false, isStructureMatch: false, reason: 'No active contract for period' };
    }

    const isStructureMatch = !targetStructureId || validContract.salaryStructureId === targetStructureId;
    const assignedStructureName = validContract.salaryStructure?.name || null;

    if (!isStructureMatch) {
      return {
        isValid: true,
        isStructureMatch: false,
        contract: validContract,
        reason: assignedStructureName ? `Assigned to: ${assignedStructureName}` : 'Structure Mismatch',
      };
    }

    return { isValid: true, isStructureMatch: true, contract: validContract, reason: null };
  };

  useEffect(() => {
    if (currentStep === 2) {
      const fetchEmployeesAndOverlaps = async () => {
        setLoading(true);
        try {
          const res = await employeeApi.getAll({ status: 'ACTIVE', limit: 500 });
          const list = Array.isArray(res) ? res : (res?.data || []);
          const normalized = list.map(e => {
            const contractStatus = checkContractInRange(e, periodStart, periodEnd, selectedStructureId);
            return {
              ...e,
              name: e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim(),
              code: e.code || e.employeeCode || '',
              department: typeof e.department === 'string' ? e.department : e.department?.name || '',
              contractStatus,
            };
          });
          setEmployees(normalized);

          // Check overlaps for all normalized employees
          let overlaps = {};
          try {
            const ovRes = await payrollApi.checkOverlaps({
              periodStart,
              periodEnd,
              employeeIds: normalized.map(e => e.id),
            });
            overlaps = ovRes?.overlaps || ovRes?.data?.overlaps || {};
            setOverlapsMap(overlaps);
          } catch (ovErr) {
            console.error('Error checking overlaps:', ovErr);
          }

          // Auto-select ONLY employees with active contract in period range, matching structure, AND NO OVERLAP
          const matchingEmployeeIds = normalized
            .filter(e => e.contractStatus.isValid && e.contractStatus.isStructureMatch && !overlaps[e.id]?.hasOverlap)
            .map(e => e.id);
          setSelectedEmployeeIds(matchingEmployeeIds);
        } catch (error) {
          console.error('Error fetching employees', error);
        } finally {
          setLoading(false);
        }
      };
      fetchEmployeesAndOverlaps();
    }
  }, [currentStep, periodStart, periodEnd, selectedStructureId]);

  const generatePayrunName = () => {
    if (!periodStart) return 'New Payrun';
    const date = new Date(periodStart);
    return `Payrun - ${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
  };

  const validateOverlapsBeforeProceed = () => {
    const unresolvedEmpId = selectedEmployeeIds.find(id => {
      const hasOv = overlapsMap[id]?.hasOverlap;
      const isResolved = employeeOverrides[id]?.overlapResolved;
      return hasOv && !isResolved;
    });

    if (unresolvedEmpId) {
      const emp = employees.find(e => e.id === unresolvedEmpId);
      setActiveOverlapModal({
        employee: emp,
        overlapInfo: overlapsMap[unresolvedEmpId],
      });
      toast.error(`Overlapping pay period detected for ${emp?.name || 'an employee'}. Please resolve before proceeding.`);
      return false;
    }
    return true;
  };

  const handleProceedToStep3 = () => {
    if (validateOverlapsBeforeProceed()) {
      setCurrentStep(3);
    }
  };

  const handleCreate = async () => {
    if (!validateOverlapsBeforeProceed()) return;

    setSubmitting(true);
    try {
      const employeeSelections = selectedEmployeeIds.map(id => {
        const ov = employeeOverrides[id] || {};
        return {
          employeeId: id,
          effectivePeriodStart: ov.effectivePeriodStart || null,
          effectivePeriodEnd: ov.effectivePeriodEnd || null,
          isOverride: ov.isOverride || false,
          overrideWarning: ov.overrideWarning || null,
          overrideBy: ov.overrideBy || null,
          overrideAt: ov.overrideAt || null,
        };
      });

      const res = await payrollApi.createPayrun({
        name: generatePayrunName(),
        periodStart,
        periodEnd,
        salaryStructureId: selectedStructureId,
        employeeSelections,
      });
      const payrunId = res?.id || res?.data?.id;
      if (payrunId) {
        navigate(`/payroll/payruns/${payrunId}`);
      } else {
        console.error('Created payrun did not return a valid ID', res);
      }
    } catch (error) {
      console.error('Failed to create payrun', error);
      toast.error(error.response?.data?.message || 'Failed to create payrun batch');
      setSubmitting(false);
    }
  };

  const toggleEmployeeSelection = (id) => {
    const emp = employees.find(e => e.id === id);
    const hasOverlap = overlapsMap[id]?.hasOverlap;
    const overrideInfo = employeeOverrides[id];

    if (selectedEmployeeIds.includes(id)) {
      // Unselect employee
      setSelectedEmployeeIds(selectedEmployeeIds.filter(eId => eId !== id));
      const newOverrides = { ...employeeOverrides };
      delete newOverrides[id];
      setEmployeeOverrides(newOverrides);
    } else {
      // Trying to select employee
      if (hasOverlap && !overrideInfo?.overlapResolved) {
        // Surface resolution dialog
        setActiveOverlapModal({
          employee: emp,
          overlapInfo: overlapsMap[id],
        });
      } else {
        setSelectedEmployeeIds([...selectedEmployeeIds, id]);
      }
    }
  };

  const handleModalAdjust = (rem) => {
    if (!activeOverlapModal?.employee) return;
    const empId = activeOverlapModal.employee.id;
    const empName = activeOverlapModal.employee.name;

    setEmployeeOverrides(prev => ({
      ...prev,
      [empId]: {
        effectivePeriodStart: rem.effectivePeriodStart,
        effectivePeriodEnd: rem.effectivePeriodEnd,
        isOverride: false,
        overlapResolved: true,
        formattedRange: rem.formattedRange,
      },
    }));

    if (!selectedEmployeeIds.includes(empId)) {
      setSelectedEmployeeIds(prev => [...prev, empId]);
    }
    toast.success(`Adjusted period for ${empName} to ${rem.formattedRange}`);
    setActiveOverlapModal(null);
  };

  const handleModalOverride = () => {
    if (!activeOverlapModal?.employee) return;
    const empId = activeOverlapModal.employee.id;
    const empName = activeOverlapModal.employee.name;
    const firstPs = activeOverlapModal.overlapInfo?.overlappingPayslips?.[0];
    const psRef = firstPs ? firstPs.payrunName : 'previous payrun';

    const warningText = `Duplicate period warning: this employee was already paid for an overlapping range in ${psRef}. Included anyway per manual override.`;

    setEmployeeOverrides(prev => ({
      ...prev,
      [empId]: {
        isOverride: true,
        overrideWarning: warningText,
        overlapResolved: true,
      },
    }));

    if (!selectedEmployeeIds.includes(empId)) {
      setSelectedEmployeeIds(prev => [...prev, empId]);
    }
    toast.error(`Included ${empName} with duplicate period warning`);
    setActiveOverlapModal(null);
  };

  const handleModalSkip = () => {
    if (!activeOverlapModal?.employee) return;
    const empId = activeOverlapModal.employee.id;
    setSelectedEmployeeIds(prev => prev.filter(id => id !== empId));
    setEmployeeOverrides(prev => {
      const copy = { ...prev };
      delete copy[empId];
      return copy;
    });
    setActiveOverlapModal(null);
  };

  const filteredEmployees = employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter ? e.department === deptFilter : true;
    return matchesSearch && matchesDept;
  });

  const matchingFilteredEmployees = filteredEmployees.filter(e => e.contractStatus?.isValid && e.contractStatus?.isStructureMatch && !overlapsMap[e.id]?.hasOverlap);

  const toggleAllEligible = () => {
    const allMatchingSelected = matchingFilteredEmployees.length > 0 &&
      matchingFilteredEmployees.every(e => selectedEmployeeIds.includes(e.id));

    if (allMatchingSelected) {
      const matchingIds = new Set(matchingFilteredEmployees.map(e => e.id));
      setSelectedEmployeeIds(selectedEmployeeIds.filter(id => !matchingIds.has(id)));
    } else {
      const matchingIds = matchingFilteredEmployees.map(e => e.id);
      setSelectedEmployeeIds(Array.from(new Set([...selectedEmployeeIds, ...matchingIds])));
    }
  };

  const selectedStructure = structures.find(s => s.id === selectedStructureId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Overlap Resolution Modal */}
      {activeOverlapModal && (
        <OverlapResolutionModal
          open={Boolean(activeOverlapModal)}
          onClose={() => setActiveOverlapModal(null)}
          employee={activeOverlapModal.employee}
          overlapInfo={activeOverlapModal.overlapInfo}
          periodStart={periodStart}
          periodEnd={periodEnd}
          onSelectAdjust={handleModalAdjust}
          onSelectOverride={handleModalOverride}
          onSelectSkip={handleModalSkip}
        />
      )}

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
          { num: 1, label: '1. Setup Scope' },
          { num: 2, label: '2. Select Employees' },
          { num: 3, label: '3. Review & Create' },
        ].map((step) => {
          const isActive = currentStep === step.num;
          const isDone = currentStep > step.num;
          return (
            <button
              key={step.num}
              onClick={() => {
                if (step.num < currentStep) setCurrentStep(step.num);
              }}
              disabled={step.num > currentStep}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all ${
                isActive
                  ? 'bg-amber-400 text-stone-950 shadow-sm'
                  : isDone
                  ? 'bg-stone-300/80 text-stone-800 hover:bg-stone-300'
                  : 'text-stone-400 cursor-not-allowed'
              }`}
            >
              {isDone ? <Check className="w-3.5 h-3.5" /> : null}
              {step.label}
            </button>
          );
        })}
      </div>

      {/* CARD CONTAINER */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-xl shadow-stone-200/50 border border-stone-100">
        
        {/* STEP 1: SETUP */}
        {currentStep === 1 && (
          <div className="space-y-6 max-w-xl mx-auto py-2">
            <h2 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">Step 1: Define Payrun Scope</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                  Salary Structure *
                </label>
                <select
                  value={selectedStructureId}
                  onChange={(e) => setSelectedStructureId(e.target.value)}
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 p-3.5 text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  {structures.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.description ? `— ${s.description}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                    Period Start Date *
                  </label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 p-3.5 text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                    Period End Date *
                  </label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 p-3.5 text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 flex items-center gap-3">
                <Calendar className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-900">Generated Payrun Batch Name</p>
                  <p className="text-sm font-black text-amber-950 mt-0.5">{generatePayrunName()}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-stone-100">
              <button
                disabled={!periodStart || !periodEnd || !selectedStructureId}
                onClick={() => setCurrentStep(2)}
                className="btn-primary rounded-full px-6 py-2.5 text-xs font-bold bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                Continue to Employee Selection <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SELECT EMPLOYEES */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-stone-900">Step 2: Select Employees for Batch</h2>
                <p className="text-xs font-medium text-stone-500">Only employees with active contracts matching period and structure are pre-selected</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-900 text-xs font-extrabold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-700" />
                  {selectedEmployeeIds.length} Selected
                </span>
                {matchingFilteredEmployees.length > 0 && (
                  <span className="px-3 py-1.5 rounded-full bg-stone-100 text-stone-700 text-xs font-bold">
                    {matchingFilteredEmployees.length} Eligible Auto-Selected
                  </span>
                )}
              </div>
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
                          checked={matchingFilteredEmployees.length > 0 && matchingFilteredEmployees.every(e => selectedEmployeeIds.includes(e.id))}
                          onChange={toggleAllEligible}
                          title="Toggle all matching structure employees"
                          className="h-4 w-4 text-amber-500 focus:ring-amber-400 border-stone-300 rounded cursor-pointer"
                        />
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Employee</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Department</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Position</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {filteredEmployees.map(emp => {
                      const isEligible = emp.contractStatus?.isValid;
                      const isMatch = emp.contractStatus?.isStructureMatch;
                      const isSelected = selectedEmployeeIds.includes(emp.id);
                      const hasOverlap = overlapsMap[emp.id]?.hasOverlap;
                      const overrideInfo = employeeOverrides[emp.id];

                      let rowBgClass = 'hover:bg-stone-50/60';
                      if (hasOverlap) {
                        rowBgClass = 'bg-amber-50/40 hover:bg-amber-100/50';
                      } else if (!isEligible) {
                        rowBgClass = 'bg-red-50/50 hover:bg-red-100/50';
                      } else if (!isMatch) {
                        rowBgClass = 'bg-amber-50/30 hover:bg-amber-100/30';
                      }

                      return (
                        <tr 
                          key={emp.id} 
                          className={`transition-colors ${rowBgClass}`}
                        >
                          <td className="px-6 py-3.5">
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => toggleEmployeeSelection(emp.id)}
                              className={`h-4 w-4 rounded cursor-pointer ${
                                hasOverlap
                                  ? 'text-amber-600 focus:ring-amber-500 border-amber-400'
                                  : !isEligible 
                                  ? 'text-red-500 focus:ring-red-400 border-red-300' 
                                  : !isMatch
                                  ? 'text-amber-600 focus:ring-amber-400 border-amber-300'
                                  : 'text-amber-500 focus:ring-amber-400 border-stone-300'
                              }`}
                            />
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className={`h-8 w-8 rounded-full font-bold text-xs flex items-center justify-center ${
                                hasOverlap
                                  ? 'bg-amber-200 text-amber-950 font-black'
                                  : !isEligible 
                                  ? 'bg-red-200 text-red-900' 
                                  : !isMatch
                                  ? 'bg-amber-200 text-amber-900'
                                  : 'bg-stone-900 text-white'
                              }`}>
                                {emp.name.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-sm font-semibold ${hasOverlap ? 'text-amber-950 font-bold' : !isEligible ? 'text-red-950 font-bold' : 'text-stone-900'}`}>
                                    {emp.name}
                                  </span>

                                  {/* Overlap Badge */}
                                  {hasOverlap && (
                                    <span 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveOverlapModal({ employee: emp, overlapInfo: overlapsMap[emp.id] });
                                      }}
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full shadow-2xs cursor-pointer hover:bg-amber-200"
                                      title="Click to resolve overlapping period"
                                    >
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                      {overrideInfo?.effectivePeriodStart ? (
                                        `Adjusted: ${overrideInfo.formattedRange}`
                                      ) : overrideInfo?.isOverride ? (
                                        `Override Approved`
                                      ) : (
                                        `⚠️ ${overlapsMap[emp.id].summaryMessage || 'Overlap Detected'}`
                                      )}
                                    </span>
                                  )}

                                  {!hasOverlap && !isEligible && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full shadow-2xs">
                                      <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
                                      {emp.contractStatus?.reason || 'No active contract for period'}
                                    </span>
                                  )}
                                  {!hasOverlap && isEligible && !isMatch && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full shadow-2xs">
                                      <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                                      {emp.contractStatus?.reason || 'Structure Mismatch'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap text-xs font-medium text-stone-600">{emp.department}</td>
                          <td className="px-6 py-3.5 whitespace-nowrap text-xs font-medium text-stone-600">{emp.jobPosition}</td>
                        </tr>
                      );
                    })}
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
                onClick={handleProceedToStep3}
                className="btn-primary rounded-full px-6 py-2 text-xs font-bold bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW & CREATE */}
        {currentStep === 3 && (
          <div className="space-y-6 max-w-xl mx-auto py-2">
            <h2 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">Step 3: Create Payrun Batch</h2>
            
            <div className="bg-stone-50/80 p-6 rounded-[24px] border border-stone-200/80 grid grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Payrun Name</p>
                <p className="font-bold text-stone-900 text-sm mt-0.5">{generatePayrunName()}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Batch Salary Structure</p>
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

            {/* Overlaps & Adjustment Summary */}
            {selectedEmployeeIds.some(id => employeeOverrides[id]?.overlapResolved) && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2 text-xs text-amber-950">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Resolved Period Overlaps ({selectedEmployeeIds.filter(id => employeeOverrides[id]?.overlapResolved).length}):
                </div>
                <div className="space-y-1 pl-5">
                  {selectedEmployeeIds.filter(id => employeeOverrides[id]?.overlapResolved).map(id => {
                    const emp = employees.find(e => e.id === id);
                    const ov = employeeOverrides[id];
                    return (
                      <div key={id} className="flex items-center justify-between">
                        <span>{emp?.name}</span>
                        <span className="font-semibold text-[11px]">
                          {ov.effectivePeriodStart ? `Adjusted (${ov.formattedRange})` : 'Included anyway (Override)'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedEmployeeIds.some(id => {
              const emp = employees.find(e => e.id === id);
              return emp && (!emp.contractStatus?.isValid || !emp.contractStatus?.isStructureMatch);
            }) && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Validation Note:</span> One or more selected employees do not have an active contract matching "{selectedStructure?.name}" for this period. Their contract's assigned structure will be evaluated during computation.
                </div>
              </div>
            )}

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
                  <>Initializing Batch...</>
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
