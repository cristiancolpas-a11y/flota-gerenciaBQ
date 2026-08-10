import React from 'react';
import { ClipboardList, CheckCircle2, Clock, Search, FileSpreadsheet, Download } from 'lucide-react';

interface CalibrationStatsProps {
  total: number;
  completed: number;
  pending: number;
  searchCount: number;
  month: string;
  onExport?: () => void;
}

const CalibrationStats: React.FC<CalibrationStatsProps> = ({ total, completed, pending, searchCount, month, onExport }) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-[#0f172a] rounded-[2.5rem] p-6 flex flex-col lg:flex-row items-center gap-6 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
      
      {/* Progress Circle */}
      <div className="relative flex items-center gap-6 pr-6 border-r border-white/10">
        <div className="relative w-20 h-20">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
            <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={213.6} strokeDashoffset={213.6 - (213.6 * percentage) / 100} className="text-indigo-400 transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-black text-white">{percentage}%</span>
          </div>
        </div>
        <div className="space-y-0.5">
          <p className="text-indigo-400 text-[9px] font-black uppercase tracking-[0.2em]">EJECUCIÓN</p>
          <p className="text-white text-[11px] font-black uppercase tracking-widest">{month}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="flex flex-wrap justify-center lg:justify-start gap-4 flex-grow items-center">
        <div className="bg-indigo-600 rounded-2xl p-4 flex items-center gap-3 min-w-[150px] shadow-xl shadow-indigo-600/20">
          <div className="p-2.5 bg-white/20 rounded-xl text-white">
            <ClipboardList size={20} />
          </div>
          <div>
            <p className="text-white/60 text-[8px] font-black uppercase tracking-widest">TOTAL FILTRADO</p>
            <p className="text-white text-2xl font-black tracking-tighter">{total}</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3 min-w-[150px] border border-white/5">
          <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-400">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-white/40 text-[8px] font-black uppercase tracking-widest">CALIBRADOS</p>
            <p className="text-white text-2xl font-black tracking-tighter">{completed}</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3 min-w-[150px] border border-white/5">
          <div className="p-2.5 bg-rose-500/20 rounded-xl text-rose-400">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-white/40 text-[8px] font-black uppercase tracking-widest">PENDIENTES</p>
            <p className="text-white text-2xl font-black tracking-tighter">{pending}</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3 min-w-[150px] border border-white/5">
          <div className="p-2.5 bg-slate-500/20 rounded-xl text-slate-300">
            <Search size={20} />
          </div>
          <div>
            <p className="text-white/40 text-[8px] font-black uppercase tracking-widest">VER RESULTADOS</p>
            <p className="text-white text-2xl font-black tracking-tighter">{searchCount}</p>
          </div>
        </div>
      </div>

      {onExport && (
        <button
          onClick={onExport}
          className="flex items-center gap-2.5 px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-900/40 transition-all hover:scale-105 active:scale-95 cursor-pointer group shrink-0"
          title="Exportar calibraciones a archivo Excel/CSV"
        >
          <FileSpreadsheet size={18} className="group-hover:rotate-12 transition-transform text-emerald-200" />
          <div className="flex flex-col items-start leading-none">
            <span className="text-[7px] text-emerald-200 font-bold tracking-widest mb-0.5">DESCARGAR EXCEL</span>
            <span className="text-[10px] font-black tracking-wider">{month}</span>
          </div>
          <Download size={14} className="opacity-80 ml-1" />
        </button>
      )}
    </div>
  );
};

export default CalibrationStats;
