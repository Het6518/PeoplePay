import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Eye, Search, FileText } from 'lucide-react';
import { payrollApi } from '../../services/apiServices';
import { formatINR, formatDate } from '../../utils/formatters';
import { StatusBadge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export default function PayrunListPage() {
  const [payruns, setPayruns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPayruns = async () => {
      setLoading(true);
      try {
        const response = await payrollApi.getPayruns();
        const data = Array.isArray(response) ? response : (response?.data || response?.items || []);
        setPayruns(data);
      } catch (error) {
        console.error('Failed to fetch payruns', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayruns();
  }, []);

  const filteredPayruns = filter === 'ALL' 
    ? payruns 
    : payruns.filter(p => p.status === filter);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">Payruns</h1>
          <p className="text-sm font-medium text-stone-500 mt-1">Batch process employee payrolls and generate payslips</p>
        </div>
        
        <Link 
          to="/payroll/payruns/new" 
          className="btn-primary rounded-full px-5 py-2.5 text-xs font-bold bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Payrun
        </Link>
      </div>

      <div className="bg-white rounded-[28px] border border-stone-200/80 shadow-soft overflow-hidden">
        <div className="p-4 border-b border-stone-200/60 flex justify-between items-center bg-stone-50/50">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Status Filter:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-2xl border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="COMPUTED">Computed</option>
              <option value="VALIDATED">Validated</option>
              <option value="PAID">Paid / Final</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><LoadingSpinner /></div>
        ) : filteredPayruns.length === 0 ? (
          <div className="text-center p-12">
            <FileText className="mx-auto h-12 w-12 text-stone-300 mb-3" />
            <h3 className="text-base font-bold text-stone-800">No payruns found</h3>
            <p className="text-xs font-medium text-stone-500 mt-1">
              Click "New Payrun" to compute a new payroll batch.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200/60">
              <thead className="bg-stone-50/80">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-stone-500">
                    Name / Period
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-stone-500">
                    Structure
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-stone-500">
                    Employees
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-stone-500">
                    Gross
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-stone-500">
                    Deductions
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-stone-500">
                    Net Total
                  </th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-stone-500">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-stone-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {filteredPayruns.map((payrun) => (
                  <tr 
                    key={payrun.id} 
                    className="hover:bg-stone-50/60 cursor-pointer transition-colors"
                    onClick={() => navigate(`/payroll/payruns/${payrun.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-stone-900">{payrun.name}</div>
                      <div className="text-xs font-medium text-stone-500">
                        {formatDate(payrun.periodStart)} - {formatDate(payrun.periodEnd)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-stone-600">
                      {payrun.structureName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-stone-800">
                      {payrun.employeeCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-stone-700 text-right">
                      {formatINR(payrun.totalGross)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-rose-600 text-right">
                      {formatINR(payrun.totalDeductions)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600 text-right">
                      {formatINR(payrun.totalNet)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <StatusBadge status={payrun.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/payroll/payruns/${payrun.id}`);
                        }}
                        className="p-1.5 rounded-full bg-stone-100 text-stone-700 hover:bg-stone-900 hover:text-white transition-all inline-flex items-center gap-1 px-3"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
