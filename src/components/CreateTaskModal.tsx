import React, { useState } from 'react';
import { TeamRole, TaskWeek, TaskCategory, TaskStatus, Task } from '../types';
import { X, Save, User } from 'lucide-react';

interface CreateTaskModalProps {
  onClose: () => void;
  onCreate: (taskData: Omit<Task, 'history' | 'updatedAt'>) => Promise<void>;
}

export default function CreateTaskModal({ onClose, onCreate }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [role, setRole] = useState<TeamRole>('Developer');
  const [week, setWeek] = useState<TaskWeek>('Week 1');
  const [category, setCategory] = useState<TaskCategory>('Technical');
  const [status, setStatus] = useState<TaskStatus>('Pending');
  const [isOptional, setIsOptional] = useState(false);
  const [contributor, setContributor] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Task Title is required.');
      return;
    }

    if (!contributor.trim()) {
      setError('Please provide your name to register this task creation.');
      return;
    }

    setLoading(true);
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim(),
        role,
        week,
        category,
        status,
        isOptional,
        contributor: contributor.trim(),
      });
      setError('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="create-modal-overlay" className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        id="create-modal-body"
        className="bg-white border-4 border-slate-900 rounded-none w-full max-w-xl shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 bg-slate-900 text-white border-b-4 border-emerald-500">
          <div>
            <h4 className="font-bold font-display text-base uppercase tracking-wider text-white">
              + Add New Strategic Task
            </h4>
            <span className="text-[9px] text-slate-300 font-mono uppercase tracking-widest block mt-0.5">
              ROADMAP // SYSTEM LOG ENTRY
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
              Task Title <span className="text-emerald-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AUD-11: Integrate Google Consent Mode V2"
              className="w-full text-xs border-2 border-slate-900 rounded-none p-2.5 outline-none bg-slate-50 focus:bg-white text-slate-900 font-bold placeholder:font-normal placeholder:text-slate-400"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
              Brief Description / Requirements
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write a clear explanation of what needs to be achieved, files concerned, and target KPIs..."
              rows={3}
              className="w-full text-xs border-2 border-slate-900 rounded-none p-2.5 outline-none bg-slate-50 focus:bg-white text-slate-900 leading-relaxed placeholder:text-slate-400"
            />
          </div>

          {/* Role & Timeline Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Role */}
            <div>
              <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
                Responsible Owner
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
              <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
                Target Timeline
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
              <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
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
              <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1.5">
                Initial Status
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

          {/* Optional Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isOptional"
              checked={isOptional}
              onChange={(e) => setIsOptional(e.target.checked)}
              className="border-2 border-slate-900 rounded-none text-slate-900 focus:ring-slate-900 h-4 w-4 cursor-pointer"
            />
            <label htmlFor="isOptional" className="text-[10px] font-black text-slate-800 uppercase tracking-widest cursor-pointer">
              Mark as Suggested / Optional Task
            </label>
          </div>

          {/* Contributor Name */}
          <div className="border-t-2 border-slate-900 pt-4">
            <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1.5">
              🔑 Contributor Signature / Name <span className="text-emerald-500">*</span>
            </label>
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

          {error && (
            <div className="text-xs text-rose-700 bg-rose-50 border-2 border-rose-900 rounded-none p-2.5 font-bold leading-relaxed">
              <span>⚠ {error}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t-2 border-slate-900 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-slate-700 bg-white border-2 border-slate-900 hover:bg-slate-100 px-4 py-2.5 rounded-none transition-all shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="text-xs font-bold text-slate-900 bg-emerald-500 hover:bg-emerald-400 border-2 border-slate-900 px-5 py-2.5 rounded-none transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px]"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
