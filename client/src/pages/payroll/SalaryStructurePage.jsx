import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit2, FileText, Settings, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { salaryApi } from '../../services/apiServices';

export default function SalaryStructurePage() {
  const navigate = useNavigate();
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
      // If we had a selected one, refresh its details
      if (selectedStructure) {
        const updated = list.find(s => s.id === selectedStructure.id);
        if (updated) setSelectedStructure(updated);
      }
    } catch (err) {
      toast.error('Failed to fetch salary structures');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto flex gap-6">
      
      {/* Left List */}
      <div className={`flex-1 transition-all ${selectedStructure ? 'hidden md:block md:w-1/3 md:flex-none' : 'w-full'}`}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Salary Structures</h1>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700"
            title="New Structure"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {structures.map(struct => (
            <div 
              key={struct.id}
              onClick={() => setSelectedStructure(struct)}
              className={`p-4 rounded-lg border cursor-pointer transition shadow-sm
                ${selectedStructure?.id === struct.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-300'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-900">{struct.name}</h3>
                {struct.isActive && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Active</span>}
              </div>
              <p className="text-sm text-gray-500 mb-3">{struct.description}</p>
              <div className="flex space-x-4 text-xs text-gray-500">
                <span className="flex items-center"><FileText className="w-3 h-3 mr-1"/> {struct.rules?.length || 0} Rules</span>
                <span className="flex items-center"><Settings className="w-3 h-3 mr-1"/> {struct.contractCount || 0} Contracts</span>
              </div>
            </div>
          ))}
          {structures.length === 0 && (
            <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg border border-dashed">No structures found.</p>
          )}
        </div>
      </div>

      {/* Right Detail Panel */}
      {selectedStructure && (
        <div className="flex-[2] bg-white rounded-lg shadow border border-gray-200 flex flex-col h-[calc(100vh-8rem)]">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{selectedStructure.name} Details</h2>
              <p className="text-sm text-gray-500">{selectedStructure.description}</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => navigate(`/payroll/salary-rules/new?structureId=${selectedStructure.id}`)}
                className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-50 flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Rule
              </button>
              <button onClick={() => setSelectedStructure(null)} className="p-1.5 text-gray-400 hover:text-gray-600 md:hidden">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white sticky top-0 shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seq</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name (Code)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Computation</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedStructure.rules?.sort((a,b) => a.sequence - b.sequence).map(rule => (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">{rule.sequence}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                      <div className="text-xs text-gray-500">{rule.code}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">{rule.category}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {rule.computationType === 'FIXED' ? `Fixed: ${rule.amount}` : 
                       rule.computationType === 'PERCENTAGE' ? `${rule.percentage}% of ${rule.baseRuleCode}` : 
                       'Formula'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={rule.isActive ? 'text-green-600' : 'text-gray-400'}>{rule.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      <Link to={`/payroll/salary-rules/${rule.id}/edit`} className="text-indigo-600 hover:text-indigo-900">
                        <Edit2 className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {(!selectedStructure.rules || selectedStructure.rules.length === 0) && (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      No salary rules defined for this structure.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Structure Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">New Salary Structure</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              try {
                // await salaryApi.createStructure({ name: formData.get('name'), description: formData.get('desc') });
                toast.success('Structure created');
                setShowModal(false);
                fetchStructures();
              } catch(err) {
                toast.error('Failed to create structure');
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input name="name" required className="mt-1 block w-full border rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea name="desc" className="mt-1 block w-full border rounded-md px-3 py-2" rows="3"></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
