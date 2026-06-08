import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  Shield, Plus, Search, Eye, EyeOff, Copy, Edit2, Trash2, X, Globe, Lock,
  Key, Loader2
} from 'lucide-react';

const categories = ['All', 'Work', 'Personal', 'Social', 'Banking', 'Other'];

const VaultPage = () => {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [form, setForm] = useState({
    title: '', url: '', username: '', password: '', notes: '', category: 'Work'
  });

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/vault');
      setCredentials(data.credentials || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load vault');
    } finally {
      setLoading(false);
    }
  };

  const filtered = credentials.filter(c => {
    const matchTab = activeTab === 'All' || c.category === activeTab;
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const togglePassword = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ title: '', url: '', username: '', password: '', notes: '', category: 'Work' });
    setShowModal(true);
  };

  const openEdit = (cred) => {
    setEditingId(cred._id);
    setForm({
      title: cred.title, url: cred.url || '', username: cred.username,
      password: cred.password, notes: cred.notes || '', category: cred.category
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await API.put(`/vault/${editingId}`, form);
        toast.success('Credential updated');
      } else {
        await API.post('/vault', form);
        toast.success('Credential added');
      }
      setShowModal(false);
      fetchCredentials();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save credential');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this credential?')) return;
    try {
      await API.delete(`/vault/${id}`);
      toast.success('Credential deleted');
      fetchCredentials();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const [showFormPassword, setShowFormPassword] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Shield className="w-7 h-7 text-indigo-600" /> Personal Vault
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Securely store your credentials</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
          <Plus className="w-4 h-4" /> Add Credential
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" placeholder="Search credentials..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveTab(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              activeTab === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >{cat}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Key className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">No credentials found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(cred => (
            <div key={cred._id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">{cred.title}</h3>
                  {cred.url && (
                    <a href={cred.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-indigo-500 hover:underline flex items-center gap-1 mt-1">
                      <Globe className="w-3 h-3" /> {cred.url}
                    </a>
                  )}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium">
                  {cred.category}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Username</p>
                    <p className="text-sm font-mono text-slate-700 dark:text-slate-200">{cred.username}</p>
                  </div>
                  <button onClick={() => copyToClipboard(cred.username)}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition">
                    <Copy className="w-4 h-4 text-slate-500" />
                  </button>
                </div>

                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Password</p>
                    <p className="text-sm font-mono text-slate-700 dark:text-slate-200">
                      {visiblePasswords[cred._id] ? cred.password : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => togglePassword(cred._id)}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition">
                      {visiblePasswords[cred._id] ? <EyeOff className="w-4 h-4 text-slate-500" /> : <Eye className="w-4 h-4 text-slate-500" />}
                    </button>
                    <button onClick={() => copyToClipboard(cred.password)}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition">
                      <Copy className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                </div>
              </div>

              {cred.notes && (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">{cred.notes}</p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button onClick={() => openEdit(cred)}
                  className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition text-blue-600">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(cred._id)}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {editingId ? 'Edit Credential' : 'Add Credential'}
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
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL</label>
                <input type="text" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Username *</label>
                <input type="text" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password *</label>
                <div className="relative">
                  <input type={showFormPassword ? 'text' : 'password'} required value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                  <button type="button" onClick={() => setShowFormPassword(!showFormPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded">
                    {showFormPassword ? <EyeOff className="w-4 h-4 text-slate-500" /> : <Eye className="w-4 h-4 text-slate-500" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                  {categories.filter(c => c !== 'All').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                  Cancel
                </button>
                <button type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                  {editingId ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VaultPage;
