
import React from 'react';
import { WashReport } from '../types';
import { formatDate, getDriveDirectLink } from '../utils';
import { 
  Droplets, 
  Calendar, 
  Image as ImageIcon, 
  CheckCircle2, 
  Hash, 
  Sparkles, 
  MapPin, 
  Building2, 
  ExternalLink,
  Clock
} from 'lucide-react';

interface WashCardProps {
  report: WashReport;
  onViewDoc: (url: string, title: string) => void;
}

const WashCard: React.FC<WashCardProps> = ({ report, onViewDoc }) => {
  // Función para obtener el thumbnail correcto (Base64 o Drive)
  const getThumb = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('data')) return url;
    if (url.startsWith('http')) return getDriveDirectLink(url);
    return null;
  };

  const thumbEvidence = getThumb(report.evidenceUrl);
  const thumbMap = getThumb(report.mapUrl);

  return (
    <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 overflow-hidden shadow-xl flex flex-col transition-all duration-500 hover:shadow-cyan-500/15 hover:border-cyan-200 h-full group animate-in fade-in slide-in-from-bottom-4">
      
      {/* HEADER: ESTADO Y PLACA */}
      <div className="p-6 bg-[#0f172a] text-white flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
        
        <div className="flex justify-between items-center relative z-10">
           <div className="flex items-center gap-3">
             <div className="p-2.5 bg-cyan-500 rounded-xl shadow-lg shadow-cyan-500/20">
               <Droplets size={20} className="text-white animate-pulse" />
             </div>
             <h3 className="font-mono font-black text-2xl tracking-tighter">{report.plate}</h3>
           </div>
           <div className="flex flex-col items-end">
             <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-[8px] font-black uppercase tracking-widest border border-emerald-500/30">
                LAVADO EXITOSO
             </span>
           </div>
        </div>
        
        <div className="flex items-center justify-between opacity-60 relative z-10">
           <div className="flex items-center gap-1.5">
             <Hash size={12} className="text-cyan-400" />
             <span className="text-[9px] font-black uppercase tracking-widest truncate max-w-[120px]">{report.id}</span>
           </div>
           <div className="flex items-center gap-1.5">
             <Clock size={12} className="text-cyan-400" />
             <span className="text-[9px] font-black uppercase tracking-widest">Semana {report.week}</span>
           </div>
        </div>
      </div>

      <div className="p-8 flex flex-col flex-grow space-y-6">
        {/* BLOQUE TEMPORAL */}
        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar size={16} className="text-cyan-600" />
            <span className="text-[11px] font-black uppercase tracking-tight">{formatDate(report.date)}</span>
          </div>
          <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg">
            <span className="text-[10px] font-black text-slate-400 uppercase">{report.month}</span>
          </div>
        </div>

        {/* EVIDENCIA VISUAL (MOSAICO O FOTO) */}
        <div className="space-y-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Soporte Visual de Limpieza</p>
          <div 
            onClick={() => report.evidenceUrl && onViewDoc(report.evidenceUrl, `Registro Lavado - ${report.plate}`)}
            className="relative aspect-video rounded-[2rem] overflow-hidden cursor-pointer shadow-lg border-4 border-white group-hover:scale-[1.01] transition-transform duration-500"
          >
             {thumbEvidence ? (
               <img src={thumbEvidence} className="w-full h-full object-cover" alt="Evidencia Lavado" />
             ) : (
               <div className="w-full h-full bg-slate-100 flex items-center justify-center flex-col gap-2">
                 <ImageIcon className="text-slate-300" size={32} />
                 <span className="text-[8px] font-black text-slate-400 uppercase">Sin Imagen</span>
               </div>
             )}
             <div className="absolute inset-0 bg-cyan-600/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <div className="p-4 bg-white/20 backdrop-blur-md rounded-full border border-white/30">
                  <ExternalLink className="text-white" size={24} />
                </div>
             </div>
             <div className="absolute bottom-3 right-3 bg-cyan-600 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase shadow-lg">
               Ver Galería
             </div>
          </div>
        </div>

        {/* LUGAR Y MAPA */}
        <div className="pt-2">
           <div className="bg-gradient-to-r from-slate-50 to-white p-5 rounded-[2rem] border border-slate-100 flex items-center justify-between group/map">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-cyan-600 group-hover/map:scale-110 transition-transform">
                  <Building2 size={20}/>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Taller / Ubicación</p>
                  <p className="text-[12px] font-black text-slate-800 uppercase tracking-tight">{report.workshop || 'CENTRO DE LAVADO'}</p>
                </div>
              </div>
              
              {report.mapUrl ? (
                <button 
                  onClick={() => onViewDoc(report.mapUrl, `Ubicación GPS - ${report.plate}`)}
                  className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl hover:bg-cyan-600 hover:text-white transition-all shadow-sm border border-cyan-100 active:scale-90"
                  title="Ver Mapa de Ubicación"
                >
                  <MapPin size={22} />
                </button>
              ) : (
                <div className="p-3 bg-slate-50 text-slate-300 rounded-2xl border border-slate-100 grayscale">
                  <MapPin size={22} />
                </div>
              )}
           </div>
        </div>
      </div>
      
      {/* BARRA INFERIOR DE DISEÑO */}
      <div className="h-2 w-full bg-cyan-500 opacity-20 group-hover:opacity-100 transition-opacity"></div>
    </div>
  );
};

export default WashCard;
