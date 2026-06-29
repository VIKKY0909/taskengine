import { Task, TeamRole } from '../types';
import { Layers, CheckCircle2, Circle, Sparkles, TrendingUp } from 'lucide-react';

interface ProgressStatsProps {
  tasks: Task[];
}

export default function ProgressStats({ tasks }: ProgressStatsProps) {
  const totalCount = tasks.length;
  const completedCount = tasks.filter(t => t.status === 'Completed').length;
  const inProgressCount = tasks.filter(t => t.status === 'In Progress').length;
  const pendingCount = tasks.filter(t => t.status === 'Pending').length;
  const optionalCount = tasks.filter(t => t.isOptional).length;

  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Breakdown by Role
  const roleCounts = (role: TeamRole) => {
    const roleTasks = tasks.filter(t => t.role === role);
    const completed = roleTasks.filter(t => t.status === 'Completed').length;
    return {
      total: roleTasks.length,
      completed,
      pct: roleTasks.length > 0 ? Math.round((completed / roleTasks.length) * 100) : 0,
    };
  };

  const devStats = roleCounts('Developer');
  const seoStats = roleCounts('SEO Lead');
  const founderStats = roleCounts('Founder');
  const opsStats = roleCounts('Operations');

  return (
    <div id="progress-stats-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Percentage Completion Card */}
      <div id="overall-progress-card" className="bg-white border-2 border-slate-900 rounded-none p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all duration-150">
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-sans">
              Program Progress
            </span>
            <span className="bg-emerald-500 text-slate-900 border-2 border-slate-900 text-[9px] font-black px-2 py-0.5 rounded-none flex items-center gap-1 uppercase tracking-wider">
              <TrendingUp className="h-3 w-3" />
              Active Track
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-5xl font-black italic font-display text-slate-900 tracking-tight">
              {completionPct}%
            </h3>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">completed</span>
          </div>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            {completedCount} of {totalCount} total strategy parameters successfully verified or configured.
          </p>
        </div>

        <div className="mt-6">
          <div className="w-full h-4 bg-slate-100 border-2 border-slate-900 rounded-none overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 border-r-2 border-slate-900 transition-all duration-500 ease-out"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-black uppercase mt-1.5 font-mono">
            <span>0% started</span>
            <span>100% launched</span>
          </div>
        </div>
      </div>

      {/* Task Status Overview */}
      <div id="status-counters-card" className="bg-white border-2 border-slate-900 rounded-none p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all duration-150 lg:col-span-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-sans block mb-4">
          Task Parameters
        </span>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 border border-slate-300 rounded-none p-3 flex items-center gap-3">
            <div className="h-9 w-9 border border-slate-300 bg-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <span className="text-xl font-bold font-display text-slate-900 block leading-none">
                {completedCount}
              </span>
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                Completed
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-300 rounded-none p-3 flex items-center gap-3">
            <div className="h-9 w-9 border border-slate-300 bg-white flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <span className="text-xl font-bold font-display text-slate-900 block leading-none">
                {inProgressCount}
              </span>
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                In Progress
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-300 rounded-none p-3 flex items-center gap-3">
            <div className="h-9 w-9 border border-slate-300 bg-white flex items-center justify-center shrink-0">
              <Circle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <span className="text-xl font-bold font-display text-slate-900 block leading-none">
                {pendingCount}
              </span>
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                Pending
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-300 rounded-none p-3 flex items-center gap-3">
            <div className="h-9 w-9 border border-slate-300 bg-white flex items-center justify-center shrink-0">
              <Layers className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <span className="text-xl font-bold font-display text-slate-900 block leading-none">
                {optionalCount}
              </span>
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest font-sans">
                Suggested
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Role-based RACI Progress */}
      <div id="raci-progress-card" className="bg-white border-2 border-slate-900 rounded-none p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all duration-150">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-sans block mb-3.5">
          RACI Role Allocation
        </span>
        <div className="space-y-3">
          {/* Developer */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-bold text-slate-800">Developer</span>
              <span className="text-slate-500 font-mono text-[10px]">{devStats.completed}/{devStats.total} ({devStats.pct}%)</span>
            </div>
            <div className="w-full h-2 bg-slate-100 border border-slate-300 rounded-none overflow-hidden">
              <div className="h-full bg-slate-900 transition-all duration-300" style={{ width: `${devStats.pct}%` }} />
            </div>
          </div>

          {/* SEO Lead */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-bold text-slate-800">SEO Lead</span>
              <span className="text-slate-500 font-mono text-[10px]">{seoStats.completed}/{seoStats.total} ({seoStats.pct}%)</span>
            </div>
            <div className="w-full h-2 bg-slate-100 border border-slate-300 rounded-none overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${seoStats.pct}%` }} />
            </div>
          </div>

          {/* Founder */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-bold text-slate-800">Founder</span>
              <span className="text-slate-500 font-mono text-[10px]">{founderStats.completed}/{founderStats.total} ({founderStats.pct}%)</span>
            </div>
            <div className="w-full h-2 bg-slate-100 border border-slate-300 rounded-none overflow-hidden">
              <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${founderStats.pct}%` }} />
            </div>
          </div>

          {/* Operations */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-bold text-slate-800">Operations</span>
              <span className="text-slate-500 font-mono text-[10px]">{opsStats.completed}/{opsStats.total} ({opsStats.pct}%)</span>
            </div>
            <div className="w-full h-2 bg-slate-100 border border-slate-300 rounded-none overflow-hidden">
              <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${opsStats.pct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
