
import React from 'react';
import { WashReport } from '../types';
import { formatDate, getDriveDirectLink } from '../utils';
import { Droplets, Calendar, Hash, MapPin, Eye } from 'lucide-react';

interface WashCardProps {
  report: WashReport;
  onViewDoc: (url: string | string[] | {url: string, label?: string}[], title: string) => void;
}

const WashCard: React.FC<WashCardProps> = ({ report, onViewDoc }) => {
  const thumbUrl = getDriveDirectLink(report.evidenceUrl || report.finalEvidenceUrl || report.initialEvidenceUrl || "");
  
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
          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${report.status === 'CERRADO' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/20 text-rose-400 border-rose-500/20'}`}>
            {report.status === 'CERRADO' ? 'LIMPIEZA EXITOSA' : 'LIMPIEZA PENDIENTE'}
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
            <div className="flex gap-2">
              {(report.initialEvidenceUrl || report.evidenceUrl) && (
                <button 
                  onClick={() => onViewDoc(report.initialEvidenceUrl || report.evidenceUrl, `Evidencia Inicial ${report.plate}`)}
                  className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2"
                >
                  <Eye size={14} /> <span className="text-[8px] font-black">VER FOTO</span>
                </button>
              )}
              {report.mapUrl && (
                <button 
                  onClick={() => onViewDoc(report.mapUrl, `Ubicación ${report.plate}`)}
                  className="p-2 bg-cyan-50 text-cyan-600 rounded-xl hover:bg-cyan-600 hover:text-white transition-all flex items-center gap-2"
                >
                  <MapPin size={14} /> <span className="text-[8px] font-black">MAPA</span>
                </button>
              )}
            </div>
          </div>
          
          {/* REGISTRO FOTOGRÁFICO */}
          <div className="grid grid-cols-1 gap-4">
            <div 
              onClick={() => {
                const photos = [];
                if (report.initialEvidenceUrl) photos.push({ url: report.initialEvidenceUrl, label: 'Antes' });
                if (report.finalEvidenceUrl) photos.push({ url: report.finalEvidenceUrl, label: 'Después' });
                if (photos.length === 0 && report.evidenceUrl) photos.push({ url: report.evidenceUrl, label: 'Evidencia' });
                
                if (photos.length > 0) {
                  onViewDoc(photos, `Evidencia ${report.plate}`);
                }
              }}
              className="aspect-video rounded-3xl overflow-hidden bg-slate-100 relative group/img border-2 border-slate-100 shadow-inner cursor-pointer"
            >
              <img 
                src={thumbUrl || "https://picsum.photos/seed/wash1/400/300"} 
                alt="Evidencia Principal" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                <Eye size={32} className="text-white drop-shadow-lg scale-0 group-hover/img:scale-100 transition-transform duration-300" />
              </div>
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <div className="px-3 py-1 bg-white/90 backdrop-blur-sm text-[#0f172a] text-[8px] font-black rounded-full shadow-lg uppercase tracking-widest">
                  {report.finalEvidenceUrl ? 'REGISTRO ANTES/DESPUÉS' : 'REGISTRO FOTOGRÁFICO'}
                </div>
              </div>
            </div>

            {report.initialEvidenceUrl && report.finalEvidenceUrl && (
              <div className="grid grid-cols-2 gap-2">
                <div 
                  onClick={() => onViewDoc(report.initialEvidenceUrl!, `Evidencia Antes - ${report.plate}`)}
                  className="aspect-video rounded-xl overflow-hidden bg-slate-50 border border-slate-100 cursor-pointer relative group/mini"
                >
                  <img src={getDriveDirectLink(report.initialEvidenceUrl)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/mini:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-[8px] font-black text-white uppercase tracking-widest">ANTES</span>
                  </div>
                </div>
                <div 
                  onClick={() => onViewDoc(report.finalEvidenceUrl!, `Evidencia Después - ${report.plate}`)}
                  className="aspect-video rounded-xl overflow-hidden bg-slate-50 border border-slate-100 cursor-pointer relative group/mini"
                >
                  <img src={getDriveDirectLink(report.finalEvidenceUrl)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/mini:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-[8px] font-black text-white uppercase tracking-widest">DESPUÉS</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Workshop Info */}
        {report.workshop && (
          <div className="flex items-center gap-3 text-slate-400 pt-2 border-t border-slate-100">
            <MapPin size={14} />
            <span className="text-[9px] font-bold uppercase tracking-widest truncate">{report.workshop}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default WashCard;
