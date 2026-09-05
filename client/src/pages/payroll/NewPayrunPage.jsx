import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Search, ArrowLeft, Users } from 'lucide-react';
import { payrollApi, salaryApi, employeeApi } from '../../services/apiServices';

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
    // Fetch Structures on mount
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
    // Fetch Employees when entering step 2
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
          // Auto select all by default
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
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Create New Payrun</h1>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
              currentStep === step ? 'bg-primary-600 text-white' : 
              currentStep > step ? 'bg-primary-100 text-primary-600' : 'bg-gray-200 text-gray-500'
            }`}>
              {currentStep > step ? <Check className="w-5 h-5" /> : step}
            </div>
            {step < 3 && (
              <div className={`w-16 h-1 mx-2 ${currentStep > step ? 'bg-primary-200' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
        {/* STEP 1: SETUP */}
        {currentStep === 1 && (
          <div className="space-y-6 max-w-lg mx-auto">
            <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">1. Setup Details</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salary Structure</label>
              <select
                value={selectedStructureId}
                onChange={(e) => setSelectedStructureId(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 py-2 px-3 border"
              >
                {structures.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
                <input 
                  type="date" 
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 py-2 px-3 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period End</label>
                <input 
                  type="date" 
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 py-2 px-3 border"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Generated Name</label>
              <input 
                type="text" 
                disabled 
                value={generatePayrunName()}
                className="w-full border-gray-200 bg-gray-50 rounded-md shadow-sm py-2 px-3 border text-gray-500"
              />
            </div>

            <div className="flex justify-end pt-4">
              <button
                disabled={!periodStart || !periodEnd || !selectedStructureId}
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium disabled:opacity-50 flex items-center"
              >
                Continue <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SELECT EMPLOYEES */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b pb-2 mb-4">
              <h2 className="text-xl font-semibold text-gray-800">2. Select Employees</h2>
              <span className="text-sm font-medium text-primary-600 bg-primary-50 px-3 py-1 rounded-full">
                {selectedEmployeeIds.length} Selected
              </span>
            </div>

            <div className="flex gap-4 mb-4">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="border-gray-300 rounded-md shadow-sm py-2 px-3 border text-sm"
              >
                <option value="">All Departments</option>
                {[...new Set(employees.map(e => e.department))].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
            ) : (
              <div className="border rounded-md max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input 
                          type="checkbox" 
                          checked={selectedEmployeeIds.length === filteredEmployees.length && filteredEmployees.length > 0}
                          onChange={toggleAll}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEmployees.map(emp => (
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <input 
                            type="checkbox" 
                            checked={selectedEmployeeIds.includes(emp.id)}
                            onChange={() => toggleEmployeeSelection(emp.id)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold mr-3">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                              <div className="text-sm text-gray-500">{emp.code} • {emp.employeeType}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.department}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.jobPosition}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </button>
              <button
                disabled={selectedEmployeeIds.length === 0}
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium disabled:opacity-50 flex items-center"
              >
                Continue <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW */}
        {currentStep === 3 && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">3. Review & Create</h2>
            
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 grid grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <p className="text-sm text-gray-500">Payrun Name</p>
                <p className="font-medium text-gray-900">{generatePayrunName()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Salary Structure</p>
                <p className="font-medium text-gray-900">{selectedStructure?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Period</p>
                <p className="font-medium text-gray-900">{periodStart} to {periodEnd}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Selected Employees</p>
                <p className="font-medium text-gray-900 flex items-center">
                  <Users className="w-4 h-4 mr-1 text-primary-500" />
                  {selectedEmployeeIds.length}
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-8">
              <button
                onClick={() => setCurrentStep(2)}
                disabled={submitting}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium shadow-sm flex items-center"
              >
                {submitting ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> Creating...</>
                ) : (
                  <><Check className="w-4 h-4 mr-2" /> CREATE PAYRUN</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
