import { Task, TaskStatus } from '../types';
import { History, Sparkles } from 'lucide-react';

interface TaskCardProps {
  key?: string;
  task: Task;
  onClick: () => void;
  onQuickStatusChange: (status: TaskStatus) => void | Promise<void>;
}

export default function TaskCard({ task, onClick, onQuickStatusChange }: TaskCardProps) {
  // Determine badge colors for status
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-500 text-slate-900 border-slate-900';
      case 'In Progress':
        return 'border-2 border-emerald-500 text-emerald-600 bg-white';
      default:
        return 'bg-slate-100 text-slate-500 border-slate-300';
    }
  };

  // Determine role background & style
  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'Developer':
        return {
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          label: 'Developer',
        };
      case 'SEO Lead':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: 'SEO Lead',
        };
      case 'Founder':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          label: 'Founder',
        };
      default:
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          label: 'Operations',
        };
    }
  };

  const getCategoryStyle = (cat: string) => {
    switch (cat) {
      case 'Technical':
        return 'text-rose-700 border-rose-200 bg-rose-50';
      case 'On-Page':
        return 'text-teal-700 border-teal-200 bg-teal-50';
      case 'Local SEO':
        return 'text-sky-700 border-sky-200 bg-sky-50';
      case 'Content':
        return 'text-purple-700 border-purple-200 bg-purple-50';
      default:
        return 'text-amber-800 border-amber-200 bg-amber-50';
    }
  };

  const roleStyle = getRoleStyle(task.role);

  return (
    <div
      id={`task-card-${task._id}`}
      className="bg-white border-2 border-slate-900 rounded-none shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all flex flex-col justify-between overflow-hidden cursor-pointer group"
      onClick={onClick}
    >
      <div className="p-5">
        {/* Card Header Tag Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-1.5">
            {/* Timeline Tag */}
            <span className="bg-slate-900 text-white border border-slate-900 text-[9px] font-black px-2 py-0.5 rounded-none uppercase tracking-widest font-mono">
              {task.week}
            </span>
            {/* Optional / Suggested Badge */}
            {task.isOptional && (
              <span className="bg-amber-100 border border-amber-400 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded-none flex items-center gap-0.5 uppercase tracking-wide">
                <Sparkles className="h-2.5 w-2.5" />
                Suggested
              </span>
            )}
          </div>

          {/* Quick Status Select Dropdown (Stops event propagation to prevent modal trigger) */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <select
              id={`quick-status-${task._id}`}
              value={task.status}
              onChange={(e) => onQuickStatusChange(e.target.value as any)}
              className={`text-[10px] font-black px-2.5 py-1 rounded-none border-2 cursor-pointer outline-none transition-all uppercase tracking-wider ${getStatusStyle(
                task.status
              )}`}
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Task Title */}
        <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-2 leading-snug mb-2 font-display uppercase tracking-tight">
          {task.title}
        </h4>

        {/* Task Description */}
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-4 h-8 font-sans">
          {task.description}
        </p>

        {/* Categories / Badges */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {/* Category Badge */}
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-none border uppercase tracking-widest ${getCategoryStyle(task.category)}`}>
            {task.category}
          </span>
          {/* RACI Role Badge */}
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-none border uppercase tracking-widest ${roleStyle.bg}`}>
            {roleStyle.label}
          </span>
        </div>
      </div>

      {/* Card Footer Info */}
      <div className="bg-slate-50 border-t-2 border-slate-900 px-5 py-3 flex items-center justify-between text-[11px] text-slate-500 font-bold font-mono">
        <div className="flex items-center gap-1">
          <span className="text-[10px] uppercase tracking-wider">
            By: {task.contributor || 'System'}
          </span>
        </div>

        {task.history && task.history.length > 1 && (
          <div className="flex items-center gap-1 text-[10px] text-slate-600">
            <History className="h-3.5 w-3.5" />
            <span>{task.history.length} EVTS</span>
          </div>
        )}
      </div>
    </div>
  );
}
