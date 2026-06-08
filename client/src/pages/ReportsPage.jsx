import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  BarChart3, Download, Loader2, FileSpreadsheet, Calendar
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';

const reportTypes = [
  { key: 'attendance', label: 'Attendance', chartType: 'bar' },
  { key: 'leave', label: 'Leave', chartType: 'pie' },
  { key: 'tasks', label: 'Tasks', chartType: 'bar' },
  { key: 'expenses', label: 'Expenses', chartType: 'line' },
  { key: 'projects', label: 'Projects', chartType: 'bar' },
  { key: 'employees', label: 'Employees', chartType: 'pie' },
];

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

const ReportsPage = () => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('attendance');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [chartData, setChartData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [tableHeaders, setTableHeaders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [reportType, startDate, endDate]);

  const transformData = (type, raw) => {
    const report = raw.report || raw.data || [];
    let chart = [], table = [], headers = [];

    if (type === 'attendance') {
      chart = (Array.isArray(report) ? report : []).map(r => ({
        name: r.department || r._id || 'Unknown',
        value: r.total || 0,
      }));
      const detailed = raw.detailed || [];
      headers = ['Employee ID', 'Name', 'Email', 'Department', 'Designation', 'Date', 'Check In', 'Check Out', 'Hours', 'Status'];
      table = detailed.map(r => ({
        'Employee ID': r.employeeId || '-',
        Name: r.name || '-',
        Email: r.email || '-',
        Department: r.department || '-',
        Designation: r.designation || '-',
        Date: r.date || '-',
        'Check In': r.checkIn || '-',
        'Check Out': r.checkOut || '-',
        Hours: r.totalHours || '-',
        Status: r.status || '-',
      }));
    } else if (type === 'leave') {
      const byType = raw.byType || [];
      chart = (Array.isArray(byType) ? byType : []).map(r => ({
        name: r._id || r.leaveType || 'Unknown',
        value: r.count || r.totalDays || 0,
      }));
      const detailed = raw.detailed || [];
      headers = ['Employee ID', 'Name', 'Email', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Reason', 'Status', 'Reviewed By'];
      table = detailed.map(r => ({
        'Employee ID': r.employeeId || '-',
        Name: r.name || '-',
        Email: r.email || '-',
        Department: r.department || '-',
        'Leave Type': r.leaveType || '-',
        'Start Date': r.startDate || '-',
        'End Date': r.endDate || '-',
        Days: r.totalDays || 0,
        Reason: r.reason || '-',
        Status: r.status || '-',
        'Reviewed By': r.reviewedBy || '-',
      }));
    } else if (type === 'tasks') {
      const byStatus = raw.byStatus || report;
      chart = (Array.isArray(byStatus) ? byStatus : []).map(r => ({
        name: r._id || r.status || 'Unknown',
        value: r.count || 0,
      }));
      headers = ['Status', 'Count'];
      table = (Array.isArray(byStatus) ? byStatus : []).map(r => ({
        Status: r._id || r.status || '-',
        Count: r.count || 0,
      }));
    } else if (type === 'expenses') {
      const byCategory = raw.byCategory || report;
      chart = (Array.isArray(byCategory) ? byCategory : []).map(r => ({
        name: r._id || r.category || 'Unknown',
        value: r.total || r.amount || 0,
      }));
      headers = ['Category', 'Count', 'Total Amount'];
      table = (Array.isArray(byCategory) ? byCategory : []).map(r => ({
        Category: r._id || r.category || '-',
        Count: r.count || 0,
        'Total Amount': r.total || r.amount || 0,
      }));
    } else if (type === 'projects') {
      chart = (Array.isArray(report) ? report : []).map(r => ({
        name: r.name || r._id || 'Unknown',
        value: r.taskCount || r.total || 0,
      }));
      headers = ['Project', 'Status', 'Tasks', 'Members'];
      table = (Array.isArray(report) ? report : []).map(r => ({
        Project: r.name || r._id || '-',
        Status: r.status || '-',
        Tasks: r.taskCount || 0,
        Members: r.memberCount || r.members?.length || 0,
      }));
    } else if (type === 'employees') {
      const byDept = raw.byDepartment || report;
      chart = (Array.isArray(byDept) ? byDept : []).map(r => ({
        name: r._id || r.department || 'Unknown',
        value: r.count || 0,
      }));
      headers = ['Department', 'Count'];
      table = (Array.isArray(byDept) ? byDept : []).map(r => ({
        Department: r._id || r.department || '-',
        Count: r.count || 0,
      }));
    }

    return { chart, table, headers };
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const { data } = await API.get(`/reports/${reportType}?startDate=${startDate}&endDate=${endDate}`);
      const { chart, table, headers } = transformData(reportType, data);
      setChartData(chart);
      setTableData(table);
      setTableHeaders(headers);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load report');
      setChartData([]);
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (tableData.length === 0) {
      toast.error('No data to export');
      return;
    }
    const headers = tableHeaders.length > 0 ? tableHeaders : Object.keys(tableData[0]);
    const csvRows = [
      headers.join(','),
      ...tableData.map(row => headers.map(h => {
        const val = row[h] ?? '';
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
      }).join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reportType}-report-${startDate}-${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const currentType = reportTypes.find(r => r.key === reportType);

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
          No chart data available
        </div>
      );
    }

    const chartType = currentType?.chartType || 'bar';

    if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%"
              outerRadius={120} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
            {chartData[0]?.value2 !== undefined && (
              <Line type="monotone" dataKey="value2" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
          {chartData[0]?.value2 !== undefined && (
            <Bar dataKey="value2" fill="#22c55e" radius={[4, 4, 0, 0]} />
          )}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" /> Reports
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Generate and export analytics reports</p>
        </div>
        <button onClick={exportCSV}
          className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Report Type</label>
            <select value={reportType} onChange={e => setReportType(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
              {reportTypes.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">
              {currentType?.label} Report
            </h3>
            {renderChart()}
          </div>

          {tableData.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      {(tableHeaders.length > 0 ? tableHeaders : Object.keys(tableData[0])).map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {tableData.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                        {(tableHeaders.length > 0 ? tableHeaders : Object.keys(row)).map(h => (
                          <td key={h} className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                            {row[h] ?? '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsPage;
