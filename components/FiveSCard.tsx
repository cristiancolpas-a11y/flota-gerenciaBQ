
import React from 'react';
import { FiveSReport } from '../types';
import { formatDate } from '../utils';
import { ShieldCheck, Calendar, Image as ImageIcon, CheckCircle2, ArrowRight, Camera, Clock, Hash } from 'lucide-react';

interface FiveSCardProps {
  report: FiveSReport;
  onViewDoc: (url: string, title: string) => void;
  onManageClosure?: (report: FiveSReport) => void;
}

const FiveSCard: React.FC<FiveSCardProps> = ({ report, onViewDoc, onManageClosure }) => {
  const isClosed = report.status === 'CERRADO';

  return (
    <div className={`bg-white rounded-[2.5rem] border-2 overflow-hidden shadow-xl flex flex-col transition-all duration-500 hover:shadow-2xl h-full ${isClosed ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-100 hover:border-emerald-200'}`}>
      
      {/* HEADER DE ESTADO */}
      <div className={`p-6 flex flex-col gap-3 ${isClosed ? 'bg-emerald-600' : 'bg-[#0f172a]'} text-white transition-colors duration-500`}>
        <div className="flex justify-between items-center w-full">
           <div className="flex items-center gap-2">
             <ShieldCheck size={20} className={isClosed ? 'text-emerald-200' : 'text-emerald-500'} />
             <h3 className="font-mono font-black text-xl tracking-tighter">{report.plate}</h3>
           </div>
           <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 ${isClosed ? 'bg-white/20 border-white/40' : 'bg-amber-500 border-amber-400 animate-pulse'}`}>
              {isClosed ? 'HALLAZGO RESUELTO' : 'HALLAZGO ABIERTO'}
           </div>
        </div>
        
        <div className="flex items-center gap-3 opacity-60">
           <Hash size={14} />
           <span className="text-[10px] font-black uppercase tracking-widest truncate">{report.id}</span>
           <span className="mx-2">•</span>
           <span className="text-[10px] font-black uppercase tracking-widest">Semana {report.week}</span>
        </div>
      </div>

      <div className="p-8 flex flex-col flex-grow space-y-6">
        
        {/* FECHA Y AUDITOR */}
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2 text-slate-400">
            <Calendar size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">{formatDate(report.date)}</span>
          </div>
          {isClosed && (
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">{report.month}</span>
            </div>
          )}
        </div>

        {/* COMPARATIVA VISUAL (MOSAICOS) */}
        <div className="space-y-4">
           <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] block mb-2">Trazabilidad Visual 5S</span>
           <div className="flex items-center justify-between gap-3 p-4 bg-slate-50/50 rounded-[2rem] border border-slate-100">
              
              {/* Foto Hallazgo (Abrir) */}
              <div 
                onClick={() => report.evidenceUrl && onViewDoc(report.evidenceUrl, `Hallazgo 5S - ${report.plate}`)}
                className="group relative flex-1 aspect-square rounded-2xl overflow-hidden cursor-pointer shadow-md border-2 border-white"
              >
                 {report.evidenceUrl ? (
                   <img src={report.evidenceUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                 ) : (
                   <div className="w-full h-full bg-slate-200 flex items-center justify-center"><ImageIcon className="text-slate-400"/></div>
                 )}
                 <div className="absolute top-0 left-0 bg-[#0f172a] text-white text-[7px] font-black px-2 py-0.5 rounded-br-lg uppercase">Hallazgo</div>
              </div>

              <ArrowRight className={`text-slate-200 ${isClosed ? 'text-emerald-400' : ''}`} size={20} />

              {/* Foto Solución (Cierre) */}
              <div 
                onClick={() => report.closureEvidenceUrl && onViewDoc(report.closureEvidenceUrl, `Solución 5S - ${report.plate}`)}
                className={`group relative flex-1 aspect-square rounded-2xl overflow-hidden shadow-md border-2 ${isClosed ? 'cursor-pointer border-white' : 'border-dashed border-slate-200 bg-slate-100'}`}
              >
                 {report.closureEvidenceUrl ? (
                   <img src={report.closureEvidenceUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center">
                      <Camera className="text-slate-300" size={24} />
                   </div>
                 )}
                 {isClosed && <div className="absolute top-0 left-0 bg-emerald-500 text-white text-[7px] font-black px-2 py-0.5 rounded-br-lg uppercase">Solución</div>}
              </div>
           </div>
        </div>

        {/* ACCIONES */}
        <div className="mt-auto pt-4">
          {isClosed ? (
            <div className="w-full py-4 bg-emerald-50 text-emerald-700 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-emerald-100">
              <CheckCircle2 size={16} /> Estándar Restablecido
            </div>
          ) : (
            <button 
              onClick={() => onManageClosure?.(report)}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/10 hover:bg-emerald-700 transition-all active:scale-95 group"
            >
              <Clock size={16} className="group-hover:rotate-12 transition-transform" /> 
              Cerrar Hallazgo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FiveSCard;
