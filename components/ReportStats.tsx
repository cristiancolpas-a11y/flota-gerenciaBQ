import React from 'react';
import { ClipboardList, CheckCircle2, Wrench, Search } from 'lucide-react';

interface ReportStatsProps {
  total: number;
  completed: number;
  pending: number;
  searchCount: number;
  month: string;
  activeFilter: 'all' | 'PENDIENTES' | 'COMPLETADOS';
  onFilterChange: (filter: 'all' | 'PENDIENTES' | 'COMPLETADOS') => void;
}

const ReportStats: React.FC<ReportStatsProps> = ({ 
  total, 
  completed, 
  pending, 
  searchCount, 
  month,
  activeFilter,
  onFilterChange
}) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-[#0f172a] rounded-[2.5rem] p-6 flex flex-col lg:flex-row items-center gap-6 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
      
      {/* Progress Circle */}
      <div className="relative flex items-center gap-6 pr-6 border-r border-white/10">
        <div className="relative w-20 h-20">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
            <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={213.6} strokeDashoffset={213.6 - (213.6 * percentage) / 100} className="text-emerald-400 transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-black text-white">{percentage}%</span>
          </div>
        </div>
        <div className="space-y-0.5">
          <p className="text-indigo-400 text-[9px] font-black uppercase tracking-[0.2em]">CUMPLIMIENTO</p>
          <p className="text-white text-[11px] font-black uppercase tracking-widest">{month}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="flex flex-wrap justify-center lg:justify-start gap-4 flex-grow">
        {/* Card 1: TOTAL */}
        <div 
          id="btn-filter-total"
          onClick={() => onFilterChange('all')}
          className={`rounded-2xl p-4 flex items-center gap-3 min-w-[160px] transition-all duration-300 cursor-pointer ${
            activeFilter === 'all' 
              ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 scale-105 ring-2 ring-indigo-400 ring-offset-2 ring-offset-[#0f172a]' 
              : 'bg-white/5 opacity-50 border border-white/5 text-slate-300 hover:opacity-100 hover:scale-102'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${activeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-indigo-500/20 text-indigo-400'}`}>
            <ClipboardList size={20} />
          </div>
          <div>
            <p className={`text-[8px] font-black uppercase tracking-widest ${activeFilter === 'all' ? 'text-white/60' : 'text-slate-400'}`}>TOTAL NOVEDADES</p>
            <p className="text-2xl font-black tracking-tighter">{total}</p>
          </div>
        </div>

        {/* Card 2: COMPLETADOS */}
        <div 
          id="btn-filter-completed"
          onClick={() => onFilterChange('COMPLETADOS')}
          className={`rounded-2xl p-4 flex items-center gap-3 min-w-[160px] transition-all duration-300 cursor-pointer ${
            activeFilter === 'COMPLETADOS' 
              ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/30 scale-105 ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0f172a]' 
              : 'bg-white/5 opacity-50 border border-white/5 text-slate-300 hover:opacity-100 hover:scale-102'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${activeFilter === 'COMPLETADOS' ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-400'}`}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className={`text-[8px] font-black uppercase tracking-widest ${activeFilter === 'COMPLETADOS' ? 'text-white/60' : 'text-slate-400'}`}>REALIZADOS</p>
            <p className="text-2xl font-black tracking-tighter">{completed}</p>
          </div>
        </div>

        {/* Card 3: PENDIENTES */}
        <div 
          id="btn-filter-pending"
          onClick={() => onFilterChange('PENDIENTES')}
          className={`rounded-2xl p-4 flex items-center gap-3 min-w-[160px] transition-all duration-300 cursor-pointer ${
            activeFilter === 'PENDIENTES' 
              ? 'bg-rose-600 text-white shadow-xl shadow-rose-600/30 scale-105 ring-2 ring-rose-400 ring-offset-2 ring-offset-[#0f172a]' 
              : 'bg-white/5 opacity-50 border border-white/5 text-slate-300 hover:opacity-100 hover:scale-102'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${activeFilter === 'PENDIENTES' ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-400'}`}>
            <Wrench size={20} />
          </div>
          <div>
            <p className={`text-[8px] font-black uppercase tracking-widest ${activeFilter === 'PENDIENTES' ? 'text-white/60' : 'text-slate-400'}`}>PENDIENTES</p>
            <p className="text-2xl font-black tracking-tighter">{pending}</p>
          </div>
        </div>

        {/* Card 4: BUSQUEDA */}
        <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3 min-w-[160px] border border-white/5 opacity-80">
          <div className="p-2.5 bg-slate-500/20 rounded-xl text-slate-300">
            <Search size={20} />
          </div>
          <div>
            <p className="text-white/40 text-[8px] font-black uppercase tracking-widest">BÚSQUEDA</p>
            <p className="text-white text-2xl font-black tracking-tighter">{searchCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportStats;
