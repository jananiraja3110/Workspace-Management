import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  Clock, Plus, Edit2, X, Loader2, ChevronLeft, ChevronRight, Calendar
} from 'lucide-react';
import { format, startOfWeek, addDays, subWeeks, addWeeks } from 'date-fns';

const shiftColors = {
  Morning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  Afternoon: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  Night: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  General: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
  Off: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-600',
};

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ShiftsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'hr';
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [shiftTypes, setShiftTypes] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [mySchedule, setMySchedule] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeForm, setTypeForm] = useState({ name: '', startTime: '09:00', endTime: '17:00', color: 'General' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [weekStart]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const weekEnd = format(addDays(weekStart, 6), 'yyyy-MM-dd');
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      const requests = [
        API.get('/shifts/types'),
        isAdmin ? API.get(`/shifts/schedule?start=${weekStartStr}&end=${weekEnd}`) : API.get(`/shifts/my?start=${weekStartStr}&end=${weekEnd}`),
      ];
      if (isAdmin) requests.push(API.get('/users?status=active'));
      const results = await Promise.all(requests);
      setShiftTypes(results[0].data.shiftTypes || []);
      if (isAdmin) {
        setSchedules(results[1].data.schedules || []);
        setEmployees(results[2].data.users || []);
      } else {
        setMySchedule(results[1].data.schedules || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingType) {
        await API.put(`/shifts/types/${editingType._id}`, typeForm);
        toast.success('Shift type updated');
      } else {
        await API.post('/shifts/types', typeForm);
        toast.success('Shift type created');
      }
      setShowTypeModal(false);
      setEditingType(null);
      setTypeForm({ name: '', startTime: '09:00', endTime: '17:00', color: 'General' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save shift type');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async (employeeId, dayIndex, shiftTypeId) => {
    try {
      const date = format(addDays(weekStart, dayIndex), 'yyyy-MM-dd');
      await API.post('/shifts/assign', { employee: employeeId, date, shiftType: shiftTypeId });
      toast.success('Shift assigned');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign shift');
    }
  };

  const getShiftForDay = (employeeId, dayIndex) => {
    const date = format(addDays(weekStart, dayIndex), 'yyyy-MM-dd');
    return schedules.find(s => {
      const sEmp = s.employee?._id || s.employee;
      const sDate = s.date ? format(new Date(s.date), 'yyyy-MM-dd') : '';
      return sEmp === employeeId && sDate === date;
    });
  };

  const getMyShiftForDay = (dayIndex) => {
    const date = format(addDays(weekStart, dayIndex), 'yyyy-MM-dd');
    return mySchedule.find(s => {
      const sDate = s.date ? format(new Date(s.date), 'yyyy-MM-dd') : '';
      return sDate === date;
    });
  };

  const weekDates = daysOfWeek.map((d, i) => ({
    name: d,
    date: format(addDays(weekStart, i), 'MMM dd')
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-7 h-7 text-indigo-600" /> Shifts
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {isAdmin ? 'Manage shift schedules' : 'View your shift schedule'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(subWeeks(weekStart, 1))}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 min-w-[180px] text-center">
            {format(weekStart, 'MMM dd')} - {format(addDays(weekStart, 6), 'MMM dd, yyyy')}
          </span>
          <button onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      </div>

      {isAdmin && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Shift Types</h3>
            <button onClick={() => { setEditingType(null); setTypeForm({ name: '', startTime: '09:00', endTime: '17:00', color: 'General' }); setShowTypeModal(true); }}
              className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              <Plus className="w-4 h-4" /> Add Type
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {shiftTypes.map(st => (
              <div key={st._id} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${shiftColors[st.color] || shiftColors.General}`}>
                <span>{st.name}</span>
                <span className="text-xs opacity-75">{st.startTime} - {st.endTime}</span>
                {isAdmin && (
                  <button onClick={() => { setEditingType(st); setTypeForm({ name: st.name, startTime: st.startTime, endTime: st.endTime, color: st.color || 'General' }); setShowTypeModal(true); }}
                    className="ml-1 hover:opacity-75">
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {shiftTypes.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No shift types defined</p>}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : isAdmin ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase sticky left-0 bg-slate-50 dark:bg-slate-800/50">Employee</th>
                  {weekDates.map(d => (
                    <th key={d.name} className="text-center px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      <div>{d.name}</div>
                      <div className="text-[10px] font-normal">{d.date}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {employees.map(emp => (
                  <tr key={emp._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-100 sticky left-0 bg-white dark:bg-slate-800 whitespace-nowrap">
                      {emp.name}
                    </td>
                    {daysOfWeek.map((_, i) => {
                      const shift = getShiftForDay(emp._id, i);
                      const shiftType = shift?.shiftType;
                      const colorKey = shiftType?.color || 'Off';
                      return (
                        <td key={i} className="px-2 py-2 text-center">
                          <select
                            value={shiftType?._id || ''}
                            onChange={e => handleAssign(emp._id, i, e.target.value)}
                            className={`w-full text-xs px-2 py-1.5 rounded-lg border font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${shiftColors[colorKey] || shiftColors.Off}`}
                          >
                            <option value="">Off</option>
                            {shiftTypes.map(st => <option key={st._id} value={st._id}>{st.name}</option>)}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500 dark:text-slate-400">No employees found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {weekDates.map((day, i) => {
            const shift = getMyShiftForDay(i);
            const shiftType = shift?.shiftType;
            const colorKey = shiftType?.color || 'Off';
            return (
              <div key={i} className={`rounded-xl border p-4 text-center ${shiftColors[colorKey] || shiftColors.Off}`}>
                <p className="text-xs font-semibold uppercase">{day.name}</p>
                <p className="text-xs mb-2">{day.date}</p>
                {shiftType ? (
                  <>
                    <p className="font-bold text-sm">{shiftType.name}</p>
                    <p className="text-xs mt-1">{shiftType.startTime} - {shiftType.endTime}</p>
                  </>
                ) : (
                  <p className="text-sm font-medium">Off</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {editingType ? 'Edit Shift Type' : 'Add Shift Type'}
              </h2>
              <button onClick={() => setShowTypeModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleTypeSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name *</label>
                <input type="text" required value={typeForm.name} onChange={e => setTypeForm({ ...typeForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start</label>
                  <input type="time" value={typeForm.startTime} onChange={e => setTypeForm({ ...typeForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End</label>
                  <input type="time" value={typeForm.endTime} onChange={e => setTypeForm({ ...typeForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Color</label>
                <select value={typeForm.color} onChange={e => setTypeForm({ ...typeForm, color: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                  {Object.keys(shiftColors).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowTypeModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 inline-flex items-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftsPage;
