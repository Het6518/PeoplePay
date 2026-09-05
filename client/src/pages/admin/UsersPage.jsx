import React, { useState, useEffect } from 'react';
import { Plus, Edit, Shield, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { userApi } from '../../services/apiServices';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

const ROLE_COLORS = {
  ADMIN: 'bg-rose-100 text-rose-800 border-rose-200',
  HR_PAYROLL_MANAGER: 'bg-purple-100 text-purple-800 border-purple-200',
  HR_PAYROLL_USER: 'bg-sky-100 text-sky-800 border-sky-200',
  HR_MANAGER: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  EMPLOYEE: 'bg-stone-100 text-stone-700 border-stone-200'
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await userApi.getAll({});
      setUsers(res.data || []);
    } catch (err) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditingUser(null);
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setShowModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">User Management</h1>
          <p className="text-sm font-medium text-stone-500 mt-1">Manage system access, security roles, and user credentials</p>
        </div>

        <button 
          onClick={openNew} 
          className="btn-primary rounded-full px-5 py-2.5 text-xs font-bold bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New User
        </button>
      </div>

      <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-soft overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center"><LoadingSpinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200/60">
              <thead className="bg-stone-50/80">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Email Address</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Linked Employee</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-stone-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-stone-900 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-500"/> {u.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full border ${ROLE_COLORS[u.role] || ROLE_COLORS.EMPLOYEE}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-stone-600">
                      {u.employee?.name || <span className="text-stone-400 italic">Unlinked</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                          <CheckCircle className="w-3.5 h-3.5"/> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full">
                          <XCircle className="w-3.5 h-3.5"/> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded-full bg-stone-100 hover:bg-stone-900 hover:text-white transition-all inline-block">
                        <Edit className="w-3.5 h-3.5"/>
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && !loading && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-xs font-medium text-stone-400">
                      No system users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <UserModal 
          user={editingUser} 
          onClose={() => setShowModal(false)} 
          onSave={() => { setShowModal(false); fetchUsers(); }} 
        />
      )}
    </div>
  );
}

function UserModal({ user, onClose, onSave }) {
  const isEdit = !!user;
  const [formData, setFormData] = useState({
    email: user?.email || '',
    password: '',
    role: user?.role || 'EMPLOYEE',
    isActive: user ? user.isActive : true
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      toast.success(isEdit ? 'User updated' : 'User created');
      onSave();
    } catch (err) {
      toast.error('Failed to save user');
    }
  };

  return (
    <Modal open={true} onClose={onClose} title={isEdit ? 'Edit User Account' : 'Create User Account'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">Email Address</label>
          <input type="email" required disabled={isEdit} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 disabled:bg-stone-100 focus:bg-white focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
            {isEdit ? 'New Password (leave blank to keep current)' : 'Password'}
          </label>
          <input type="password" required={!isEdit} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 focus:bg-white focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">Security Role</label>
          <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm bg-stone-50/50 focus:bg-white focus:outline-none">
            {Object.keys(ROLE_COLORS).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        {isEdit && (
          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="h-4 w-4 rounded text-amber-500 focus:ring-amber-400 border-stone-300" />
            <span className="text-xs font-bold text-stone-800">Account Active</span>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-full border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50">Cancel</button>
          <button type="submit" className="px-6 py-2 rounded-full bg-amber-400 text-stone-950 text-xs font-bold hover:bg-amber-300 shadow-sm">Save User</button>
        </div>
      </form>
    </Modal>
  );
}
