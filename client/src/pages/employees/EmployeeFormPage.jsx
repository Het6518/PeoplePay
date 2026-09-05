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
      if (payload.createUserAccount) {
        payload.userPassword = payload.password;
      } else {
        delete payload.password;
        delete payload.userPassword;
      }
      
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
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
            {isEdit ? 'Edit Employee Profile' : 'Create New Employee'}
          </h2>
          <p className="text-sm font-medium text-stone-500 mt-1">
            Fill in personal, employment, and banking details.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white p-8 rounded-[28px] border border-stone-200/80 shadow-sm space-y-8">
          
          {/* Basic Info */}
          <div>
            <div className="pb-4 border-b border-stone-100">
              <h3 className="text-base font-extrabold text-stone-900 uppercase tracking-wider">Personal Information</h3>
              <p className="mt-1 text-xs font-medium text-stone-500">Basic identifying information and contact details.</p>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-y-5 gap-x-4 sm:grid-cols-6">
              
              <div className="sm:col-span-2">
                <label htmlFor="firstName" className="label">First name *</label>
                <input type="text" name="firstName" id="firstName" required value={formData.firstName} onChange={handleChange} className="input" />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="lastName" className="label">Last name *</label>
                <input type="text" name="lastName" id="lastName" required value={formData.lastName} onChange={handleChange} className="input" />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="employeeCode" className="label">Employee Code *</label>
                <input type="text" name="employeeCode" id="employeeCode" required value={formData.employeeCode} onChange={handleChange} className="input font-mono" />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="email" className="label">Email address *</label>
                <input type="email" name="email" id="email" required value={formData.email} onChange={handleChange} className="input" />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="phone" className="label">Phone number</label>
                <input type="text" name="phone" id="phone" value={formData.phone} onChange={handleChange} className="input" />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="dateOfBirth" className="label">Date of Birth</label>
                <input type="date" name="dateOfBirth" id="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="input" />
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="panNumber" className="label">PAN Number</label>
                <input type="text" name="panNumber" id="panNumber" value={formData.panNumber} onChange={handleChange} className="input uppercase font-mono" />
              </div>

            </div>
          </div>

          {/* Employment Details */}
          <div className="pt-6 border-t border-stone-100">
            <div className="pb-4 border-b border-stone-100">
              <h3 className="text-base font-extrabold text-stone-900 uppercase tracking-wider">Employment Details</h3>
              <p className="mt-1 text-xs font-medium text-stone-500">Job position, department, and scheduling assignment.</p>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-y-5 gap-x-4 sm:grid-cols-6">
              
              <div className="sm:col-span-2">
                <label htmlFor="departmentId" className="label">Department</label>
                <select id="departmentId" name="departmentId" value={formData.departmentId} onChange={handleChange} className="input">
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="jobPosition" className="label">Job Position</label>
                <input type="text" name="jobPosition" id="jobPosition" value={formData.jobPosition} onChange={handleChange} className="input" />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="managerId" className="label">Manager</label>
                <select id="managerId" name="managerId" value={formData.managerId} onChange={handleChange} className="input">
                  <option value="">Select Manager</option>
                  {managers.filter(m => m.id !== id).map(m => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="employeeType" className="label">Employee Type</label>
                <select id="employeeType" name="employeeType" value={formData.employeeType} onChange={handleChange} className="input">
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="status" className="label">Status</label>
                <select id="status" name="status" value={formData.status} onChange={handleChange} className="input">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="TERMINATED">Terminated</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="joiningDate" className="label">Joining Date *</label>
                <input type="date" name="joiningDate" id="joiningDate" required value={formData.joiningDate} onChange={handleChange} className="input" />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="workingScheduleId" className="label">Working Schedule</label>
                <select id="workingScheduleId" name="workingScheduleId" value={formData.workingScheduleId} onChange={handleChange} className="input">
                  <option value="">Select Schedule</option>
                  {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

            </div>
          </div>

          {/* Bank Info */}
          <div className="pt-6 border-t border-stone-100">
            <div className="pb-4 border-b border-stone-100">
              <h3 className="text-base font-extrabold text-stone-900 uppercase tracking-wider">Bank Information</h3>
              <p className="mt-1 text-xs font-medium text-stone-500">Payroll disbursement account details.</p>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-y-5 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <label htmlFor="bankName" className="label">Bank Name</label>
                <input type="text" name="bankName" id="bankName" value={formData.bankName} onChange={handleChange} className="input" />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="bankAccountName" className="label">Account Name</label>
                <input type="text" name="bankAccountName" id="bankAccountName" value={formData.bankAccountName} onChange={handleChange} className="input" />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="bankAccountNumber" className="label">Account Number</label>
                <input type="text" name="bankAccountNumber" id="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} className="input font-mono" />
              </div>
            </div>
          </div>

          {/* Create User Account (Only on Creation) */}
          {!isEdit && (
            <div className="pt-6 border-t border-stone-100">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="createUserAccount"
                    name="createUserAccount"
                    type="checkbox"
                    checked={formData.createUserAccount}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-stone-300 text-amber-500 focus:ring-amber-400"
                  />
                </div>
                <div className="ml-3 text-xs">
                  <label htmlFor="createUserAccount" className="font-bold text-stone-900">Create portal user account for this employee</label>
                  <p className="text-stone-500 mt-0.5">Allows them to log in to the portal using their email address.</p>
                </div>
              </div>

              {formData.createUserAccount && (
                <div className="mt-4 sm:col-span-3 max-w-sm">
                  <label htmlFor="password" className="label">Initial Password *</label>
                  <input type="password" name="password" id="password" required={formData.createUserAccount} value={formData.password} onChange={handleChange} className="input" />
                </div>
              )}
            </div>
          )}

          <div className="pt-6 border-t border-stone-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary min-w-[120px]"
            >
              {saving ? 'Saving...' : 'Save Employee'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
