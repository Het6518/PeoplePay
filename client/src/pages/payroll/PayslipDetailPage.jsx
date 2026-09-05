import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, User, Building, Briefcase, Calendar, CheckCircle } from 'lucide-react';
import { payrollApi } from '../../services/apiServices';
import { formatINR, formatDate } from '../../utils/formatters';

export default function PayslipDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payslip, setPayslip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchPayslip = async () => {
      try {
        const data = await payrollApi.getPayslip(id);
        setPayslip(data);
      } catch (error) {
        console.error('Failed to fetch payslip', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPayslip();
  }, [id]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await payrollApi.downloadPDF(id);
      // Actual implementation might involve receiving a blob and triggering download
    } catch (error) {
      console.error('Download failed', error);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!payslip) {
    return <div className="p-8 text-center text-red-500">Payslip not found</div>;
  }

  const earnings = payslip.rules?.filter(r => r.category === 'BASIC' || r.category === 'ALLOWANCE') || [];
  const deductions = payslip.rules?.filter(r => r.category === 'DEDUCTION') || [];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Action Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 font-medium"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </button>
        <div className="flex items-center space-x-4">
          <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full flex items-center">
            <CheckCircle className="w-4 h-4 mr-1" /> {payslip.status}
          </span>
          <button 
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {downloading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> : <Download className="w-4 h-4 mr-2" />}
            Download PDF
          </button>
        </div>
      </div>

      {/* Payslip Content */}
      <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200" id="payslip-document">
        <div className="text-center mb-8 pb-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-wider">PAYSLIP</h1>
          <p className="text-gray-500 mt-1 font-medium">{payslip.payrunName}</p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Employee Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Employee Details</h3>
            <div className="flex items-center text-gray-800">
              <User className="w-4 h-4 mr-3 text-gray-400" />
              <span className="font-medium text-lg">{payslip.employeeName}</span>
              <span className="ml-2 text-sm text-gray-500">({payslip.employeeCode})</span>
            </div>
            <div className="flex items-center text-gray-600">
              <Building className="w-4 h-4 mr-3 text-gray-400" />
              {payslip.department}
            </div>
            <div className="flex items-center text-gray-600">
              <Briefcase className="w-4 h-4 mr-3 text-gray-400" />
              {payslip.jobPosition}
            </div>
          </div>

          {/* Payroll Info */}
          <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Payroll Details</h3>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 flex items-center"><Calendar className="w-4 h-4 mr-2 text-gray-400"/> Period:</span>
              <span className="font-medium text-gray-800">{formatDate(payslip.periodStart)} to {formatDate(payslip.periodEnd)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 flex items-center"><FileText className="w-4 h-4 mr-2 text-gray-400"/> Structure:</span>
              <span className="font-medium text-gray-800">{payslip.structureName}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-gray-400"/> Worked Days:</span>
              <span className="font-medium text-gray-800">{payslip.workedDays} Days</span>
            </div>
          </div>
        </div>

        {/* Salary Details Table */}
        <div className="mb-8">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-200">
                <th className="py-3 px-4 font-semibold text-gray-700 w-1/2">Description</th>
                <th className="py-3 px-4 font-semibold text-gray-700 w-1/4">Code</th>
                <th className="py-3 px-4 font-semibold text-gray-700 text-right w-1/4">Amount</th>
              </tr>
            </thead>
            <tbody>
              {/* Earnings Section */}
              <tr>
                <td colSpan="3" className="py-3 px-4 text-sm font-bold text-gray-500 uppercase bg-gray-50/50">Earnings</td>
              </tr>
              {earnings.map((rule, idx) => (
                <tr key={idx} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 px-4 text-gray-800">{rule.name}</td>
                  <td className="py-3 px-4 text-gray-500 text-sm font-mono">{rule.code}</td>
                  <td className="py-3 px-4 text-gray-800 text-right font-medium">{formatINR(rule.amount)}</td>
                </tr>
              ))}
              <tr className="border-y-2 border-gray-200 bg-gray-50/30">
                <td colSpan="2" className="py-3 px-4 font-bold text-gray-900">Gross Salary</td>
                <td className="py-3 px-4 font-bold text-gray-900 text-right">{formatINR(payslip.gross)}</td>
              </tr>

              {/* Deductions Section */}
              <tr>
                <td colSpan="3" className="py-3 px-4 text-sm font-bold text-gray-500 uppercase bg-gray-50/50 mt-4">Deductions</td>
              </tr>
              {deductions.map((rule, idx) => (
                <tr key={idx} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 px-4 text-gray-800">{rule.name}</td>
                  <td className="py-3 px-4 text-gray-500 text-sm font-mono">{rule.code}</td>
                  <td className="py-3 px-4 text-red-600 text-right font-medium">-{formatINR(rule.amount)}</td>
                </tr>
              ))}
              <tr className="border-y border-gray-200 bg-gray-50/30">
                <td colSpan="2" className="py-3 px-4 font-semibold text-gray-700">Total Deductions</td>
                <td className="py-3 px-4 font-semibold text-red-600 text-right">-{formatINR(payslip.deductions)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Net Salary Highlights */}
        <div className="flex justify-end mt-8">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-6 min-w-[300px]">
            <p className="text-sm font-semibold text-emerald-800 uppercase tracking-wide mb-1">Net Pay</p>
            <p className="text-4xl font-bold text-emerald-600">{formatINR(payslip.net)}</p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-400">
          <p>This is a computer-generated document and does not require a signature.</p>
        </div>
      </div>
    </div>
  );
}
