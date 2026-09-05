import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { employeeApi, departmentApi, scheduleApi } from '../../services/apiServices';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

export default function EmployeeFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    employeeCode: '',
    email: '',
    phone: '',
    departmentId: '',
    managerId: '',
    jobPosition: '',
    employeeType: 'FULL_TIME',
    status: 'ACTIVE',
    workingScheduleId: '',
    joiningDate: '',
    dateOfBirth: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankName: '',
    panNumber: '',
    createUserAccount: false,
    password: ''
  });

  useEffect(() => {
    fetchOptions();
    if (isEdit) {
      fetchEmployee();
    }
  }, [id]);

  const fetchOptions = async () => {
    try {
      const [deptRes, empRes, schedRes] = await Promise.all([
        departmentApi.getAll(),
        employeeApi.getAll({ status: 'ACTIVE', limit: 100 }), // for managers
        scheduleApi.getAll()
      ]);
      setDepartments(deptRes.data || []);
      setManagers(empRes.data || []);
      setSchedules(schedRes.data || []);
    } catch (error) {
      toast.error('Failed to load form options');
    }
  };

  const fetchEmployee = async () => {
    try {
      const response = await employeeApi.getById(id);
      const emp = response.data;
      setFormData({
        ...emp,
        departmentId: emp.departmentId || '',
        managerId: emp.managerId || '',
        workingScheduleId: emp.workingScheduleId || '',
        joiningDate: emp.joiningDate ? emp.joiningDate.split('T')[0] : '',
        dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.split('T')[0] : '',
        createUserAccount: false,
        password: ''
      });
    } catch (error) {
      toast.error('Failed to load employee details');
      navigate('/employees');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData };
      
      // Clean up empty optional selects
      if (!payload.departmentId) delete payload.departmentId;
      if (!payload.managerId) delete payload.managerId;
      if (!payload.workingScheduleId) delete payload.workingScheduleId;
      if (!payload.phone) delete payload.phone;
      if (!payload.createUserAccount) delete payload.password;
      
      // Format dates to full ISO for backend validation
      if (payload.dateOfBirth) {
        payload.dateOfBirth = new Date(payload.dateOfBirth).toISOString();
      } else {
        delete payload.dateOfBirth;
      }
      
      if (payload.joiningDate) {
        payload.joiningDate = new Date(payload.joiningDate).toISOString();
      }

      if (isEdit) {
        delete payload.createUserAccount;
        delete payload.password;
        await employeeApi.update(id, payload);
        toast.success('Employee updated successfully');
        navigate(`/employees/${id}`);
      } else {
        const res = await employeeApi.create(payload);
        toast.success('Employee created successfully');
        navigate(`/employees/${res.data.id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error saving employee');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            {isEdit ? 'Edit Employee' : 'New Employee'}
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200">
        <div className="space-y-8 divide-y divide-gray-200 bg-white p-8 rounded-lg shadow-sm border border-gray-200">
          
          {/* Basic Info */}
          <div>
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">Personal Information</h3>
              <p className="mt-1 text-sm text-gray-500">Basic identifying information.</p>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              
              <div className="sm:col-span-2">
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First name *</label>
                <div className="mt-1">
                  <input type="text" name="firstName" id="firstName" required value={formData.firstName} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last name *</label>
                <div className="mt-1">
                  <input type="text" name="lastName" id="lastName" required value={formData.lastName} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="employeeCode" className="block text-sm font-medium text-gray-700">Employee Code *</label>
                <div className="mt-1">
                  <input type="text" name="employeeCode" id="employeeCode" required value={formData.employeeCode} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address *</label>
                <div className="mt-1">
                  <input type="email" name="email" id="email" required value={formData.email} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone number</label>
                <div className="mt-1">
                  <input type="text" name="phone" id="phone" value={formData.phone} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">Date of Birth</label>
                <div className="mt-1">
                  <input type="date" name="dateOfBirth" id="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="panNumber" className="block text-sm font-medium text-gray-700">PAN Number</label>
                <div className="mt-1">
                  <input type="text" name="panNumber" id="panNumber" value={formData.panNumber} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md uppercase" />
                </div>
              </div>

            </div>
          </div>

          {/* Employment Details */}
          <div className="pt-8">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">Employment Details</h3>
              <p className="mt-1 text-sm text-gray-500">Job position, department, and scheduling.</p>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              
              <div className="sm:col-span-2">
                <label htmlFor="departmentId" className="block text-sm font-medium text-gray-700">Department</label>
                <div className="mt-1">
                  <select id="departmentId" name="departmentId" value={formData.departmentId} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md">
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="jobPosition" className="block text-sm font-medium text-gray-700">Job Position</label>
                <div className="mt-1">
                  <input type="text" name="jobPosition" id="jobPosition" value={formData.jobPosition} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="managerId" className="block text-sm font-medium text-gray-700">Manager</label>
                <div className="mt-1">
                  <select id="managerId" name="managerId" value={formData.managerId} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md">
                    <option value="">Select Manager</option>
                    {managers.filter(m => m.id !== id).map(m => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="employeeType" className="block text-sm font-medium text-gray-700">Employee Type</label>
                <div className="mt-1">
                  <select id="employeeType" name="employeeType" value={formData.employeeType} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md">
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  <select id="status" name="status" value={formData.status} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md">
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="TERMINATED">Terminated</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="joiningDate" className="block text-sm font-medium text-gray-700">Joining Date *</label>
                <div className="mt-1">
                  <input type="date" name="joiningDate" id="joiningDate" required value={formData.joiningDate} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="workingScheduleId" className="block text-sm font-medium text-gray-700">Working Schedule</label>
                <div className="mt-1">
                  <select id="workingScheduleId" name="workingScheduleId" value={formData.workingScheduleId} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md">
                    <option value="">Select Schedule</option>
                    {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

            </div>
          </div>

          {/* Bank Info */}
          <div className="pt-8">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">Bank Information</h3>
              <p className="mt-1 text-sm text-gray-500">Payroll disbursement details.</p>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <label htmlFor="bankName" className="block text-sm font-medium text-gray-700">Bank Name</label>
                <div className="mt-1">
                  <input type="text" name="bankName" id="bankName" value={formData.bankName} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="bankAccountName" className="block text-sm font-medium text-gray-700">Account Name</label>
                <div className="mt-1">
                  <input type="text" name="bankAccountName" id="bankAccountName" value={formData.bankAccountName} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="bankAccountNumber" className="block text-sm font-medium text-gray-700">Account Number</label>
                <div className="mt-1">
                  <input type="text" name="bankAccountNumber" id="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                </div>
              </div>
            </div>
          </div>

          {/* Create User Account (Only on Creation) */}
          {!isEdit && (
            <div className="pt-8">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="createUserAccount"
                    name="createUserAccount"
                    type="checkbox"
                    checked={formData.createUserAccount}
                    onChange={handleChange}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="createUserAccount" className="font-medium text-gray-700">Create user account for this employee</label>
                  <p className="text-gray-500">Allows them to log in to the portal using their email address.</p>
                </div>
              </div>

              {formData.createUserAccount && (
                <div className="mt-4 sm:col-span-3 w-1/2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">Initial Password *</label>
                  <div className="mt-1">
                    <input type="password" name="password" id="password" required={formData.createUserAccount} value={formData.password} onChange={handleChange} className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md" />
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        <div className="pt-5">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
