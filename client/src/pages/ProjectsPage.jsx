import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmDialog from '../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus, FolderKanban, Users, Calendar, Edit2, Trash2, Search, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

const TABS = ['All', 'Active', 'Completed', 'On-Hold'];

const ProjectsPage = () => {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'hr';

  const [projects, setProjects]           = useState([]);
  const [users, setUsers]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [activeTab, setActiveTab]         = useState('All');
  const [search, setSearch]               = useState('');
  const [showModal, setShowModal]         = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [submitting, setSubmitting]       = useState(false);

  const emptyForm = { name: '', description: '', startDate: '', endDate: '', status: 'active', members: [] };
  const [form, setForm] = useState(emptyForm);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/projects');
      setProjects(data.projects || data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    API.get('/users').then(({ data }) => setUsers(data.users || data)).catch(() => {});
  }, []);

  const filtered = projects.filter((p) => {
    const matchTab    = activeTab === 'All' || p.status === activeTab.toLowerCase().replace(' ', '-');
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const openCreate = () => { setEditingProject(null); setForm(emptyForm); setShowModal(true); };
  const openEdit   = (project) => {
    setEditingProject(project);
    setForm({
      name: project.name || '',
      description: project.description || '',
      startDate: project.startDate ? format(new Date(project.startDate), 'yyyy-MM-dd') : '',
      endDate:   project.endDate   ? format(new Date(project.endDate),   'yyyy-MM-dd') : '',
      status: project.status || 'active',
      members: project.members?.map((m) => m._id || m) || [],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Project name is required'); return; }
    setSubmitting(true);
    try {
      if (editingProject) { await API.put(`/projects/${editingProject._id}`, form); toast.success('Project updated'); }
      else                { await API.post('/projects', form);                      toast.success('Project created'); }
      setShowModal(false);
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await API.delete(`/projects/${deleteTarget._id}`);
      toast.success('Project deleted');
      setDeleteTarget(null);
      if (selectedProject?._id === deleteTarget._id) setSelectedProject(null);
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const toggleMember = (uid) => setForm((prev) => ({
    ...prev,
    members: prev.members.includes(uid) ? prev.members.filter((id) => id !== uid) : [...prev.members, uid],
  }));

  const getProgress = (project) => {
    if (project.progress !== undefined) return project.progress;
    if (project.status === 'completed') return 100;
    if (project.status === 'on-hold')   return 30;
    return Math.floor(Math.random() * 60) + 20;
  };

  if (loading) return <LoadingSpinner size="lg" />;

  if (selectedProject) {
    const p = selectedProject;
    return (
      <div>
        <button onClick={() => setSelectedProject(null)} className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Projects
        </button>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{p.name}</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">{p.description || 'No description'}</p>
            </div>
            <StatusBadge status={p.status} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {[['Start Date', p.startDate], ['End Date', p.endDate], ['Members', null]].map(([label, date], i) => (
              <div key={label} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">{label}</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">
                  {i < 2 ? (date ? format(new Date(date), 'MMM dd, yyyy') : 'Not set') : `${p.members?.length || 0} member${(p.members?.length || 0) !== 1 ? 's' : ''}`}
                </p>
              </div>
            ))}
          </div>
          {p.members?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Team Members</h3>
              <div className="flex flex-wrap gap-2">
                {p.members.map((m) => {
                  const name = m.name || m.firstName || 'User';
                  return (
                    <span key={m._id || m} className="inline-flex items-center gap-2 rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 text-sm text-indigo-700 dark:text-indigo-300">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-200 dark:bg-indigo-700 text-xs font-bold text-indigo-800 dark:text-indigo-200">
                        {name.charAt(0).toUpperCase()}
                      </span>
                      {name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600 dark:text-slate-400">Progress</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{getProgress(p)}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
              <div className="bg-indigo-600 h-2.5 rounded-full transition-all" style={{ width: `${getProgress(p)}%` }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Projects</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage and track your team projects</p>
        </div>
        {isAdminOrManager && <Button onClick={openCreate}><Plus className="h-4 w-4" /> New Project</Button>}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${activeTab === tab ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'}`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 pl-10 pr-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
          <FolderKanban className="h-12 w-12 mb-3" />
          <p className="text-sm">No projects found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => {
            const progress = getProgress(project);
            return (
              <div key={project._id} onClick={() => setSelectedProject(project)}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md dark:hover:border-slate-600 transition-all cursor-pointer">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">{project.name}</h3>
                    <StatusBadge status={project.status} />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                    {project.description || 'No description provided'}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-4">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{project.members?.length || 0} members</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{project.createdAt ? format(new Date(project.createdAt), 'MMM dd, yyyy') : 'N/A'}</span>
                  </div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Progress</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${progress === 100 ? 'bg-green-500' : progress > 60 ? 'bg-indigo-500' : 'bg-yellow-500'}`} style={{ width: `${progress}%` }} />
                  </div>
                  {isAdminOrManager && (
                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <button onClick={(e) => { e.stopPropagation(); openEdit(project); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-indigo-600 transition-colors">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(project); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingProject ? 'Edit Project' : 'New Project'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Project Name" placeholder="Enter project name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              rows={3} placeholder="Project description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <Input label="End Date"   type="date" value={form.endDate}   onChange={(e) => setForm({ ...form, endDate:   e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
            <select className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Team Members</label>
            <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-lg p-2 space-y-1 bg-white dark:bg-slate-700/50">
              {users.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 text-center">No users available</p>
              ) : users.map((u) => (
                <label key={u._id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 cursor-pointer text-sm">
                  <input type="checkbox" checked={form.members.includes(u._id)} onChange={() => toggleMember(u._id)}
                    className="rounded border-slate-300 dark:border-slate-500 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-slate-700 dark:text-slate-300">{u.name || u.firstName || u.email}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>{editingProject ? 'Update' : 'Create'} Project</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Project" message={`Delete "${deleteTarget?.name}"? This cannot be undone.`} confirmText="Delete" />
    </div>
  );
};

export default ProjectsPage;
