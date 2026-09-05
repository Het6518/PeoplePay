import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { payrollApi } from '../../services/apiServices';
import { formatINR, formatDate } from '../../utils/formatters';
import { StatusBadge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { exportToCSV } from '../../utils/csvExporter';
import { Receipt, Eye, Download, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';

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
      const items = Array.isArray(res) ? res : res?.data || [];
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
      const url = window.URL.createObjectURL(new Blob([res.data || res]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('PDF downloaded');
    } catch (err) {
      console.error('Failed to download PDF', err);
      toast.error('Failed to download PDF');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      { label: 'Employee Code', key: 'code', accessor: (r) => r.employee?.employeeCode || '-' },
      { label: 'Employee Name', key: 'name', accessor: (r) => `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.trim() },
      { label: 'Payrun Name', key: 'payrun', accessor: (r) => r.payrun?.name || '-' },
      { label: 'Period Start', key: 'periodStart', accessor: (r) => formatDate(r.periodStart) },
      { label: 'Period End', key: 'periodEnd', accessor: (r) => formatDate(r.periodEnd) },
      { label: 'Gross Salary (₹)', key: 'grossSalary', accessor: (r) => r.grossSalary },
      { label: 'Deductions (₹)', key: 'totalDeductions', accessor: (r) => r.totalDeductions },
      { label: 'Net Salary (₹)', key: 'netSalary', accessor: (r) => r.netSalary },
      { label: 'Status', key: 'status' },
    ];
    exportToCSV('Payslips_List', headers, payslips);
    toast.success('Exported Payslips to CSV!');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">Payslips</h1>
          <p className="text-sm font-medium text-stone-500 mt-1">View employee payslips, itemized earnings, and PDF reports</p>
        </div>
        <div className="flex gap-3 items-center">
          <select
            className="rounded-2xl border border-stone-200 bg-stone-50/50 px-4 py-2 text-xs font-semibold text-stone-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
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
            <option value="PAID">Paid / Final</option>
          </select>

          <button
            onClick={handleExportCSV}
            disabled={payslips.length === 0}
            className="btn-secondary rounded-full px-4 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-soft overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center"><LoadingSpinner /></div>
        ) : payslips.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No payslips found"
            message={statusFilter ? `No payslips matching status ${statusFilter}.` : "No payslips have been generated yet."}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200/60">
                <thead className="bg-stone-50/80">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Employee</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Payrun</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-stone-500">Period</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-stone-500">Gross</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-stone-500">Deductions</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-stone-500">Net Salary</th>
                    <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-stone-500">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-stone-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {payslips.map((payslip) => (
                    <tr
                      key={payslip.id}
                      className="hover:bg-stone-50/60 cursor-pointer transition-colors"
                      onClick={() => navigate(`/payroll/payslips/${payslip.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-stone-900">
                          {payslip.employee?.firstName} {payslip.employee?.lastName}
                        </div>
                        <div className="text-xs text-stone-400 font-mono">{payslip.employee?.employeeCode}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-stone-700">{payslip.payrun?.name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-stone-500">
                        {formatDate(payslip.periodStart)} - {formatDate(payslip.periodEnd)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-stone-700 text-right">{formatINR(payslip.grossSalary)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-rose-600 text-right">{formatINR(payslip.totalDeductions)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600 text-right">{formatINR(payslip.netSalary)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <StatusBadge status={payslip.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-2">
                        <button
                          className="p-1.5 rounded-full bg-stone-100 text-stone-700 hover:bg-stone-900 hover:text-white transition-all inline-flex items-center"
                          onClick={() => navigate(`/payroll/payslips/${payslip.id}`)}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="p-1.5 rounded-full bg-stone-100 text-stone-700 hover:bg-amber-400 hover:text-stone-950 transition-all inline-flex items-center"
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
              <div className="px-6 py-4 border-t border-stone-100">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
