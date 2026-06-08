import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmDialog from '../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import {
  Plus,
  Calendar,
  Trash2,
  MapPin,
  Tag,
  Clock,
  Eye,
} from 'lucide-react';

import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const EVENT_TYPES = [
  { value: 'holiday', label: 'Holiday', color: '#EF4444' },
  { value: 'meeting', label: 'Meeting', color: '#22C55E' },
  { value: 'deadline', label: 'Deadline', color: '#3B82F6' },
  { value: 'leave', label: 'Leave', color: '#EAB308' },
  { value: 'other', label: 'Other', color: '#6B7280' },
];

const getEventColor = (type) => {
  const found = EVENT_TYPES.find((t) => t.value === type);
  return found?.color || '#6B7280';
};

const CalendarPage = () => {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'hr';

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month');

  const emptyForm = {
    title: '',
    description: '',
    date: '',
    endDate: '',
    type: 'meeting',
    visibility: 'public',
  };
  const [form, setForm] = useState(emptyForm);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/events');
      setEvents(data.events || data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const calendarEvents = useMemo(
    () =>
      events.map((evt) => ({
        ...evt,
        id: evt._id,
        title: evt.title,
        start: new Date(evt.date || evt.start || evt.startDate),
        end: new Date(
          evt.endDate || evt.end || evt.date || evt.startDate
        ),
        allDay: evt.allDay !== undefined ? evt.allDay : true,
      })),
    [events]
  );

  const eventStyleGetter = useCallback((event) => {
    const color = getEventColor(event.type);
    return {
      style: {
        backgroundColor: color,
        borderColor: color,
        color: '#fff',
        borderRadius: '6px',
        border: 'none',
        fontSize: '0.8rem',
        padding: '2px 6px',
      },
    };
  }, []);

  const handleSelectEvent = useCallback((event) => {
    setShowDetail(event);
  }, []);

  const handleSelectSlot = useCallback(
    ({ start }) => {
      if (!isAdminOrManager) return;
      setForm({
        ...emptyForm,
        date: format(start, 'yyyy-MM-dd'),
        endDate: format(start, 'yyyy-MM-dd'),
      });
      setShowModal(true);
    },
    [isAdminOrManager]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Event title is required');
      return;
    }
    if (!form.date) {
      toast.error('Event date is required');
      return;
    }
    setSubmitting(true);
    try {
      await API.post('/events', form);
      toast.success('Event created');
      setShowModal(false);
      setForm(emptyForm);
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await API.delete(`/events/${deleteTarget._id || deleteTarget.id}`);
      toast.success('Event deleted');
      setDeleteTarget(null);
      setShowDetail(null);
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Calendar</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            View events, holidays, and deadlines
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden lg:flex items-center gap-3">
            {EVENT_TYPES.map((t) => (
              <span
                key={t.value}
                className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
                {t.label}
              </span>
            ))}
          </div>
          {isAdminOrManager && (
            <Button
              onClick={() => {
                setForm(emptyForm);
                setShowModal(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add Event
            </Button>
          )}
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
        <style>{`
          .rbc-calendar { font-family: inherit; }
          .rbc-header { padding: 8px 4px; font-weight: 600; font-size: 0.8rem; color: #475569; background: #F8FAFC; border-color: #E2E8F0; }
          .rbc-today { background-color: #EEF2FF; }
          .rbc-off-range-bg { background-color: #FAFAFA; }
          .rbc-toolbar button { color: #475569; border-color: #E2E8F0; border-radius: 0.5rem; padding: 6px 14px; font-size: 0.875rem; font-weight: 500; }
          .rbc-toolbar button:hover { background-color: #F1F5F9; color: #1E293B; }
          .rbc-toolbar button.rbc-active { background-color: #4F46E5; color: white; border-color: #4F46E5; }
          .rbc-toolbar button.rbc-active:hover { background-color: #4338CA; }
          .rbc-month-view, .rbc-time-view { border-color: #E2E8F0; border-radius: 0.5rem; overflow: hidden; }
          .rbc-day-bg + .rbc-day-bg, .rbc-month-row + .rbc-month-row { border-color: #E2E8F0; }
          .rbc-date-cell { padding: 4px 8px; font-size: 0.8rem; color: #64748B; }
          .rbc-event { cursor: pointer; }
          .rbc-event:focus { outline: 2px solid #4F46E5; outline-offset: 2px; }
          .rbc-show-more { color: #4F46E5; font-weight: 500; font-size: 0.75rem; }
        `}</style>
        <BigCalendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable={isAdminOrManager}
          date={currentDate}
          view={currentView}
          onNavigate={setCurrentDate}
          onView={setCurrentView}
          views={['month', 'week', 'day']}
          popup
          tooltipAccessor={(event) =>
            `${event.title}${event.type ? ` (${event.type})` : ''}`
          }
        />
      </div>

      {/* Mobile Legend */}
      <div className="lg:hidden flex flex-wrap items-center gap-3 mt-4 justify-center">
        {EVENT_TYPES.map((t) => (
          <span
            key={t.value}
            className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: t.color }}
            />
            {t.label}
          </span>
        ))}
      </div>

      {/* Add Event Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Event"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            placeholder="Event title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
              rows={3}
              placeholder="Event description..."
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Type
              </label>
              <select
                className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:text-slate-100"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Visibility
              </label>
              <select
                className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:text-slate-100"
                value={form.visibility}
                onChange={(e) =>
                  setForm({ ...form, visibility: e.target.value })
                }
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="team">Team Only</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create Event
            </Button>
          </div>
        </form>
      </Modal>

      {/* Event Detail Modal */}
      <Modal
        isOpen={!!showDetail}
        onClose={() => setShowDetail(null)}
        title="Event Details"
        size="sm"
      >
        {showDetail && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {showDetail.title}
              </h3>
              {showDetail.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {showDetail.description}
                </p>
              )}
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Clock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                <span>
                  {format(new Date(showDetail.start), 'MMM dd, yyyy')}
                  {showDetail.endDate &&
                    showDetail.endDate !== showDetail.date &&
                    ` - ${format(new Date(showDetail.end), 'MMM dd, yyyy')}`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Tag className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: getEventColor(showDetail.type),
                    }}
                  />
                  <span className="capitalize">
                    {showDetail.type || 'Event'}
                  </span>
                </span>
              </div>
              {showDetail.visibility && (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Eye className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <span className="capitalize">{showDetail.visibility}</span>
                </div>
              )}
            </div>

            {isAdminOrManager && (
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetail(null)}
                >
                  Close
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setDeleteTarget(showDetail);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Event"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        confirmText="Delete"
      />
    </div>
  );
};

export default CalendarPage;
