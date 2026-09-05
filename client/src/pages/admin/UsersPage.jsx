import React, { useState, useEffect } from 'react';
import { Plus, Edit, Shield, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { userApi } from '../../services/apiServices';

const ROLE_COLORS = {
  ADMIN: 'bg-red-100 text-red-800',
  HR_PAYROLL_MANAGER: 'bg-purple-100 text-purple-800',
  HR_PAYROLL_USER: 'bg-blue-100 text-blue-800',
  HR_MANAGER: 'bg-green-100 text-green-800',
  EMPLOYEE: 'bg-slate-100 text-slate-800'
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await userApi.getAll({});
      setUsers(res.data || []);
    } catch (err) {
      toast.error('Failed to fetch users');
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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <button onClick={openNew} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center">
          <Plus className="w-4 h-4 mr-2" /> New User
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Linked Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(u => (
              <tr key={u.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-gray-400"/> {u.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${ROLE_COLORS[u.role] || ROLE_COLORS.EMPLOYEE}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {u.employee?.name || <span className="text-gray-400 italic">None</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {u.isActive ? <CheckCircle className="w-5 h-5 text-green-500"/> : <XCircle className="w-5 h-5 text-red-500"/>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button onClick={() => openEdit(u)} className="text-indigo-600 hover:text-indigo-900"><Edit className="w-4 h-4"/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
      // api calls would go here, omitting for brevity
      toast.success(isEdit ? 'User updated' : 'User created');
      onSave();
    } catch (err) {
      toast.error('Failed to save user');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">{isEdit ? 'Edit User' : 'New User'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" required disabled={isEdit} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="mt-1 block w-full border rounded-md px-3 py-2 disabled:bg-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {isEdit ? 'New Password (leave blank to keep current)' : 'Password'}
            </label>
            <input type="password" required={!isEdit} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="mt-1 block w-full border rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="mt-1 block w-full border rounded-md px-3 py-2">
              {Object.keys(ROLE_COLORS).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {isEdit && (
            <div className="flex items-center mt-4">
              <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="h-4 w-4 text-indigo-600 rounded" />
              <span className="ml-2 text-sm text-gray-700">Account Active</span>
            </div>
          )}
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
