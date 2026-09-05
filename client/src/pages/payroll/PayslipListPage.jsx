import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { payrollApi } from '../../services/apiServices';
import { formatINR, formatDate } from '../../utils/formatters';
import { StatusBadge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { Receipt, Eye, Download } from 'lucide-react';

export default function PayslipListPage() {
  const navigate = useNavigate();
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchPayslips();
  }, [page, statusFilter]);

  const fetchPayslips = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const res = await payrollApi.getPayslips(params);
      const items = Array.isArray(res) ? res : (res?.data || []);
      setPayslips(items);
      setTotalPages(res?.pagination?.totalPages || res?.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await payrollApi.downloadPDF(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('Failed to download PDF', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payslips</h1>
          <p className="page-subtitle">View and manage employee payslips</p>
        </div>
        <div className="flex gap-3">
          <select
            className="input w-48"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="COMPUTED">Computed</option>
            <option value="VALIDATED">Validated</option>
            <option value="PAID">Paid</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center"><LoadingSpinner /></div>
        ) : payslips.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No payslips found"
            message={statusFilter ? `No payslips matching status ${statusFilter}.` : "No payslips have been generated yet."}
          />
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Payrun</th>
                    <th>Period</th>
                    <th>Gross</th>
                    <th>Deductions</th>
                    <th>Net</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payslips.map((payslip) => (
                    <tr
                      key={payslip.id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/payroll/payslips/${payslip.id}`)}
                    >
                      <td className="font-medium text-slate-900">
                        {payslip.employee?.firstName} {payslip.employee?.lastName}
                        <div className="text-xs text-slate-500 font-normal">{payslip.employee?.employeeCode}</div>
                      </td>
                      <td className="text-sm text-slate-700">{payslip.payrun?.name || '-'}</td>
                      <td className="text-sm text-slate-600">
                        {formatDate(payslip.periodStart)} - {formatDate(payslip.periodEnd)}
                      </td>
                      <td className="text-sm text-slate-700 font-medium">{formatINR(payslip.grossSalary)}</td>
                      <td className="text-sm text-red-600 font-medium">{formatINR(payslip.totalDeductions)}</td>
                      <td className="text-sm text-emerald-600 font-semibold">{formatINR(payslip.netSalary)}</td>
                      <td>
                        <StatusBadge status={payslip.status} />
                      </td>
                      <td className="text-right space-x-2">
                        <button
                          className="btn-ghost btn-sm inline-flex items-center text-primary-600 hover:bg-primary-50"
                          onClick={() => navigate(`/payroll/payslips/${payslip.id}`)}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="btn-ghost btn-sm inline-flex items-center text-slate-600 hover:bg-slate-100"
                          onClick={(e) => handleDownload(payslip.id, e)}
                          title="Download PDF"
                        >
                          <Download size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
