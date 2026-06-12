import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  Megaphone, Plus, Pin, PinOff, Edit2, Trash2, X, AlertTriangle, Loader2, Clock
} from 'lucide-react';
import { format } from 'date-fns';

const categoryColors = {
  General: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Event: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Policy: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Update: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const AnnouncementsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'hr';
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: '', content: '', category: 'General', visibility: 'all'
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/announcements');
      setAnnouncements(data.announcements || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ title: '', content: '', category: 'General', visibility: 'all' });
    setShowModal(true);
  };

  const openEdit = (ann) => {
    setEditingId(ann._id);
    setForm({
      title: ann.title, content: ann.content,
      category: ann.category || 'General', visibility: ann.visibility || 'all'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await API.put(`/announcements/${editingId}`, form);
        toast.success('Announcement updated');
      } else {
        await API.post('/announcements', form);
        toast.success('Announcement created');
      }
      setShowModal(false);
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save announcement');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await API.delete(`/announcements/${id}`);
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const togglePin = async (id, currentPinned) => {
    try {
      await API.patch(`/announcements/${id}/pin`);
      toast.success(currentPinned ? 'Unpinned' : 'Pinned');
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const EMOJIS = ['👍', '❤️', '😂', '🎉', '😮'];

  const handleReact = async (annId, emoji) => {
    try {
      const { data } = await API.patch(`/announcements/${annId}/react`, { emoji });
      setAnnouncements(prev => prev.map(a => a._id === annId ? data.announcement : a));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to react');
    }
  };

  const sorted = [...announcements].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-indigo-600" /> Announcements
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Company-wide announcements and updates</p>
        </div>
        {isAdmin && (
          <button onClick={openAdd} className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
            <Plus className="w-4 h-4" /> New Announcement
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20">
          <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map(ann => (
            <div key={ann._id}
              className={`bg-white dark:bg-slate-800 rounded-xl border p-5 shadow-sm ${
                ann.category === 'Urgent' ? 'border-red-400 dark:border-red-600' : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {ann.pinned && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                        <Pin className="w-3 h-3" /> Pinned
                      </span>
                    )}
                    {ann.category === 'Urgent' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[ann.category] || categoryColors.General}`}>
                      {ann.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{ann.title}</h3>
                  <p className="text-slate-600 dark:text-slate-300 mt-2 whitespace-pre-wrap">{ann.content}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium">{ann.author?.name || 'Admin'}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {ann.createdAt ? new Date(ann.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {EMOJIS.map(emoji => {
                      const reaction = (ann.reactions || []).find(r => r.emoji === emoji);
                      const count = reaction?.users?.length || 0;
                      const reacted = reaction?.users?.some(u => (u._id || u)?.toString() === user?._id?.toString());
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleReact(ann._id, emoji)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm border transition
                            ${reacted
                              ? 'bg-indigo-100 border-indigo-400 dark:bg-indigo-900/40 dark:border-indigo-500'
                              : 'bg-slate-100 border-slate-200 dark:bg-slate-700 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
                            }`}
                        >
                          {emoji}{count > 0 && <span className="text-xs text-slate-600 dark:text-slate-300">{count}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => togglePin(ann._id, ann.pinned)}
                      className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition text-amber-600"
                      title={ann.pinned ? 'Unpin' : 'Pin'}>
                      {ann.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEdit(ann)}
                      className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition text-blue-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(ann._id)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {editingId ? 'Edit Announcement' : 'New Announcement'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title *</label>
                <input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Content *</label>
                <textarea required value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={5}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    {Object.keys(categoryColors).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Visibility</label>
                  <select value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    <option value="all">All</option>
                    <option value="department">Department</option>
                    <option value="hr">HR Only</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                  {editingId ? 'Update' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementsPage;
