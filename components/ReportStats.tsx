import React from 'react';
import { ClipboardList, CheckCircle2, Wrench, Search } from 'lucide-react';

interface ReportStatsProps {
  total: number;
  completed: number;
  pending: number;
  searchCount: number;
  month: string;
  activeFilter: 'all' | 'PENDIENTES' | 'COMPLETADOS' | 'ABIERTO' | 'CERRADO';
  onFilterChange: (filter: 'all' | 'PENDIENTES' | 'COMPLETADOS' | 'ABIERTO' | 'CERRADO') => void;
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
  const isCerradosActive = activeFilter === 'COMPLETADOS' || activeFilter === 'CERRADO';
  const isAbiertosActive = activeFilter === 'PENDIENTES' || activeFilter === 'ABIERTO';

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
          className={`rounded-2xl p-4 flex items-center gap-3 min-w-[170px] transition-all duration-300 cursor-pointer ${
            activeFilter === 'all' 
              ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 scale-105 ring-2 ring-indigo-400 ring-offset-2 ring-offset-[#0f172a]' 
              : 'bg-white/5 opacity-60 border border-white/5 text-slate-300 hover:opacity-100 hover:scale-102'
          }`}
          title="Ver todos los reportes (Abiertos y Cerrados)"
        >
          <div className={`p-2.5 rounded-xl ${activeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-indigo-500/20 text-indigo-400'}`}>
            <ClipboardList size={20} />
          </div>
          <div>
            <p className={`text-[8px] font-black uppercase tracking-widest ${activeFilter === 'all' ? 'text-white/80' : 'text-slate-400'}`}>TOTAL NOVEDADES</p>
            <p className="text-2xl font-black tracking-tighter">{total}</p>
            <span className="text-[7px] text-indigo-300 font-bold uppercase tracking-wider block -mt-0.5">ABIERTOS Y CERRADOS</span>
          </div>
        </div>

        {/* Card 2: CERRADOS */}
        <div 
          id="btn-filter-completed"
          onClick={() => onFilterChange(isCerradosActive ? 'all' : 'CERRADO')}
          className={`rounded-2xl p-4 flex items-center gap-3 min-w-[170px] transition-all duration-300 cursor-pointer ${
            isCerradosActive 
              ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/30 scale-105 ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0f172a]' 
              : 'bg-white/5 opacity-60 border border-white/5 text-slate-300 hover:opacity-100 hover:scale-102'
          }`}
          title="Filtrar solo reportes Cerrados"
        >
          <div className={`p-2.5 rounded-xl ${isCerradosActive ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-400'}`}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className={`text-[8px] font-black uppercase tracking-widest ${isCerradosActive ? 'text-white/80' : 'text-slate-400'}`}>CERRADOS</p>
            <p className="text-2xl font-black tracking-tighter text-emerald-400">{completed}</p>
            <span className="text-[7px] text-emerald-300 font-bold uppercase tracking-wider block -mt-0.5">RESUELTOS</span>
          </div>
        </div>

        {/* Card 3: ABIERTOS */}
        <div 
          id="btn-filter-pending"
          onClick={() => onFilterChange(isAbiertosActive ? 'all' : 'ABIERTO')}
          className={`rounded-2xl p-4 flex items-center gap-3 min-w-[170px] transition-all duration-300 cursor-pointer ${
            isAbiertosActive 
              ? 'bg-amber-500 text-slate-950 shadow-xl shadow-amber-500/30 scale-105 ring-2 ring-amber-300 ring-offset-2 ring-offset-[#0f172a]' 
              : 'bg-white/5 opacity-60 border border-white/5 text-slate-300 hover:opacity-100 hover:scale-102'
          }`}
          title="Filtrar solo reportes Abiertos"
        >
          <div className={`p-2.5 rounded-xl ${isAbiertosActive ? 'bg-black/20 text-slate-950' : 'bg-amber-500/20 text-amber-400'}`}>
            <Wrench size={20} />
          </div>
          <div>
            <p className={`text-[8px] font-black uppercase tracking-widest ${isAbiertosActive ? 'text-slate-900 font-black' : 'text-slate-400'}`}>ABIERTOS</p>
            <p className="text-2xl font-black tracking-tighter text-amber-400">{pending}</p>
            <span className={`text-[7px] font-bold uppercase tracking-wider block -mt-0.5 ${isAbiertosActive ? 'text-slate-900' : 'text-amber-300'}`}>PENDIENTES</span>
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
