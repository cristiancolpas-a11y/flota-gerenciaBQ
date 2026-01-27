
import React from 'react';
import { Report } from '../types';
import { formatDate, getDriveDirectLink } from '../utils';
import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Truck, 
  Image as ImageIcon, 
  Wrench, 
  FileText, 
  ArrowRight,
  AlertCircle,
  ExternalLink,
  Calendar,
  MessageSquare,
  History
} from 'lucide-react';

interface ReportCardProps {
  report: Report;
  onViewDoc: (url: string, title: string) => void;
  onManageClosure?: (report: Report) => void;
}

const ReportCard: React.FC<ReportCardProps> = ({ report, onViewDoc, onManageClosure }) => {
  const getThumb = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('data')) return url;
    if (url.startsWith('http')) return getDriveDirectLink(url);
    return null;
  };

  const thumbIn = getThumb(report.initialEvidence);
  const thumbOut = getThumb(report.solutionEvidence);
  const thumbWorkshop = getThumb(report.workshopEvidence);
  const isClosed = report.status === 'CERRADO';

  return (
    <div className={`bg-white rounded-[3rem] border-2 overflow-hidden shadow-2xl transition-all hover:shadow-indigo-500/10 animate-in fade-in slide-in-from-bottom-6 duration-700 flex flex-col h-full ${isClosed ? 'border-emerald-100 bg-emerald-50/10' : 'border-rose-100 bg-white'}`}>
      
      {/* CABECERA DARK - ALTO IMPACTO */}
      <div className={`p-8 flex justify-between items-center relative overflow-hidden ${isClosed ? 'bg-[#064e3b]' : 'bg-[#0f172a]'}`}>
        <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-30 -mr-20 -mt-20 ${isClosed ? 'bg-emerald-400' : 'bg-rose-500'}`}></div>
        
        <div className="flex items-center gap-5 relative z-10">
          <div className={`p-4 rounded-[1.5rem] shadow-xl border-2 border-white/10 ${isClosed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
            <Truck size={28} />
          </div>
          <div>
            <h3 className="font-mono font-black text-white text-3xl tracking-tighter leading-none">{report.plate}</h3>
            <p className="text-[10px] text-indigo-300 font-black uppercase tracking-[0.25em] mt-2 flex items-center gap-2">
               <Calendar size={12} /> {formatDate(report.date)}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end relative z-10">
          <span className={`px-5 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl border-2 ${isClosed ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-500 animate-pulse'}`}>
            {report.status}
          </span>
          <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-3">{report.id}</span>
        </div>
      </div>

      <div className="p-10 flex flex-col flex-grow space-y-10">
        
        {/* BLOQUE 1: NOVEDAD */}
        <div className="space-y-4">
           <div className="flex items-center gap-3">
              <FileText size={18} className="text-indigo-500" />
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Detalle de Novedad</span>
           </div>
           <div className="bg-slate-50/80 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
              <p className="text-base font-bold text-slate-700 leading-relaxed italic">"{report.novelty}"</p>
           </div>
        </div>

        {/* BLOQUE 2: LOGÍSTICA */}
        <div className="grid grid-cols-2 gap-6">
           <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm transition-all hover:border-indigo-200">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                 <Wrench size={14} className="text-amber-500" /> Taller
              </p>
              <p className="text-sm font-black text-slate-800 uppercase truncate">{report.workshop || 'NO ASIGNADO'}</p>
           </div>
           <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm transition-all hover:border-indigo-200">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                 <AlertCircle size={14} className="text-indigo-500" /> Fuente
              </p>
              <p className="text-sm font-black text-slate-800 uppercase truncate">{report.source}</p>
           </div>
        </div>

        {/* BLOQUE 3: FLUJO FOTOGRÁFICO */}
        <div className="space-y-6">
           <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Trazabilidad Fotográfica</span>
           </div>
           
           <div className="flex items-center justify-between gap-2 p-4 bg-slate-50/50 rounded-[2.5rem] border border-slate-100">
              {/* Foto Ingreso */}
              <div onClick={() => thumbIn && onViewDoc(report.initialEvidence!, 'Evidencia de Ingreso')} className="group relative w-24 h-24 rounded-2xl overflow-hidden cursor-pointer shadow-lg border-2 border-white">
                 {thumbIn ? (
                   <img src={thumbIn} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                 ) : <div className="w-full h-full bg-slate-200 flex items-center justify-center"><ImageIcon className="text-slate-400"/></div>}
                 <div className="absolute inset-0 bg-indigo-600/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><ExternalLink size={20} className="text-white"/></div>
                 <div className="absolute top-0 left-0 bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-br-lg">INGRESO</div>
              </div>

              <ArrowRight className={`text-slate-200 ${isClosed ? 'text-emerald-400' : ''}`} size={24} />

              {/* Foto Taller */}
              <div onClick={() => thumbWorkshop && onViewDoc(report.workshopEvidence!, 'Evidencia en Taller')} className="group relative w-24 h-24 rounded-2xl overflow-hidden cursor-pointer shadow-lg border-2 border-white">
                 {thumbWorkshop ? (
                   <img src={thumbWorkshop} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                 ) : <div className="w-full h-full bg-slate-200 flex items-center justify-center"><Wrench className="text-slate-400"/></div>}
                 <div className="absolute inset-0 bg-amber-600/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><ExternalLink size={20} className="text-white"/></div>
                 <div className="absolute top-0 left-0 bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-br-lg">TALLER</div>
              </div>

              <ArrowRight className={`text-slate-200 ${isClosed ? 'text-emerald-400' : ''}`} size={24} />

              {/* Foto Salida */}
              <div onClick={() => thumbOut && onViewDoc(report.solutionEvidence!, 'Evidencia de Solución')} className="group relative w-24 h-24 rounded-2xl overflow-hidden cursor-pointer shadow-lg border-2 border-white">
                 {thumbOut ? (
                   <img src={thumbOut} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                 ) : <div className="w-full h-full bg-slate-200 flex items-center justify-center"><CheckCircle2 className="text-slate-400"/></div>}
                 <div className="absolute inset-0 bg-emerald-600/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><ExternalLink size={20} className="text-white"/></div>
                 <div className="absolute top-0 left-0 bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-br-lg">SOLUCIÓN</div>
              </div>
           </div>
        </div>

        {/* BLOQUE 4: CIERRE (Si aplica) */}
        {isClosed && (
          <div className="p-8 bg-emerald-600 rounded-[2.5rem] text-white shadow-xl animate-in zoom-in duration-500">
             <div className="flex items-center gap-4 mb-6">
                <History size={24} className="text-emerald-200" />
                <h4 className="text-[11px] font-black uppercase tracking-[0.3em]">Resumen de Finalización</h4>
             </div>
             <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                   <p className="text-[9px] font-black text-emerald-200 uppercase tracking-widest mb-1">Días en Taller</p>
                   <p className="text-2xl font-black">{report.daysInShop} DÍAS</p>
                </div>
                <div>
                   <p className="text-[9px] font-black text-emerald-200 uppercase tracking-widest mb-1">Fecha Cierre</p>
                   <p className="text-lg font-black">{formatDate(report.closureDate!)}</p>
                </div>
             </div>
             <div className="p-5 bg-white/10 rounded-2xl border border-white/10">
                <p className="text-[9px] font-black text-emerald-200 uppercase tracking-widest mb-2 flex items-center gap-2">
                   <MessageSquare size={12} /> Comentarios
                </p>
                <p className="text-xs font-bold leading-relaxed">{report.closureComments || 'Sin comentarios registrados.'}</p>
             </div>
          </div>
        )}

        {/* ACCIONES */}
        <div className="mt-auto grid grid-cols-2 gap-4">
          <button 
            onClick={() => report.entryMap && onViewDoc(report.entryMap, 'Mapa de Ingreso')}
            disabled={!report.entryMap}
            className="flex items-center justify-center gap-3 py-4 bg-white text-indigo-600 border border-slate-200 text-[10px] font-black rounded-2xl hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest shadow-sm disabled:opacity-30"
          >
            <MapPin size={16} /> MAPA INGRESO
          </button>
          
          {isClosed ? (
            <button 
              onClick={() => report.exitMap && onViewDoc(report.exitMap, 'Mapa de Salida')}
              disabled={!report.exitMap}
              className="flex items-center justify-center gap-3 py-4 bg-emerald-700 text-white text-[10px] font-black rounded-2xl hover:bg-emerald-800 transition-all uppercase tracking-widest shadow-xl"
            >
              <MapPin size={16} /> MAPA SALIDA
            </button>
          ) : (
            <button 
              onClick={() => onManageClosure?.(report)}
              className="flex items-center justify-center gap-3 py-4 bg-[#0f172a] text-white text-[10px] font-black rounded-2xl hover:bg-indigo-600 shadow-2xl transition-all uppercase tracking-widest"
            >
              <Clock size={16} /> CERRAR REPORTE
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportCard;
