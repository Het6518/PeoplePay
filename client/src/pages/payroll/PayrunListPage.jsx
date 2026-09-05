import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Eye, Search, FileText } from 'lucide-react';
import { payrollApi } from '../../services/apiServices';
import { formatINR, formatDate } from '../../utils/formatters';

const StatusBadge = ({ status }) => {
  const styles = {
    DRAFT: 'bg-yellow-100 text-yellow-800',
    COMPUTED: 'bg-blue-100 text-blue-800',
    VALIDATED: 'bg-indigo-100 text-indigo-800',
    PAID: 'bg-green-100 text-green-800',
  };

  const currentStyle = styles[status] || 'bg-gray-100 text-gray-800';

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${currentStyle}`}>
      {status}
    </span>
  );
};

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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payruns</h1>
          <p className="text-gray-500 text-sm mt-1">Manage and process employee payroll</p>
        </div>
        
        <Link 
          to="/payroll/payruns/new" 
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Payrun
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Filter Status:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="COMPUTED">Computed</option>
              <option value="VALIDATED">Validated</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredPayruns.length === 0 ? (
          <div className="text-center p-12">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No payruns</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new payrun.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name / Period
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Structure
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employees
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gross
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deductions
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayruns.map((payrun) => (
                  <tr 
                    key={payrun.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/payroll/payruns/${payrun.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{payrun.name}</div>
                      <div className="text-sm text-gray-500">
                        {formatDate(payrun.periodStart)} - {formatDate(payrun.periodEnd)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payrun.structureName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payrun.employeeCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {formatINR(payrun.totalGross)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500 text-right">
                      {formatINR(payrun.totalDeductions)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                      {formatINR(payrun.totalNet)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <StatusBadge status={payrun.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/payroll/payruns/${payrun.id}`);
                        }}
                        className="text-primary-600 hover:text-primary-900 flex items-center justify-end"
                      >
                        <Eye className="w-4 h-4 mr-1" /> View
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
