import { useState } from 'react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  User, Save, Lock, Loader2, Mail, Phone, Building, Award, Hash, Camera
} from 'lucide-react';

const ProfilePage = () => {
  const { user, setUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    department: user?.department || '',
    designation: user?.designation || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const initialsColor = (name) => {
    const colors = [
      'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
      'bg-purple-500', 'bg-cyan-500'
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

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    setAvatarUploading(true);
    try {
      const { data } = await API.put(`/users/${user._id}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // update auth context user if possible, show success
      toast.success('Profile photo updated');
      // Force reload to pick up new avatar
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const { name, phone } = form;
      const { data } = await API.put('/users/me', { name, phone });
      if (data.user) setUser(data.user);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      setSavingPassword(true);
      await API.put('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none";
  const readOnlyCls = "w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-75";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Profile Header */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative w-24 h-24 flex-shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} className="w-24 h-24 rounded-full object-cover" alt={user.name} />
            ) : (
              <div className={`w-24 h-24 rounded-full ${initialsColor(user?.name)} flex items-center justify-center`}>
                <span className="text-white text-2xl font-bold">{getInitials(user?.name)}</span>
              </div>
            )}
            {avatarUploading ? (
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-800">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
            ) : (
              <label htmlFor="avatar-input" className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 hover:bg-indigo-700 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-800 cursor-pointer transition-colors">
                <Camera className="w-4 h-4 text-white" />
              </label>
            )}
            <input id="avatar-input" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{user?.name}</h2>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
              {user?.employeeId && (
                <span className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                  <Hash className="w-3.5 h-3.5" /> {user.employeeId}
                </span>
              )}
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${roleBadge(user?.role)}`}>
                {user?.role}
              </span>
              {user?.department && (
                <span className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                  <Building className="w-3.5 h-3.5" /> {user.department}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Edit Profile */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-indigo-500" /> Profile Details
        </h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5" /> Name</span>
              </label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Email</span>
              </label>
              <input type="email" value={user?.email || ''} disabled
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                <span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Phone</span>
              </label>
              <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                <span className="inline-flex items-center gap-1"><Building className="w-3.5 h-3.5" /> Department</span>
              </label>
              <input type="text" value={form.department} readOnly className={readOnlyCls} title="Contact HR to update your department" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                <span className="inline-flex items-center gap-1"><Award className="w-3.5 h-3.5" /> Designation</span>
              </label>
              <input type="text" value={form.designation} readOnly className={readOnlyCls} title="Contact HR to update your designation" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-indigo-500" /> Change Password
        </h3>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
            <input type="password" required value={passwordForm.currentPassword}
              onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              className={inputCls} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Password</label>
              <input type="password" required minLength={6} value={passwordForm.newPassword}
                onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
              <input type="password" required minLength={6} value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className={inputCls} />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={savingPassword}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
              {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Change Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
