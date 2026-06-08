import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import {
  DoorOpen, Plus, X, Loader2, MapPin, Users, Clock,
  Calendar, Trash2
} from 'lucide-react';
import { format } from 'date-fns';

const RoomBookingPage = () => {
  const [rooms, setRooms] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [todayBookings, setTodayBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('rooms');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    room: '', date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00', endTime: '10:00', title: '', attendees: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [roomsRes, bookingsRes, todayRes] = await Promise.all([
        API.get('/rooms'),
        API.get('/bookings/my'),
        API.get('/bookings/today'),
      ]);
      setRooms(roomsRes.data.rooms || []);
      setMyBookings(bookingsRes.data.bookings || []);
      setTodayBookings(todayRes.data.bookings || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await API.post('/bookings', {
        ...form,
        attendees: form.attendees.split(',').map(a => a.trim()).filter(Boolean)
      });
      toast.success('Room booked successfully');
      setShowModal(false);
      setForm({ room: '', date: format(new Date(), 'yyyy-MM-dd'), startTime: '09:00', endTime: '10:00', title: '', attendees: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to book room');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await API.patch(`/bookings/${id}/cancel`);
      toast.success('Booking cancelled');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  const openBookModal = (roomId = '') => {
    setForm({ ...form, room: roomId });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <DoorOpen className="w-7 h-7 text-indigo-600" /> Conference Room
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Reserve conference rooms and meeting spaces</p>
        </div>
        <button onClick={() => openBookModal()} className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
          <Plus className="w-4 h-4" /> Book Room
        </button>
      </div>

      <div className="flex gap-2">
        {['rooms', 'my', 'today'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
              activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
            {tab === 'my' ? 'My Bookings' : tab === 'today' ? "Today's Bookings" : 'Rooms'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : activeTab === 'rooms' ? (
        rooms.length === 0 ? (
          <div className="text-center py-20">
            <DoorOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No rooms available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rooms.map(room => (
              <div key={room._id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">{room.name}</h3>
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>Capacity: {room.capacity || '-'}</span>
                  </div>
                  {room.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{room.location}</span>
                    </div>
                  )}
                </div>
                {room.amenities?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {room.amenities.map(a => (
                      <span key={a} className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {a}
                      </span>
                    ))}
                  </div>
                )}
                <button onClick={() => openBookModal(room._id)}
                  className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
                  Book
                </button>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'my' ? (
        myBookings.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No bookings yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myBookings.map(b => (
              <div key={b._id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-100">{b.title || 'Meeting'}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {b.room?.name || 'Room'} - {b.date ? format(new Date(b.date), 'MMM dd, yyyy') : ''}{' '}
                    {b.startTime} - {b.endTime}
                  </p>
                </div>
                <button onClick={() => handleCancel(b._id)}
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )
      ) : (
        todayBookings.length === 0 ? (
          <div className="text-center py-20">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No bookings today</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayBookings.map(b => (
              <div key={b._id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-100">{b.title || 'Meeting'}</h4>
                  <span className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">{b.startTime} - {b.endTime}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{b.room?.name || 'Room'} - Booked by {b.user?.name || '-'}</p>
              </div>
            ))}
          </div>
        )
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Book Room</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleBook} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Room *</label>
                <select required value={form.room} onChange={e => setForm({ ...form, room: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                  <option value="">Select room</option>
                  {rooms.map(r => <option key={r._id} value={r._id}>{r.name} (Cap: {r.capacity})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Meeting title"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date *</label>
                <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
                  <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Time</label>
                  <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Attendees</label>
                <input type="text" value={form.attendees} onChange={e => setForm({ ...form, attendees: e.target.value })}
                  placeholder="Comma-separated names or emails"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 inline-flex items-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomBookingPage;
