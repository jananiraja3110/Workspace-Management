import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronRight, Plus, MoreHorizontal, Trash2, Pencil, Layers } from 'lucide-react';
import API from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

export default function SpaceTree({ collapsed }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const isAdminOrHR = isAdmin || user?.role === 'hr';

  const [spaces, setSpaces] = useState([]);
  const [openIds, setOpenIds] = useState(new Set());
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [menuId, setMenuId] = useState(null);

  useEffect(() => {
    API.get('/spaces').then(r => {
      const list = r.data.spaces || [];
      setSpaces(list);
      if (list.length > 0) setOpenIds(new Set([list[0]._id]));
    }).catch(() => {});
  }, []);

  function toggle(id) {
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleCreate(e) {
    if (e.key !== 'Enter' && e.type !== 'blur') return;
    const name = newName.trim();
    if (!name) { setAdding(false); setNewName(''); return; }
    try {
      const { data } = await API.post('/spaces', { name });
      setSpaces(prev => [...prev, data.space]);
      setOpenIds(prev => new Set([...prev, data.space._id]));
      toast.success('Space created');
    } catch { toast.error('Failed'); }
    setAdding(false);
    setNewName('');
  }

  async function handleDelete(space, e) {
    e.stopPropagation();
    setMenuId(null);
    if (!confirm(`Delete space "${space.name}"? Tasks will be unlinked.`)) return;
    try {
      await API.delete(`/spaces/${space._id}`);
      setSpaces(prev => prev.filter(s => s._id !== space._id));
      toast.success('Space deleted');
    } catch { toast.error('Failed'); }
  }

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 mt-1">
        {spaces.map(s => (
          <NavLink
            key={s._id}
            to={`/spaces/${s._id}`}
            title={s.name}
            className={({ isActive }) =>
              `w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                isActive ? 'bg-indigo-500/30 text-white' : 'text-indigo-300/70 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {s.name.charAt(0).toUpperCase()}
          </NavLink>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-1">
      {/* Section header */}
      <div className="flex items-center justify-between px-3 mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400/60">
          Spaces
        </span>
        {isAdminOrHR && (
          <button
            onClick={() => setAdding(true)}
            className="p-0.5 rounded text-indigo-300/50 hover:text-white hover:bg-white/10 transition-colors"
            title="Add space"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-0.5">
        {spaces.map(space => {
          const isOpen = openIds.has(space._id);
          return (
            <div key={space._id}>
              {/* Space row */}
              <div className="group flex items-center gap-0.5 rounded-lg px-1 py-0.5 hover:bg-white/8 transition-colors">
                {/* Chevron */}
                <button
                  onClick={() => toggle(space._id)}
                  className="p-1 rounded text-indigo-300/50 hover:text-indigo-300 transition-colors flex-shrink-0"
                >
                  <ChevronRight className={`w-3 h-3 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`} />
                </button>

                {/* Name → navigates to space detail */}
                <NavLink
                  to={`/spaces/${space._id}`}
                  className={({ isActive }) =>
                    `flex-1 truncate text-[12px] font-semibold uppercase tracking-wider px-1 py-0.5 rounded transition-colors ${
                      isActive ? 'text-indigo-400' : 'text-indigo-200/70 hover:text-white'
                    }`
                  }
                >
                  {space.name}
                </NavLink>

                {/* Actions (hover) */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                  {isAdmin && (
                    <div className="relative">
                      <button
                        onClick={e => { e.stopPropagation(); setMenuId(menuId === space._id ? null : space._id); }}
                        className="p-0.5 rounded text-indigo-300/50 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                      {menuId === space._id && (
                        <div className="absolute right-0 top-6 z-50 w-36 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1">
                          <button
                            onClick={e => handleDelete(space, e)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete space
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded: nothing yet (no sub-items in our model) */}
            </div>
          );
        })}

        {/* Inline create */}
        {adding && (
          <div className="px-2 py-1">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={handleCreate}
              onBlur={handleCreate}
              placeholder="Space name…"
              className="w-full h-7 rounded-md border border-indigo-500/50 bg-slate-800 px-2 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-400"
            />
          </div>
        )}

        {spaces.length === 0 && !adding && isAdminOrHR && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-indigo-300/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Create first space
          </button>
        )}
      </div>
    </div>
  );
}
