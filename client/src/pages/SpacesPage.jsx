import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  Plus, Pencil, Trash2, Users, LayoutGrid, X, Check, Layers,
} from 'lucide-react';

const COLORS = [
  '#6366F1','#8B5CF6','#EC4899','#EF4444','#F97316',
  '#EAB308','#22C55E','#10B981','#06B6D4','#3B82F6',
];

const ColorDot = ({ color, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-6 h-6 rounded-full transition-all ${selected ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'}`}
    style={{ backgroundColor: color }}
  />
);

function SpaceModal({ space, users, onClose, onSave }) {
  const [name, setName]         = useState(space?.name || '');
  const [color, setColor]       = useState(space?.color || COLORS[0]);
  const [description, setDesc]  = useState(space?.description || '');
  const [members, setMembers]   = useState(space?.members?.map(m => m._id || m) || []);
  const [saving, setSaving]     = useState(false);

  const toggle = (uid) => setMembers(prev => prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Space name required');
    setSaving(true);
    try {
      await onSave({ name, color, description, members });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {space ? 'Edit Space' : 'Create Space'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Frontend Team"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <ColorDot key={c} color={c} selected={color === c} onClick={() => setColor(c)} />
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDesc(e.target.value)}
              placeholder="What is this space for?"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Members */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Members <span className="text-slate-400 font-normal">(optional)</span></label>
            <div className="max-h-36 overflow-y-auto space-y-1 border border-slate-200 dark:border-slate-600 rounded-xl p-2">
              {users.map(u => (
                <button
                  key={u._id}
                  type="button"
                  onClick={() => toggle(u._id)}
                  className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${members.includes(u._id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-500'}`}>
                    {members.includes(u._id) && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{u.name}</span>
                  <span className="text-xs text-slate-400 ml-auto">{u.role}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
              {saving ? 'Saving…' : space ? 'Save Changes' : 'Create Space'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const SpacesPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isAdminOrHR = isAdmin || user?.role === 'hr';

  const [spaces, setSpaces]   = useState([]);
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | 'create' | space object

  useEffect(() => {
    Promise.all([
      API.get('/spaces'),
      API.get('/users'),
    ]).then(([s, u]) => {
      setSpaces(s.data.spaces || []);
      setUsers(u.data.users || u.data || []);
    }).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (data) => {
    const { data: res } = await API.post('/spaces', data);
    setSpaces(prev => [...prev, res.space]);
    toast.success('Space created');
  };

  const handleEdit = async (data) => {
    const { data: res } = await API.put(`/spaces/${modal._id}`, data);
    setSpaces(prev => prev.map(s => s._id === modal._id ? res.space : s));
    toast.success('Space updated');
  };

  const handleDelete = async (space) => {
    if (!confirm(`Delete space "${space.name}"? Tasks will be unlinked but not deleted.`)) return;
    await API.delete(`/spaces/${space._id}`);
    setSpaces(prev => prev.filter(s => s._id !== space._id));
    toast.success('Space deleted');
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Spaces</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Organize tasks into separate workspaces per team or project</p>
        </div>
        {isAdminOrHR && (
          <button
            onClick={() => setModal('create')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> New Space
          </button>
        )}
      </div>

      {/* Grid */}
      {spaces.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <Layers className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No spaces yet</p>
          {isAdminOrHR && (
            <button onClick={() => setModal('create')} className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors">
              Create first space
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {spaces.map(space => (
            <div key={space._id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow">
              {/* Color bar */}
              <div className="h-1.5 w-full" style={{ backgroundColor: space.color }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: space.color + '20' }}>
                      <LayoutGrid className="w-5 h-5" style={{ color: space.color }} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{space.name}</h3>
                      {space.description && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{space.description}</p>
                      )}
                    </div>
                  </div>
                  {isAdminOrHR && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => setModal(space)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleDelete(space)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Members */}
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {space.members?.length
                      ? space.members.map(m => m.name || m).join(', ')
                      : 'All members'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <SpaceModal
          space={modal === 'create' ? null : modal}
          users={users}
          onClose={() => setModal(null)}
          onSave={modal === 'create' ? handleCreate : handleEdit}
        />
      )}
    </div>
  );
};

export default SpacesPage;
