import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  Settings, Save, Plus, Trash2, Loader2, Building, Clock, Calendar, Layers, Award
} from 'lucide-react';

const SettingsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  const [company, setCompany] = useState({ name: '', address: '', email: '', phone: '' });
  const [workHours, setWorkHours] = useState({ startTime: '09:00', endTime: '18:00', lateThreshold: 15 });
  const [leaveDefaults, setLeaveDefaults] = useState({ casual: 12, sick: 12, earned: 15 });
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [newDept, setNewDept] = useState('');
  const [newDesig, setNewDesig] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/settings');
      const s = data.settings || {};
      if (s.company) setCompany(s.company);
      if (s.workHours) setWorkHours(s.workHours);
      if (s.leaveDefaults) setLeaveDefaults(s.leaveDefaults);
      if (s.departments) setDepartments(s.departments);
      if (s.designations) setDesignations(s.designations);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSection = async (section, data) => {
    try {
      setSaving(prev => ({ ...prev, [section]: true }));
      await API.put('/settings', { [section]: data });
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(prev => ({ ...prev, [section]: false }));
    }
  };

  const addDepartment = () => {
    if (!newDept.trim()) return;
    if (departments.includes(newDept.trim())) { toast.error('Already exists'); return; }
    const updated = [...departments, newDept.trim()];
    setDepartments(updated);
    setNewDept('');
    saveSection('departments', updated);
  };

  const removeDepartment = (dept) => {
    const updated = departments.filter(d => d !== dept);
    setDepartments(updated);
    saveSection('departments', updated);
  };

  const addDesignation = () => {
    if (!newDesig.trim()) return;
    if (designations.includes(newDesig.trim())) { toast.error('Already exists'); return; }
    const updated = [...designations, newDesig.trim()];
    setDesignations(updated);
    setNewDesig('');
    saveSection('designations', updated);
  };

  const removeDesignation = (desig) => {
    const updated = designations.filter(d => d !== desig);
    setDesignations(updated);
    saveSection('designations', updated);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const inputCls = "w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Settings className="w-7 h-7 text-indigo-600" /> Settings
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Configure company and system settings</p>
      </div>

      {/* Company Info */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
          <Building className="w-5 h-5 text-indigo-500" /> Company Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company Name</label>
            <input type="text" value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <input type="email" value={company.email || ''} onChange={e => setCompany({ ...company, email: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
            <input type="text" value={company.phone || ''} onChange={e => setCompany({ ...company, phone: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
            <input type="text" value={company.address || ''} onChange={e => setCompany({ ...company, address: e.target.value })} className={inputCls} />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={() => saveSection('company', company)} disabled={saving.company}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
            {saving.company ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </button>
        </div>
      </div>

      {/* Work Hours */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-indigo-500" /> Work Hours
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
            <input type="time" value={workHours.startTime} onChange={e => setWorkHours({ ...workHours, startTime: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Time</label>
            <input type="time" value={workHours.endTime} onChange={e => setWorkHours({ ...workHours, endTime: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Late Threshold (min)</label>
            <input type="number" value={workHours.lateThreshold} onChange={e => setWorkHours({ ...workHours, lateThreshold: parseInt(e.target.value) || 0 })} className={inputCls} />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={() => saveSection('workHours', workHours)} disabled={saving.workHours}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
            {saving.workHours ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </button>
        </div>
      </div>

      {/* Leave Defaults */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-indigo-500" /> Leave Defaults (per year)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Casual Leave</label>
            <input type="number" value={leaveDefaults.casual} onChange={e => setLeaveDefaults({ ...leaveDefaults, casual: parseInt(e.target.value) || 0 })} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sick Leave</label>
            <input type="number" value={leaveDefaults.sick} onChange={e => setLeaveDefaults({ ...leaveDefaults, sick: parseInt(e.target.value) || 0 })} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Earned Leave</label>
            <input type="number" value={leaveDefaults.earned} onChange={e => setLeaveDefaults({ ...leaveDefaults, earned: parseInt(e.target.value) || 0 })} className={inputCls} />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={() => saveSection('leaveDefaults', leaveDefaults)} disabled={saving.leaveDefaults}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
            {saving.leaveDefaults ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </button>
        </div>
      </div>

      {/* Departments */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-indigo-500" /> Departments
        </h3>
        <div className="flex gap-2 mb-4">
          <input type="text" value={newDept} onChange={e => setNewDept(e.target.value)}
            placeholder="New department name"
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDepartment())}
            className={inputCls} />
          <button onClick={addDepartment}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shrink-0">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {departments.map(dept => (
            <div key={dept} className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200">
              <span>{dept}</span>
              <button onClick={() => removeDepartment(dept)} className="text-red-500 hover:text-red-700">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {departments.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No departments added</p>}
        </div>
      </div>

      {/* Designations */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-indigo-500" /> Designations
        </h3>
        <div className="flex gap-2 mb-4">
          <input type="text" value={newDesig} onChange={e => setNewDesig(e.target.value)}
            placeholder="New designation title"
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDesignation())}
            className={inputCls} />
          <button onClick={addDesignation}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shrink-0">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {designations.map(desig => (
            <div key={desig} className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200">
              <span>{desig}</span>
              <button onClick={() => removeDesignation(desig)} className="text-red-500 hover:text-red-700">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {designations.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No designations added</p>}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
