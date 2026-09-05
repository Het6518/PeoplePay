import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Info, Sparkles } from 'lucide-react';
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
    salaryApi.getStructures().then(res => setStructures(res.data || [])).catch(console.error);

    if (isEdit) {
      // fetch existing rule
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-stone-200/60 hover:bg-stone-300 text-stone-700 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">{isEdit ? 'Edit Salary Rule' : 'New Salary Rule'}</h1>
          <p className="text-sm font-medium text-stone-500 mt-0.5">Define formula logic, sequence order, and computation rules</p>
        </div>
      </div>

      <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-soft p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Salary Structure</label>
              <select name="structureId" value={formData.structureId} onChange={handleChange} required className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 focus:bg-white focus:outline-none">
                <option value="">Select Structure...</option>
                {structures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            
            <div className="flex items-end mb-2">
              <label className="flex items-center cursor-pointer gap-2">
                <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="h-4 w-4 rounded text-amber-500 focus:ring-amber-400 border-stone-300" />
                <span className="text-xs font-bold text-stone-800">Active Salary Rule</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Rule Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 focus:bg-white focus:outline-none" placeholder="e.g., Housing Allowance" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Rule Code (Unique)</label>
              <input type="text" name="code" value={formData.code} onChange={handleCodeChange} required className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 focus:bg-white focus:outline-none font-mono" placeholder="HRA" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Category</label>
              <select name="category" value={formData.category} onChange={handleChange} className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 focus:bg-white focus:outline-none">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Sequence Order</label>
              <input type="number" name="sequence" value={formData.sequence} onChange={handleChange} required className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 focus:bg-white focus:outline-none" />
            </div>
          </div>

          <div className="border-t border-stone-100 pt-6">
            <h3 className="text-sm font-bold text-stone-900 mb-4">Computation Method</h3>
            
            <div className="flex gap-4 mb-6">
              {COMPUTATION_TYPES.map(type => (
                <label key={type} className={`px-4 py-2 rounded-full border text-xs font-bold cursor-pointer transition-all ${
                  formData.computationType === type ? 'bg-stone-900 text-white border-stone-900 shadow-sm' : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}>
                  <input 
                    type="radio" 
                    name="computationType" 
                    value={type} 
                    checked={formData.computationType === type} 
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>

            <div className="bg-stone-50/80 p-5 rounded-[24px] border border-stone-200/80">
              {formData.computationType === 'FIXED' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Fixed Amount</label>
                  <input type="number" step="0.01" name="amount" value={formData.amount} onChange={handleChange} className="w-full md:w-1/3 rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-white focus:outline-none" placeholder="0.00" />
                  <p className="text-[11px] font-medium text-stone-400 mt-2">Note: For BASIC category, the employee's contract wage is used automatically.</p>
                </div>
              )}

              {formData.computationType === 'PERCENTAGE' && (
                <div className="flex gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Percentage (%)</label>
                    <input type="number" step="0.01" name="percentage" value={formData.percentage} onChange={handleChange} className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-white focus:outline-none" placeholder="10" />
                  </div>
                  <div className="text-stone-400 font-bold pb-2.5 text-xs">of</div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Base Rule Code</label>
                    <input type="text" name="baseRuleCode" value={formData.baseRuleCode} onChange={(e) => setFormData(prev => ({...prev, baseRuleCode: e.target.value.toUpperCase()}))} className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-white focus:outline-none font-mono" placeholder="BASIC" />
                  </div>
                </div>
              )}

              {formData.computationType === 'FORMULA' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Formula Expression</label>
                  <textarea name="formula" value={formData.formula} onChange={handleChange} rows="4" className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-xs font-mono bg-white focus:outline-none" placeholder="e.g., (BASIC * 0.1) + 500 if WORKED_DAYS > 20 else (BASIC * 0.05)"></textarea>
                  
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200/80 text-amber-900 rounded-2xl text-xs flex gap-3">
                    <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="block mb-1 font-bold">Available Dynamic Variables:</strong>
                      <div className="flex flex-wrap gap-1 mt-1 font-mono text-[11px]">
                        <span className="bg-amber-100 px-2 py-0.5 rounded-full font-bold">CONTRACT_WAGE</span>
                        <span className="bg-amber-100 px-2 py-0.5 rounded-full font-bold">WORKED_DAYS</span>
                        <span className="bg-amber-100 px-2 py-0.5 rounded-full font-bold">TOTAL_DAYS</span>
                        <span className="bg-amber-100 px-2 py-0.5 rounded-full font-bold">OVERTIME_HOURS</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-stone-100">
            <button type="submit" className="btn-primary rounded-full px-6 py-2.5 text-xs font-bold bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-sm flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Salary Rule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
