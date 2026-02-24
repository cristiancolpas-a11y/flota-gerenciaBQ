
import React from 'react';
import { WashReport } from '../types';
import { formatDate } from '../utils';
import { Droplets, Calendar, Hash, MapPin, Eye } from 'lucide-react';

interface WashCardProps {
  report: WashReport;
  onViewDoc: (url: string, title: string) => void;
}

const WashCard: React.FC<WashCardProps> = ({ report, onViewDoc }) => {
  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden group hover:shadow-2xl transition-all duration-500">
      {/* Header with Plate */}
      <div className="bg-[#0f172a] p-6 flex items-center justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400">
            <Droplets size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white tracking-tighter">{report.plate}</h3>
            <div className="flex items-center gap-2 text-indigo-400/60 text-[8px] font-black uppercase tracking-widest">
              <Hash size={10} />
              <span>WASH-{report.id}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 relative z-10">
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">
            LAVADO EXITOSO
          </span>
          <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">SEMANA {report.week}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-6">
        {/* Date and Month */}
        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-3xl border border-slate-100">
          <div className="flex items-center gap-3 text-slate-600">
            <Calendar size={18} className="text-indigo-600" />
            <span className="text-[10px] font-black uppercase tracking-wide">{formatDate(report.date)}</span>
          </div>
          <span className="px-4 py-1.5 bg-white text-slate-400 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-slate-100 shadow-sm">
            {report.month}
          </span>
        </div>

        {/* Visual Support Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">SOPORTE VISUAL DE LIMPIEZA</h4>
            <button 
              onClick={() => onViewDoc(report.evidenceUrl, `Evidencia Lavado ${report.plate}`)}
              className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"
            >
              <Eye size={14} />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="aspect-video rounded-2xl overflow-hidden bg-slate-100 relative group/img">
              <img 
                src={report.evidenceUrl || "https://picsum.photos/seed/wash1/400/300"} 
                alt="Evidencia 1" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity"></div>
            </div>
            <div className="aspect-video rounded-2xl overflow-hidden bg-slate-100 relative group/img">
              <img 
                src={report.mapUrl || "https://picsum.photos/seed/wash2/400/300"} 
                alt="Evidencia 2" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity"></div>
            </div>
          </div>
        </div>

        {/* Workshop Info */}
        <div className="flex items-center gap-3 text-slate-400 pt-2 border-t border-slate-100">
          <MapPin size={14} />
          <span className="text-[9px] font-bold uppercase tracking-widest truncate">{report.workshop || 'TALLER NO ESPECIFICADO'}</span>
        </div>
      </div>
    </div>
  );
};

export default WashCard;
