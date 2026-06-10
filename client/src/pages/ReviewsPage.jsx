import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  Star, Plus, X, Loader2, ClipboardList, ChevronRight, ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';

const ratingCategories = [
  'Job Knowledge', 'Work Quality', 'Productivity', 'Communication', 'Teamwork'
];

const statusColors = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const StarRating = ({ value, onChange, readOnly = false }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map(star => (
      <button key={star} type="button" disabled={readOnly}
        onClick={() => !readOnly && onChange?.(star)}
        className={`${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition`}>
        <Star className={`w-5 h-5 ${star <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
      </button>
    ))}
  </div>
);

const ReviewsPage = () => {
  const { user } = useAuth();
  const isManager = user?.role === 'admin' || user?.role === 'hr';
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSelfAssessment, setShowSelfAssessment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState([]);

  const [createForm, setCreateForm] = useState({
    employee: '', period: '', ratings: Object.fromEntries(ratingCategories.map(c => [c, 0])),
    strengths: '', improvements: '', goals: ''
  });

  const [selfForm, setSelfForm] = useState({
    review: '', ratings: Object.fromEntries(ratingCategories.map(c => [c, 0])),
    strengths: '', improvements: '', goals: ''
  });

  useEffect(() => {
    fetchReviews();
    if (isManager) fetchEmployees();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const endpoint = isManager ? '/reviews/team' : '/reviews/my';
      const { data } = await API.get(endpoint);
      setReviews(data.reviews || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await API.get('/users/team');
      setEmployees(data.users || []);
    } catch { /* silent */ }
  };

  const handleCreateReview = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await API.post('/reviews', createForm);
      toast.success('Review created');
      setShowCreateModal(false);
      setCreateForm({
        employee: '', period: '', ratings: Object.fromEntries(ratingCategories.map(c => [c, 0])),
        strengths: '', improvements: '', goals: ''
      });
      fetchReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelfAssessment = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await API.put(`/reviews/${selfForm.review}/self-assessment`, selfForm);
      toast.success('Self-assessment submitted');
      setShowSelfAssessment(false);
      fetchReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const overallRating = (ratings) => {
    if (!ratings) return 0;
    const values = Object.values(ratings).filter(v => typeof v === 'number' && v > 0);
    if (values.length === 0) return 0;
    return (values.reduce((s, v) => s + v, 0) / values.length).toFixed(1);
  };

  if (selectedReview) {
    const r = selectedReview;
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedReview(null)}
          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Reviews
        </button>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {r.employee?.name || 'Employee'} - {r.period || 'Review'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Reviewer: {r.reviewer?.name || 'Manager'} | {r.createdAt ? format(new Date(r.createdAt), 'MMM dd, yyyy') : ''}
              </p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[r.status] || statusColors.pending}`}>
              {r.status || 'pending'}
            </span>
          </div>

          <div className="space-y-4 mb-6">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Ratings</h3>
            {ratingCategories.map(cat => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">{cat}</span>
                <StarRating value={r.ratings?.[cat] || 0} readOnly />
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="font-semibold text-slate-800 dark:text-slate-100">Overall</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-amber-500">{overallRating(r.ratings)}</span>
                <StarRating value={Math.round(overallRating(r.ratings))} readOnly />
              </div>
            </div>
          </div>

          {r.strengths && (
            <div className="mb-4">
              <h3 className="font-semibold text-green-700 dark:text-green-400 mb-1">Strengths</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{r.strengths}</p>
            </div>
          )}
          {r.improvements && (
            <div className="mb-4">
              <h3 className="font-semibold text-amber-700 dark:text-amber-400 mb-1">Areas for Improvement</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{r.improvements}</p>
            </div>
          )}
          {r.goals && (
            <div>
              <h3 className="font-semibold text-blue-700 dark:text-blue-400 mb-1">Goals</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{r.goals}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-indigo-600" /> Performance Reviews
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track performance and growth</p>
        </div>
        <div className="flex gap-2">
          {!isManager && (
            <button onClick={() => setShowSelfAssessment(true)}
              className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition">
              Self-Assessment
            </button>
          )}
          {isManager && (
            <button onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
              <Plus className="w-4 h-4" /> Create Review
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-20">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">No reviews found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(review => (
            <div key={review._id}
              onClick={() => setSelectedReview(review)}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                      {review.period || 'Review Period'}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[review.status] || statusColors.pending}`}>
                      {review.status || 'pending'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                    <span>Reviewer: {review.reviewer?.name || '-'}</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="font-medium">{overallRating(review.ratings)}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Review Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Create Review</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCreateReview} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Employee *</label>
                <select required value={createForm.employee} onChange={e => setCreateForm({ ...createForm, employee: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                  <option value="">Select employee</option>
                  {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Review Period *</label>
                <input type="text" required placeholder="e.g. Q1 2026" value={createForm.period}
                  onChange={e => setCreateForm({ ...createForm, period: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Ratings</label>
                {ratingCategories.map(cat => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-300">{cat}</span>
                    <StarRating value={createForm.ratings[cat]}
                      onChange={v => setCreateForm({
                        ...createForm,
                        ratings: { ...createForm.ratings, [cat]: v }
                      })} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Strengths</label>
                <textarea value={createForm.strengths} onChange={e => setCreateForm({ ...createForm, strengths: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Areas for Improvement</label>
                <textarea value={createForm.improvements} onChange={e => setCreateForm({ ...createForm, improvements: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Goals</label>
                <textarea value={createForm.goals} onChange={e => setCreateForm({ ...createForm, goals: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 inline-flex items-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Self-Assessment Modal */}
      {showSelfAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Self-Assessment</h2>
              <button onClick={() => setShowSelfAssessment(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSelfAssessment} className="p-5 space-y-4">
              {reviews.filter(r => r.status === 'pending').length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Review</label>
                  <select value={selfForm.review} onChange={e => setSelfForm({ ...selfForm, review: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    <option value="">Select review period</option>
                    {reviews.filter(r => r.status === 'pending').map(r => (
                      <option key={r._id} value={r._id}>{r.period}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Self-Ratings</label>
                {ratingCategories.map(cat => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-300">{cat}</span>
                    <StarRating value={selfForm.ratings[cat]}
                      onChange={v => setSelfForm({
                        ...selfForm,
                        ratings: { ...selfForm.ratings, [cat]: v }
                      })} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">My Strengths</label>
                <textarea value={selfForm.strengths} onChange={e => setSelfForm({ ...selfForm, strengths: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Areas I Want to Improve</label>
                <textarea value={selfForm.improvements} onChange={e => setSelfForm({ ...selfForm, improvements: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">My Goals</label>
                <textarea value={selfForm.goals} onChange={e => setSelfForm({ ...selfForm, goals: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowSelfAssessment(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 inline-flex items-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewsPage;
