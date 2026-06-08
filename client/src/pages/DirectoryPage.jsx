import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  Users, Search, Loader2, LayoutGrid, List, Mail, Phone, Building, User
} from 'lucide-react';

const DirectoryPage = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [filterDept, setFilterDept] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/users?status=active');
      const users = data.users || [];
      setEmployees(users);
      const depts = [...new Set(users.map(u => u.department).filter(Boolean))];
      setDepartments(depts);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load directory');
    } finally {
      setLoading(false);
    }
  };

  const filtered = employees.filter(emp => {
    const matchSearch = emp.name?.toLowerCase().includes(search.toLowerCase()) ||
      emp.email?.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeId?.toLowerCase().includes(search.toLowerCase());
    const matchDept = !filterDept || emp.department === filterDept;
    const matchRole = !filterRole || emp.role === filterRole;
    return matchSearch && matchDept && matchRole;
  });

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const initialsColor = (name) => {
    const colors = [
      'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
      'bg-purple-500', 'bg-cyan-500', 'bg-orange-500', 'bg-pink-500'
    ];
    const idx = (name || '').charCodeAt(0) % colors.length;
    return colors[idx];
  };

  const roleBadge = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      hr: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      developer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };
    return colors[role] || colors.employee;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Users className="w-7 h-7 text-indigo-600" /> Employee Directory
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Find and connect with team members</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search by name, email or ID..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
        </div>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
          className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="hr">HR</option>
          <option value="developer">Developer</option>
        </select>
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
          <button onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>
            <LayoutGrid className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          <button onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>
            <List className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">No employees found</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(emp => (
            <div key={emp._id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm text-center">
              <div className={`w-16 h-16 rounded-full ${initialsColor(emp.name)} flex items-center justify-center mx-auto mb-3`}>
                <span className="text-white text-lg font-bold">{getInitials(emp.name)}</span>
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">{emp.name}</h3>
              {emp.employeeId && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{emp.employeeId}</p>
              )}
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-2 ${roleBadge(emp.role)}`}>
                {emp.role}
              </span>
              <div className="mt-3 space-y-1 text-sm">
                {emp.department && (
                  <p className="text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1">
                    <Building className="w-3 h-3" /> {emp.department}
                  </p>
                )}
                {emp.designation && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{emp.designation}</p>
                )}
                {emp.email && (
                  <a href={`mailto:${emp.email}`} className="text-indigo-600 hover:underline flex items-center justify-center gap-1 text-xs">
                    <Mail className="w-3 h-3" /> {emp.email}
                  </a>
                )}
                {emp.phone && (
                  <p className="text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1 text-xs">
                    <Phone className="w-3 h-3" /> {emp.phone}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Developer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase hidden sm:table-cell">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase hidden md:table-cell">Department</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase hidden md:table-cell">Designation</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase hidden lg:table-cell">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase hidden lg:table-cell">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filtered.map(emp => (
                  <tr key={emp._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${initialsColor(emp.name)} flex items-center justify-center shrink-0`}>
                          <span className="text-white text-xs font-bold">{getInitials(emp.name)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-100">{emp.name}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleBadge(emp.role)}`}>{emp.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hidden sm:table-cell">{emp.employeeId || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hidden md:table-cell">{emp.department || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hidden md:table-cell">{emp.designation || '-'}</td>
                    <td className="px-4 py-3 text-sm hidden lg:table-cell">
                      {emp.email ? <a href={`mailto:${emp.email}`} className="text-indigo-600 hover:underline">{emp.email}</a> : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hidden lg:table-cell">{emp.phone || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectoryPage;
