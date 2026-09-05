import { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Users,
  History,
  Navigation,
  Info,
  RefreshCw,
  Crosshair,
} from 'lucide-react';
import { attendanceLocationApi, employeeApi } from '../../services/apiServices';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Pagination } from '../../components/ui/Pagination';
import { StatusBadge } from '../../components/ui/Badge';
import { GeofenceMap } from '../../components/map/GeofenceMap';
import toast from 'react-hot-toast';

export default function AttendanceLocationPage() {
  const [locations, setLocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('locations'); // 'locations' | 'audits'
  const [page, setPage] = useState(1);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedLocationForAssign, setSelectedLocationForAssign] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  // Delete dialog
  const [deletingId, setDeletingId] = useState(null);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    latitude: 23.0225,
    longitude: 72.5714,
    radiusMeters: 500,
    isActive: true,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [locRes, empRes, auditRes] = await Promise.all([
        attendanceLocationApi.getAll(),
        employeeApi.getAll({ limit: 200, status: 'ACTIVE' }),
        attendanceLocationApi.getAuditLogs(),
      ]);

      setLocations(locRes.data || []);
      setEmployees(empRes.data || []);
      setAuditLogs(auditRes.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load attendance locations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Detect and set form coordinates to admin's current live GPS
  const handleUseCurrentGpsInForm = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    const toastId = toast.loading('Acquiring your current GPS location...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 1000000) / 1000000;
        const lng = Math.round(pos.coords.longitude * 1000000) / 1000000;
        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
        toast.success(`Set location to your current GPS (${lat}, ${lng})`, { id: toastId });
      },
      (err) => {
        toast.error(`GPS Error: ${err.message}`, { id: toastId });
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // Directly update an existing office location to admin's current live GPS
  const handleSetCardToCurrentGps = (loc) => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    const toastId = toast.loading(`Updating ${loc.name} to your current GPS...`);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Math.round(pos.coords.latitude * 1000000) / 1000000;
        const lng = Math.round(pos.coords.longitude * 1000000) / 1000000;
        try {
          await attendanceLocationApi.update(loc.id, {
            latitude: lat,
            longitude: lng,
          });
          toast.success(`Updated ${loc.name} to your GPS (${lat}, ${lng})!`, { id: toastId });
          fetchData();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to update location', { id: toastId });
        }
      },
      (err) => {
        toast.error(`GPS Error: ${err.message}`, { id: toastId });
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleOpenCreate = () => {
    setEditingLocation(null);
    setFormData({
      name: 'Main Office',
      latitude: 23.0225,
      longitude: 72.5714,
      radiusMeters: 500,
      isActive: true,
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (loc) => {
    setEditingLocation(loc);
    setFormData({
      name: loc.name,
      latitude: Number(loc.latitude),
      longitude: Number(loc.longitude),
      radiusMeters: Number(loc.radiusMeters),
      isActive: loc.isActive,
    });
    setIsFormOpen(true);
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    try {
      if (editingLocation) {
        await attendanceLocationApi.update(editingLocation.id, formData);
        toast.success('Attendance location updated successfully');
      } else {
        await attendanceLocationApi.create(formData);
        toast.success('Attendance location created successfully');
      }
      setIsFormOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save location');
    }
  };

  const handleToggleStatus = async (loc) => {
    try {
      await attendanceLocationApi.toggleStatus(loc.id, !loc.isActive);
      toast.success(`Location ${!loc.isActive ? 'activated' : 'deactivated'}`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update location status');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await attendanceLocationApi.delete(deletingId);
      toast.success('Location deleted');
      setDeletingId(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete location');
    }
  };

  const handleAssignEmployee = async (e) => {
    e.preventDefault();
    if (!selectedLocationForAssign || !selectedEmployeeId) {
      toast.error('Please select an employee and a location');
      return;
    }
    try {
      await attendanceLocationApi.assign(selectedEmployeeId, selectedLocationForAssign.id);
      toast.success('Employee assigned to location');
      setIsAssignOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign location');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="text-indigo-600" /> Attendance Geofence Locations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure office locations, geofence radius bounds, employee assignments, and audit history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-all"
            title="Refresh"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="btn-primary flex items-center gap-2 shadow-md shadow-indigo-200"
          >
            <Plus size={18} /> Add Geofence Location
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('locations')}
          className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'locations'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MapPin size={16} /> Office Locations ({locations.length})
        </button>
        <button
          onClick={() => setActiveTab('audits')}
          className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'audits'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History size={16} /> Audit History ({auditLogs.length})
        </button>
      </div>

      {loading ? (
        <LoadingSpinner fullPage={true} />
      ) : activeTab === 'locations' ? (
        <div className="space-y-6">
          {/* Location Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {locations.slice((page - 1) * 10, page * 10).map((loc) => (
              <div
                key={loc.id}
                className={`bg-white rounded-2xl p-5 shadow-sm border transition-all ${
                  loc.isActive ? 'border-slate-200 hover:border-indigo-300' : 'border-slate-200 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{loc.name}</h3>
                      <StatusBadge status={loc.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-mono">
                      Lat: {Number(loc.latitude).toFixed(5)}, Lng: {Number(loc.longitude).toFixed(5)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSetCardToCurrentGps(loc)}
                      className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg flex items-center gap-1 text-xs font-semibold"
                      title="Set location coordinates to your current live GPS"
                    >
                      <Crosshair size={16} className="text-emerald-600" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedLocationForAssign(loc);
                        setIsAssignOpen(true);
                      }}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title="Assign Employees"
                    >
                      <Users size={18} />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(loc)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title="Edit Location"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(loc)}
                      className={`p-1.5 rounded-lg ${
                        loc.isActive
                          ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                          : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={loc.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {loc.isActive ? <XCircle size={18} /> : <CheckCircle size={18} />}
                    </button>
                    <button
                      onClick={() => setDeletingId(loc.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      title="Delete Location"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Map Preview */}
                <div className="my-3">
                  <GeofenceMap officeLocation={loc} height="200px" zoom={15} />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Navigation size={14} className="text-indigo-600" />
                    <span>Allowed Radius: <strong>{loc.radiusMeters}m</strong></span>
                  </div>

                  <button
                    onClick={() => handleSetCardToCurrentGps(loc)}
                    className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-100/70 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-all"
                  >
                    <Crosshair size={13} />
                    <span>Use My Current GPS</span>
                  </button>

                  <div className="flex items-center gap-1.5 font-medium">
                    <Users size={14} className="text-emerald-600" />
                    <span>Assigned: <strong>{loc.employeeCount || 0} employees</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {locations.length > 10 && (
            <div className="pt-4">
              <Pagination
                page={page}
                totalPages={Math.ceil(locations.length / 10)}
                onPageChange={setPage}
              />
            </div>
          )}

          {locations.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-700">No Geofence Locations Configured</h3>
              <p className="text-sm text-slate-500 mt-1">Create your first office location to start geofencing check-ins.</p>
              <button onClick={handleOpenCreate} className="btn-primary mt-4">
                + Add Office Location
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Audit History Table */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Modified By</th>
                <th className="px-6 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3.5 text-slate-500 text-xs font-mono">
                    {new Date(log.createdAt).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                        log.changeType === 'CREATE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.changeType === 'UPDATE'
                          ? 'bg-blue-100 text-blue-800'
                          : log.changeType === 'ASSIGN'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {log.changeType}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 font-semibold text-slate-900">{log.locationName}</td>
                  <td className="px-6 py-3.5 text-slate-600">{log.changedByName || log.changedById}</td>
                  <td className="px-6 py-3.5 text-xs text-slate-500 max-w-xs truncate font-mono">
                    {JSON.stringify(log.newValues || log.oldValues)}
                  </td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    No audit records available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal (Create / Edit) */}
      <Modal
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingLocation ? 'Edit Geofence Location' : 'Add New Geofence Location'}
        size="lg"
      >
        <form onSubmit={handleSaveLocation} className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Location Name *
            </label>
            <button
              type="button"
              onClick={handleUseCurrentGpsInForm}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full hover:bg-emerald-100 transition-all"
            >
              <Crosshair size={14} className="text-emerald-600" /> Use My Current Live GPS
            </button>
          </div>

          <input
            type="text"
            required
            className="input-field"
            placeholder="e.g. Head Office - Ahmedabad"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Latitude *
              </label>
              <input
                type="number"
                step="any"
                required
                className="input-field font-mono"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Longitude *
              </label>
              <input
                type="number"
                step="any"
                required
                className="input-field font-mono"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Radius (Meters) *
              </label>
              <input
                type="number"
                min="10"
                max="10000"
                required
                className="input-field"
                value={formData.radiusMeters}
                onChange={(e) => setFormData({ ...formData, radiusMeters: parseInt(e.target.value, 10) || 500 })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            <label htmlFor="isActive" className="text-sm text-slate-700 font-medium">
              Location is Active
            </label>
          </div>

          {/* Interactive Map Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Info size={14} className="text-indigo-600" /> Interactive Map (Click or Drag Marker to pick location)
              </span>
            </div>
            <GeofenceMap
              officeLocation={formData}
              editable={true}
              onLocationSelect={(lat, lng) => {
                setFormData((prev) => ({
                  ...prev,
                  latitude: Math.round(lat * 1000000) / 1000000,
                  longitude: Math.round(lng * 1000000) / 1000000,
                }));
              }}
              height="260px"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingLocation ? 'Save Changes' : 'Create Location'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Employee Assignment Modal */}
      <Modal
        open={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title={`Assign Employee to ${selectedLocationForAssign?.name || 'Location'}`}
        size="md"
      >
        <form onSubmit={handleAssignEmployee} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select Employee
            </label>
            <select
              className="input-field"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              required
            >
              <option value="">-- Choose Employee --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeCode}) -{' '}
                  {emp.department?.name || 'No Dept'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => setIsAssignOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Assign Location
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Geofence Location"
        message="Are you sure you want to delete this office location? Assigned employees will be unassigned."
      />
    </div>
  );
}
