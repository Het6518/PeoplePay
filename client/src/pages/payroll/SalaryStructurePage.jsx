import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit2, FileText, Settings, X, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { salaryApi } from '../../services/apiServices';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/ui/Modal';

export default function SalaryStructurePage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const canManageSalaryConfig = ['HR_PAYROLL_MANAGER', 'ADMIN'].includes(currentUser?.role);
  const [structures, setStructures] = useState([]);
  const [selectedStructure, setSelectedStructure] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchStructures();
  }, []);

  const fetchStructures = async () => {
    try {
      const res = await salaryApi.getStructures();
      const list = Array.isArray(res) ? res : (res?.data || []);
      setStructures(list);
      if (selectedStructure) {
        const updated = list.find(s => s.id === selectedStructure.id);
        if (updated) setSelectedStructure(updated);
      }
    } catch (err) {
      toast.error('Failed to fetch salary structures');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">Salary Structures</h1>
          <p className="text-sm font-medium text-stone-500 mt-1">Manage salary calculation rules, allowances, and deduction schemes</p>
        </div>

        {canManageSalaryConfig && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary rounded-full px-5 py-2.5 text-xs font-bold bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Structure
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Structure Cards */}
        <div className={`flex-1 transition-all ${selectedStructure ? 'lg:w-1/3 lg:flex-none' : 'w-full'}`}>
          <div className="space-y-4">
            {structures.map(struct => {
              const isSelected = selectedStructure?.id === struct.id;
              return (
                <div 
                  key={struct.id}
                  onClick={() => setSelectedStructure(struct)}
                  className={`p-5 rounded-[24px] border cursor-pointer transition-all shadow-sm ${
                    isSelected 
                      ? 'border-amber-400 bg-white ring-2 ring-amber-400/20' 
                      : 'border-stone-200/80 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-stone-900 text-base">{struct.name}</h3>
                    {struct.isActive && <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">Active</span>}
                  </div>
                  <p className="text-xs font-medium text-stone-500 mb-4 line-clamp-2">{struct.description || 'No description provided'}</p>
                  <div className="flex items-center gap-4 text-xs font-bold text-stone-600 pt-3 border-t border-stone-100">
                    <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-amber-500"/> {struct.rules?.length || 0} Rules</span>
                    <span className="flex items-center gap-1.5"><Settings className="w-3.5 h-3.5 text-stone-400"/> {struct.contractCount || 0} Contracts</span>
                  </div>
                </div>
              );
            })}
            {structures.length === 0 && (
              <p className="text-stone-400 text-center py-12 bg-white rounded-[28px] border border-dashed border-stone-200 text-xs font-medium">No salary structures found.</p>
            )}
          </div>
        </div>

        {/* Right Detail Panel */}
        {selectedStructure && (
          <div className="flex-[2] bg-white rounded-[28px] border border-stone-200/80 shadow-soft flex flex-col min-h-[500px]">
            <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50/50 rounded-t-[28px]">
              <div>
                <h2 className="text-lg font-bold text-stone-900">{selectedStructure.name} Rules</h2>
                <p className="text-xs font-medium text-stone-500 mt-0.5">{selectedStructure.description}</p>
              </div>
              <div className="flex gap-2">
                {canManageSalaryConfig && (
                  <button
                    onClick={() => navigate(`/payroll/salary-rules/new?structureId=${selectedStructure.id}`)}
                    className="btn-primary rounded-full px-4 py-2 text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 shadow-sm flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Rule
                  </button>
                )}
                <button onClick={() => setSelectedStructure(null)} className="p-1.5 text-stone-400 hover:text-stone-600 lg:hidden">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto p-0">
              <table className="min-w-full divide-y divide-stone-200/60">
                <thead className="bg-stone-50/80">
                  <tr>
                    <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Seq</th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Name (Code)</th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Category</th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Computation</th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Status</th>
                    <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-stone-500">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {selectedStructure.rules?.sort((a,b) => a.sequence - b.sequence).map(rule => (
                    <tr key={rule.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="px-4 py-3.5 text-xs font-bold text-stone-400">{rule.sequence}</td>
                      <td className="px-4 py-3.5">
                        <div className="text-xs font-semibold text-stone-900">{rule.name}</div>
                        <div className="text-[11px] font-mono text-stone-400">{rule.code}</div>
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-800 text-[11px] font-bold">{rule.category}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-medium text-stone-700">
                        {rule.computationType === 'FIXED' ? (
                          rule.category === 'BASIC' ? (
                            <span className="font-semibold text-stone-800">Contract Wage</span>
                          ) : (
                            <span>Fixed: <strong className="font-mono text-stone-900">₹{rule.fixedAmount ?? 0}</strong></span>
                          )
                        ) : rule.computationType === 'PERCENTAGE' ? (
                          <span className="font-mono text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
                            {rule.percentage ?? 0}% of {rule.percentageBase || '-'}
                          </span>
                        ) : (
                          <code className="font-mono text-[11px] font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded border border-stone-200/80">
                            {rule.formula || 'Formula'}
                          </code>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <span className={`font-bold ${rule.isActive ? 'text-emerald-600' : 'text-stone-400'}`}>{rule.isActive ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-xs font-medium">
                        {canManageSalaryConfig && (
                          <Link to={`/payroll/salary-rules/${rule.id}/edit`} className="p-1.5 rounded-full bg-stone-100 hover:bg-stone-900 hover:text-white transition-all inline-block">
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!selectedStructure.rules || selectedStructure.rules.length === 0) && (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center text-xs font-medium text-stone-400">
                        No salary rules defined for this structure yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* New Structure Modal */}
      {showModal && (
        <Modal open={true} onClose={() => setShowModal(false)} title="New Salary Structure" size="md">
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            try {
              toast.success('Structure created');
              setShowModal(false);
              fetchStructures();
            } catch(err) {
              toast.error('Failed to create structure');
            }
          }} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">Structure Name</label>
              <input name="name" required className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 focus:bg-white focus:outline-none" placeholder="e.g., Executive Salary Structure" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">Description</label>
              <textarea name="desc" className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 focus:bg-white focus:outline-none" rows="3" placeholder="Structure description..."></textarea>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
              <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 rounded-full border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50">Cancel</button>
              <button type="submit" className="px-6 py-2 rounded-full bg-amber-400 text-stone-950 text-xs font-bold hover:bg-amber-300 shadow-sm">Create Structure</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
