import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { salaryApi } from '../../services/apiServices';

const CATEGORIES = ['BASIC', 'ALLOWANCE', 'GROSS', 'DEDUCTION', 'NET'];
const COMPUTATION_TYPES = ['FIXED', 'PERCENTAGE', 'FORMULA'];

export default function SalaryRuleFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const initialStructureId = searchParams.get('structureId') || '';

  const [formData, setFormData] = useState({
    structureId: initialStructureId,
    name: '',
    code: '',
    category: 'ALLOWANCE',
    sequence: 10,
    isActive: true,
    computationType: 'FIXED',
    amount: '',
    percentage: '',
    baseRuleCode: '',
    formula: ''
  });

  const [structures, setStructures] = useState([]);

  useEffect(() => {
    // Fetch structures for dropdown
    salaryApi.getStructures().then(res => setStructures(res.data || [])).catch(console.error);

    if (isEdit) {
      // fetch existing rule
      // salaryApi.getRule(id).then(res => setFormData(res.data))
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCodeChange = (e) => {
    setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase().replace(/\s+/g, '_') }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await salaryApi.updateRule(id, formData);
        toast.success('Rule updated');
      } else {
        await salaryApi.createRule(formData);
        toast.success('Rule created');
      }
      navigate('/payroll/salary-structures');
    } catch (err) {
      toast.error('Failed to save rule');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <button onClick={() => navigate(-1)} className="mr-4 text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Salary Rule' : 'New Salary Rule'}</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salary Structure</label>
              <select name="structureId" value={formData.structureId} onChange={handleChange} required className="w-full border rounded-md px-3 py-2">
                <option value="">Select Structure...</option>
                {structures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            
            <div className="flex items-end mb-2">
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="h-4 w-4 text-indigo-600 rounded" />
                <span className="ml-2 text-sm text-gray-700">Active Rule</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full border rounded-md px-3 py-2" placeholder="e.g., Housing Allowance" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rule Code (Unique, Uppercase)</label>
              <input type="text" name="code" value={formData.code} onChange={handleCodeChange} required className="w-full border rounded-md px-3 py-2" placeholder="HRA" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select name="category" value={formData.category} onChange={handleChange} className="w-full border rounded-md px-3 py-2">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sequence (Order of calculation)</label>
              <input type="number" name="sequence" value={formData.sequence} onChange={handleChange} required className="w-full border rounded-md px-3 py-2" />
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Computation</h3>
            
            <div className="flex space-x-6 mb-6">
              {COMPUTATION_TYPES.map(type => (
                <label key={type} className="flex items-center cursor-pointer">
                  <input 
                    type="radio" 
                    name="computationType" 
                    value={type} 
                    checked={formData.computationType === type} 
                    onChange={handleChange}
                    className="h-4 w-4 text-indigo-600"
                  />
                  <span className="ml-2 text-sm text-gray-700 capitalize">{type.toLowerCase()}</span>
                </label>
              ))}
            </div>

            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              {formData.computationType === 'FIXED' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Amount</label>
                  <input type="number" step="0.01" name="amount" value={formData.amount} onChange={handleChange} className="w-full md:w-1/3 border rounded-md px-3 py-2" placeholder="0.00" />
                  <p className="text-xs text-gray-500 mt-2">Note: For BASIC category, the employee's contract wage is typically used instead of a fixed amount.</p>
                </div>
              )}

              {formData.computationType === 'PERCENTAGE' && (
                <div className="flex gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Percentage (%)</label>
                    <input type="number" step="0.01" name="percentage" value={formData.percentage} onChange={handleChange} className="w-full border rounded-md px-3 py-2" placeholder="10" />
                  </div>
                  <div className="text-gray-500 pb-2">of</div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Rule Code</label>
                    <input type="text" name="baseRuleCode" value={formData.baseRuleCode} onChange={(e) => setFormData(prev => ({...prev, baseRuleCode: e.target.value.toUpperCase()}))} className="w-full border rounded-md px-3 py-2" placeholder="BASIC" />
                  </div>
                </div>
              )}

              {formData.computationType === 'FORMULA' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Python/JS-like Formula</label>
                  <textarea name="formula" value={formData.formula} onChange={handleChange} rows="4" className="w-full border rounded-md px-3 py-2 font-mono text-sm" placeholder="e.g., (BASIC * 0.1) + 500 if WORKED_DAYS > 20 else (BASIC * 0.05)"></textarea>
                  
                  <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-md text-xs flex gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="block mb-1">Available Variables:</strong>
                      <code className="bg-blue-100 px-1 py-0.5 rounded mr-1">CONTRACT_WAGE</code>
                      <code className="bg-blue-100 px-1 py-0.5 rounded mr-1">WORKED_DAYS</code>
                      <code className="bg-blue-100 px-1 py-0.5 rounded mr-1">TOTAL_DAYS</code>
                      <code className="bg-blue-100 px-1 py-0.5 rounded mr-1">OVERTIME_HOURS</code>
                      <br/>
                      <span className="mt-1 inline-block">Plus any previously computed Rule Code (e.g., <code>BASIC</code>, <code>HRA</code>)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 flex items-center">
              <Save className="w-4 h-4 mr-2" /> Save Rule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
