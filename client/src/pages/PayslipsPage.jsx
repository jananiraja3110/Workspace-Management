import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  Banknote, Download, Upload, X, Loader2, DollarSign, ChevronDown
} from 'lucide-react';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

const PayslipsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'hr';
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    employee: '', month: new Date().getMonth() + 1, year: currentYear,
    basicPay: '', hra: '', allowances: '', deductions: '', netPay: ''
  });
  const [pdfFile, setPdfFile] = useState(null);

  useEffect(() => {
    fetchPayslips();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (isAdmin) fetchEmployees();
  }, []);

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedMonth) params.month = selectedMonth;
      if (selectedYear) params.year = selectedYear;
      const { data } = await API.get('/payslips/my', { params });
      setPayslips(data.payslips || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load payslips');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await API.get('/users?role=developer&status=active');
      setEmployees(data.users || []);
    } catch {
      // silent
    }
  };

  const handleDownload = async (payslip) => {
    try {
      const response = await API.get(`/payslips/${payslip._id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip-${payslip.month}-${payslip.year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    try {
      setUploading(true);
      const formData = new FormData();
      Object.entries(uploadForm).forEach(([k, v]) => formData.append(k, v));
      if (pdfFile) formData.append('pdf', pdfFile);
      await API.post('/payslips', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Payslip uploaded');
      setShowUploadModal(false);
      setPdfFile(null);
      setUploadForm({
        employee: '', month: new Date().getMonth() + 1, year: currentYear,
        basicPay: '', hra: '', allowances: '', deductions: '', netPay: ''
      });
      fetchPayslips();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload payslip');
    } finally {
      setUploading(false);
    }
  };

  const calcNet = () => {
    const b = parseFloat(uploadForm.basicPay) || 0;
    const h = parseFloat(uploadForm.hra) || 0;
    const a = parseFloat(uploadForm.allowances) || 0;
    const d = parseFloat(uploadForm.deductions) || 0;
    return (b + h + a - d).toFixed(2);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Banknote className="w-7 h-7 text-indigo-600" /> Payslips
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">View and download your salary slips</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
            <Upload className="w-4 h-4" /> Upload Payslip
          </button>
        )}
      </div>

      <div className="flex gap-4 flex-wrap">
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
          className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
          <option value="">All Months</option>
          {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
          className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
          <option value="">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : payslips.length === 0 ? (
        <div className="text-center py-20">
          <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">No payslips found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {payslips.map(slip => (
            <div key={slip._id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {months[(slip.month || 1) - 1]} {slip.year}
                </h3>
                <button onClick={() => handleDownload(slip)}
                  className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition text-indigo-600">
                  <Download className="w-5 h-5" />
                </button>
              </div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-4">
                ${parseFloat(slip.netPay || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Basic Pay</span>
                  <span>${parseFloat(slip.basicPay || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>HRA</span>
                  <span>${parseFloat(slip.hra || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Allowances</span>
                  <span>${parseFloat(slip.allowances || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-500 dark:text-red-400">
                  <span>Deductions</span>
                  <span>-${parseFloat(slip.deductions || 0).toLocaleString()}</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-semibold text-slate-800 dark:text-slate-100">
                  <span>Net Pay</span>
                  <span>${parseFloat(slip.netPay || 0).toLocaleString()}</span>
                </div>
              </div>
              {isAdmin && slip.employee && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">Employee: {slip.employee.name || slip.employee}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Upload Payslip</h2>
              <button onClick={() => setShowUploadModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Employee *</label>
                <select required value={uploadForm.employee} onChange={e => setUploadForm({ ...uploadForm, employee: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                  <option value="">Select employee</option>
                  {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name} ({emp.employeeId})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Month</label>
                  <select value={uploadForm.month} onChange={e => setUploadForm({ ...uploadForm, month: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Year</label>
                  <select value={uploadForm.year} onChange={e => setUploadForm({ ...uploadForm, year: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Basic Pay</label>
                  <input type="number" step="0.01" value={uploadForm.basicPay}
                    onChange={e => setUploadForm({ ...uploadForm, basicPay: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">HRA</label>
                  <input type="number" step="0.01" value={uploadForm.hra}
                    onChange={e => setUploadForm({ ...uploadForm, hra: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Allowances</label>
                  <input type="number" step="0.01" value={uploadForm.allowances}
                    onChange={e => setUploadForm({ ...uploadForm, allowances: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Deductions</label>
                  <input type="number" step="0.01" value={uploadForm.deductions}
                    onChange={e => setUploadForm({ ...uploadForm, deductions: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
                <span className="text-sm text-slate-500 dark:text-slate-400">Net Pay: </span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">${calcNet()}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">PDF File</label>
                <input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-600 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 dark:file:bg-indigo-900/30 file:text-indigo-600 hover:file:bg-indigo-100" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                  Cancel
                </button>
                <button type="submit" disabled={uploading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 inline-flex items-center gap-2">
                  {uploading && <Loader2 className="w-4 h-4 animate-spin" />} Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayslipsPage;
