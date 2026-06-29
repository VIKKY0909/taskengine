import React, { useState, useEffect } from 'react';
import { Task, TeamRole, TaskWeek, TaskCategory, TaskStatus } from '../types';
import { X, Calendar, Tag, Clock, Save, Trash2, History, User } from 'lucide-react';

interface TaskDetailsModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: (updatedTask: Task) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function TaskDetailsModal({ task, onClose, onUpdate, onDelete }: TaskDetailsModalProps) {
  // Local state for form inputs
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [role, setRole] = useState<TeamRole>(task.role);
  const [week, setWeek] = useState<TaskWeek>(task.week);
  const [category, setCategory] = useState<TaskCategory>(task.category);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [isOptional, setIsOptional] = useState(!!task.isOptional);

  // Mandated contributor name
  const [contributor, setContributor] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync state if task changes
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
    setRole(task.role);
    setWeek(task.week);
    setCategory(task.category);
    setStatus(task.status);
    setIsOptional(!!task.isOptional);
    setError('');
  }, [task]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contributor.trim()) {
      setError('Please provide your name to register this database modification.');
      return;
    }

    setLoading(true);
    try {
      const updatedTask: Task = {
        ...task,
        title,
        description,
        role,
        week,
        category,
        status,
        isOptional,
        contributor: contributor.trim(), // Server will append the edit trail using this name
      };

      await onUpdate(updatedTask);
      setError('');
      setContributor('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update task.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you absolutely sure you want to permanently delete the task: "${task.title}"? This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      if (task._id) {
        await onDelete(task._id);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete task.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to format date
  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch (e) {
      return isoStr;
    }
  };

  return (
    <div id="details-modal-overlay" className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        id="details-modal-body"
        className="bg-white border-4 border-slate-900 rounded-none w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] flex flex-col md:flex-row"
      >
        {/* Left Side: Edit Fields Form */}
        <form onSubmit={handleSave} className="flex-1 p-6 overflow-y-auto border-r-2 border-slate-900 flex flex-col justify-between max-h-[90vh]">
          <div>
            <div className="flex items-center justify-between mb-5 border-b-2 border-slate-900 pb-3">
              <div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block font-mono">
                  Modify Parameters
                </span>
                <span className="text-xs text-slate-900 font-bold block mt-0.5 font-mono">
                  ID: {task._id || 'Local Cache'}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-500 hover:text-slate-900 p-1 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5 font-display">
                  Task Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs border-2 border-slate-900 rounded-none p-2.5 outline-none bg-slate-50 focus:bg-white text-slate-900 font-bold"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5 font-display">
                  Description / Execution Brief
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full text-xs border-2 border-slate-900 rounded-none p-2.5 outline-none bg-slate-50 focus:bg-white text-slate-900 leading-relaxed"
                />
              </div>

              {/* Dropdowns Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Role */}
                <div>
                  <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5 font-display">
                    Team Role / Owner
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as TeamRole)}
                    className="w-full text-xs border-2 border-slate-900 rounded-none p-2.5 outline-none bg-white text-slate-900 font-bold cursor-pointer"
                  >
                    <option value="Developer">Developer (Technical)</option>
                    <option value="SEO Lead">SEO Lead (Search)</option>
                    <option value="Founder">Founder (Advisory)</option>
                    <option value="Operations">Operations / Marketing</option>
                  </select>
                </div>

                {/* Timeline */}
                <div>
                  <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5 font-display">
                    Timeline (Week)
                  </label>
                  <select
                    value={week}
                    onChange={(e) => setWeek(e.target.value as TaskWeek)}
                    className="w-full text-xs border-2 border-slate-900 rounded-none p-2.5 outline-none bg-white text-slate-900 font-bold cursor-pointer"
                  >
                    <option value="Week 1">Week 1 (Foundations)</option>
                    <option value="Week 2">Week 2 (Funnel Deployment)</option>
                    <option value="Week 3">Week 3 (Optimization/Schema)</option>
                    <option value="Week 4">Week 4 (Reporting/Indexing)</option>
                    <option value="Suggested/Optional">Suggested / Optional</option>
                  </select>
                </div>
              </div>

              {/* Category & Status */}
              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5 font-display">
                    Strategic Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TaskCategory)}
                    className="w-full text-xs border-2 border-slate-900 rounded-none p-2.5 outline-none bg-white text-slate-900 font-bold cursor-pointer"
                  >
                    <option value="Technical">Technical SEO</option>
                    <option value="On-Page">On-Page Optimization</option>
                    <option value="Local SEO">Local SEO / GEO Mapping</option>
                    <option value="Content">Content &amp; Socials</option>
                    <option value="Strategy">Strategic Business Gaps</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5 font-display">
                    Task Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full text-xs border-2 border-slate-900 rounded-none p-2.5 outline-none bg-white text-slate-900 font-bold cursor-pointer"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Optional Switcher */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-isOptional"
                  checked={isOptional}
                  onChange={(e) => setIsOptional(e.target.checked)}
                  className="border-2 border-slate-900 rounded-none text-slate-900 focus:ring-slate-900 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="edit-isOptional" className="text-[10px] font-black text-slate-800 uppercase tracking-widest cursor-pointer">
                  Mark as Optional / Suggested Parameter
                </label>
              </div>

              {/* Mandatory Contributor Name */}
              <div className="border-t-2 border-slate-900 pt-4 mt-2">
                <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1 font-display">
                  🔑 Contributor Signature (Mandatory)
                </label>
                <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">
                  Authentication is bypassed for simplicity. To register updates on this task, provide your name. Your update will log in the permanent audit trail.
                </p>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="text"
                    value={contributor}
                    onChange={(e) => {
                      setContributor(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter your name (e.g. Marcus Thorne)"
                    className="w-full text-xs border-2 border-slate-900 rounded-none p-2.5 pl-10 outline-none bg-slate-50 focus:bg-white text-slate-900 font-bold placeholder:font-normal placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t-2 border-slate-900 pt-4 flex flex-col gap-2">
            {error && (
              <div className="text-xs text-rose-700 bg-rose-50 border-2 border-rose-950 p-2.5 font-bold mb-1">
                <span>⚠ {error}</span>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-white border-2 border-slate-900 px-3 py-2.5 rounded-none transition-all shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                Delete Task
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-bold text-slate-700 bg-white border-2 border-slate-900 px-4 py-2.5 rounded-none transition-all shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="text-xs font-bold text-slate-900 bg-emerald-500 hover:bg-emerald-400 border-2 border-slate-900 px-5 py-2.5 rounded-none transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px]"
                >
                  <Save className="h-4 w-4" />
                  {loading ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Right Side: Audit Trail / Timeline logs */}
        <div className="w-full md:w-80 bg-slate-50 p-6 overflow-y-auto max-h-[90vh] flex flex-col border-t-2 md:border-t-0 border-slate-900">
          <h5 className="font-bold text-slate-900 uppercase tracking-widest text-xs font-display mb-4 border-b-2 border-slate-900 pb-2 flex items-center gap-2">
            <History className="h-4.5 w-4.5 text-slate-900 shrink-0" />
            Audit Trail Logs
          </h5>

          {task.history && task.history.length > 0 ? (
            <div className="relative border-l-2 border-slate-900 pl-4 space-y-4 flex-1">
              {task.history.map((entry, index) => (
                <div key={index} className="relative text-xs">
                  {/* Timeline Dot */}
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-none bg-emerald-500 border-2 border-slate-900 ring-4 ring-slate-50" />

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-slate-500 font-bold font-mono">
                      {formatDate(entry.date)}
                    </span>
                    <span className="font-black text-slate-900 block leading-snug uppercase tracking-tight">
                      {entry.action}
                    </span>
                    <span className="text-[10px] text-slate-600">
                      Signature: <strong className="text-slate-900 underline decoration-emerald-400">{entry.contributor}</strong>
                    </span>
                    <p className="text-[11px] text-slate-600 leading-relaxed italic mt-1 bg-white p-2.5 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] rounded-none">
                      "{entry.details}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-10">
              <Clock className="h-8 w-8 mb-2 shrink-0 text-slate-300" />
              <p className="text-xs">No audit history recorded yet for this task.</p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t-2 border-slate-900 text-[9px] text-slate-400 leading-relaxed font-mono font-bold">
            TIMESTAMPS: ISO_8601 // CONNECTED DB MODIFICATIONS SYNC IMMEDIATELY
          </div>
        </div>
      </div>
    </div>
  );
}
