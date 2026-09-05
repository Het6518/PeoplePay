import api from './api';

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
};

export const departmentApi = {
  getAll: () => api.get('/departments'),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
};

export const userApi = {
  getAll: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
};

export const employeeApi = {
  getAll: (params) => api.get('/employees', { params }),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  getContracts: (id) => api.get(`/employees/${id}/contracts`),
  getAttendance: (id, params) => api.get(`/employees/${id}/attendance`, { params }),
  getPayslips: (id) => api.get(`/employees/${id}/payslips`),
};

export const contractApi = {
  getAll: (params) => api.get('/contracts', { params }),
  getById: (id) => api.get(`/contracts/${id}`),
  create: (data) => api.post('/contracts', data),
  update: (id, data) => api.put(`/contracts/${id}`, data),
  delete: (id) => api.delete(`/contracts/${id}`),
};

export const scheduleApi = {
  getAll: () => api.get('/schedules'),
  getById: (id) => api.get(`/schedules/${id}`),
  create: (data) => api.post('/schedules', data),
  update: (id, data) => api.put(`/schedules/${id}`, data),
  delete: (id) => api.delete(`/schedules/${id}`),
};

export const attendanceApi = {
  getAll: (params) => api.get('/attendance', { params }),
  getById: (id) => api.get(`/attendance/${id}`),
  getToday: () => api.get('/attendance/today'),
  create: (data) => api.post('/attendance', data),
  checkIn: (data) => api.post('/attendance/checkin', data),
  checkOut: (data) => api.post('/attendance/checkout', data),
  correct: (id, data) => api.patch(`/attendance/${id}/correct`, data),
};

export const attendanceLocationApi = {
  getAll: (params) => api.get('/attendance-locations', { params }),
  getById: (id) => api.get(`/attendance-locations/${id}`),
  create: (data) => api.post('/attendance-locations', data),
  update: (id, data) => api.put(`/attendance-locations/${id}`, data),
  toggleStatus: (id, isActive) => api.patch(`/attendance-locations/${id}/toggle`, { isActive }),
  delete: (id) => api.delete(`/attendance-locations/${id}`),
  assign: (employeeId, locationId) => api.post('/attendance-locations/assign', { employeeId, locationId }),
  getAuditLogs: (params) => api.get('/attendance-locations/audits', { params }),
};

export const timeOffApi = {
  // Types
  getTypes: () => api.get('/time-off/types'),
  createType: (data) => api.post('/time-off/types', data),
  updateType: (id, data) => api.put(`/time-off/types/${id}`, data),
  deleteType: (id) => api.delete(`/time-off/types/${id}`),

  // Allocations
  getAllocations: (params) => api.get('/time-off/allocations', { params }),
  createAllocation: (data) => api.post('/time-off/allocations', data),
  updateAllocation: (id, data) => api.put(`/time-off/allocations/${id}`, data),
  approveAllocation: (id) => api.post(`/time-off/allocations/${id}/approve`),
  refuseAllocation: (id) => api.post(`/time-off/allocations/${id}/refuse`),

  // Balance & Requests
  getBalance: (params) => api.get('/time-off/balance', { params }),
  getRequests: (params) => api.get('/time-off/requests', { params }),
  getRequest: (id) => api.get(`/time-off/requests/${id}`),
  createRequest: (data) => api.post('/time-off/requests', data),
  approve: (id) => api.post(`/time-off/requests/${id}/approve`),
  reject: (id, data) => api.post(`/time-off/requests/${id}/reject`, data),
  cancel: (id) => api.post(`/time-off/requests/${id}/cancel`),
};

export const salaryApi = {
  // Structures
  getStructures: () => api.get('/salary/structures'),
  getStructure: (id) => api.get(`/salary/structures/${id}`),
  createStructure: (data) => api.post('/salary/structures', data),
  updateStructure: (id, data) => api.put(`/salary/structures/${id}`, data),
  deleteStructure: (id) => api.delete(`/salary/structures/${id}`),

  // Rules
  getRules: (params) => api.get('/salary/rules', { params }),
  getRule: (id) => api.get(`/salary/rules/${id}`),
  createRule: (data) => api.post('/salary/rules', data),
  updateRule: (id, data) => api.put(`/salary/rules/${id}`, data),
  deleteRule: (id) => api.delete(`/salary/rules/${id}`),
  reorderRules: (rules) => api.post('/salary/rules/reorder', { rules }),
};

export const payrollApi = {
  // Payruns
  getPayruns: (params) => api.get('/payruns', { params }),
  getPayrun: (id) => api.get(`/payruns/${id}`),
  createPayrun: (data) => api.post('/payruns', data),
  checkOverlaps: (data) => api.post('/payruns/check-overlaps', data),
  compute: (id) => api.post(`/payruns/${id}/compute`),
  computePayrun: (id) => api.post(`/payruns/${id}/compute`),
  validate: (id) => api.post(`/payruns/${id}/validate`),
  validatePayrun: (id) => api.post(`/payruns/${id}/validate`),
  markPaid: (id) => api.post(`/payruns/${id}/mark-paid`),
  sendPayslips: (id) => api.post(`/payruns/${id}/send-payslips`),

  // Payslips
  getPayslips: (params) => api.get('/payslips', { params }),
  getPayslip: (id) => api.get(`/payslips/${id}`),
  downloadPDF: (id) => api.get(`/payslips/${id}/pdf`, { responseType: 'blob' }),
};

export const dashboardApi = {
  getSummary: (params) => api.get('/dashboard/summary', { params }),
  getPayrollTrend: (params) => api.get('/dashboard/payroll-trend', { params }),
  getSalaryByDepartment: (params) => api.get('/dashboard/salary-by-department', { params }),
  getAttendance: (params) => api.get('/dashboard/attendance', { params }),
  getTimeOff: (params) => api.get('/dashboard/time-off', { params }),
  getAlerts: () => api.get('/dashboard/alerts'),
};

export const reportApi = {
  getPayroll: (params) => api.get('/reports/payroll', { params }),
  getAttendance: (params) => api.get('/reports/attendance', { params }),
  getTimeOff: (params) => api.get('/reports/time-off', { params }),
};

export const workingDaysApi = {
  getPolicy: (params) => api.get('/working-days/policy', { params }),
  updatePolicy: (data) => api.put('/working-days/policy', data),
  calculatePeriod: (params) => api.get('/working-days/calculate-period', { params }),
};

export const holidayApi = {
  getSuggestions: () => api.get('/holidays/suggestions'),
  sync: (params) => api.post('/holidays/sync', null, { params }),
  processSuggestion: (id, status) => api.post(`/holidays/suggestions/${id}/process`, { status }),
  createManual: (data) => api.post('/holidays/manual', data),
  getCompanyHolidays: (params) => api.get('/holidays/company', { params }),
};

