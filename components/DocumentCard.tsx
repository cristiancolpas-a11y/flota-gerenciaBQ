
import React from 'react';
import { VehicleDocument } from '../types';
import { calculateStatus, formatDate } from '../utils';
import { Calendar, Clock, Eye, ShieldCheck, Info, AlertTriangle } from 'lucide-react';

interface DocumentCardProps {
  title: string;
  doc: VehicleDocument;
  icon: React.ReactNode;
  onViewDoc?: (url: string, title: string) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ title, doc, icon, onViewDoc }) => {
  const hasDate = !!doc.expiryDate;
  const status = hasDate ? calculateStatus(doc.expiryDate) : 'expired';
  
  const styles = {
    active: {
      bg: 'bg-white',
      border: 'border-slate-100',
      badge: 'bg-[#10b981] text-white',
      iconBg: 'bg-gradient-to-br from-[#4f46e5] to-[#6366f1] text-white shadow-indigo-200/50',
      label: `VIGENTE`,
      dateColor: 'text-slate-800',
      btn: 'bg-[#4f46e5] text-white hover:bg-[#4338ca] shadow-xl'
    },
    warning: {
      bg: 'bg-amber-50/30',
      border: 'border-amber-200',
      badge: 'bg-amber-500 text-white',
      iconBg: 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-200/50',
      label: `PRÓXIMO`,
      dateColor: 'text-amber-800',
      btn: 'bg-amber-600 text-white hover:bg-amber-700 shadow-xl'
    },
    critical: {
      bg: 'bg-orange-50/30',
      border: 'border-orange-300',
      badge: 'bg-orange-600 text-white',
      iconBg: 'bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-orange-200/50',
      label: `CRÍTICO`,
      dateColor: 'text-orange-900 font-black',
      btn: 'bg-orange-600 text-white hover:bg-orange-700 shadow-xl animate-pulse'
    },
    expired: {
      bg: 'bg-rose-50/20',
      border: 'border-rose-200',
      badge: 'bg-rose-600 text-white',
      iconBg: 'bg-gradient-to-br from-rose-600 to-rose-800 text-white shadow-rose-200/50',
      label: !hasDate ? 'SIN REGISTRO' : `VENCIDO`,
      dateColor: 'text-rose-600 font-black',
      btn: 'bg-slate-200 text-slate-500 cursor-not-allowed'
    }
  };

  const currentStyle = styles[status];

  return (
    <div className={`relative p-8 rounded-[3.5rem] border-4 transition-all duration-500 hover:shadow-2xl flex flex-col h-full ${currentStyle.bg} ${currentStyle.border}`}>
      
      {hasDate && doc.daysPending !== undefined && (
        <div className={`absolute -top-4 right-10 px-6 py-2.5 rounded-full text-[11px] font-black flex items-center gap-2 shadow-2xl border-2 z-20 ${status === 'critical' ? 'bg-orange-600 text-white border-orange-400' : 'bg-white text-slate-700 border-slate-50'}`}>
           {status === 'critical' ? <AlertTriangle size={14} className="animate-bounce" /> : <Clock size={14} className="text-indigo-600 animate-pulse" />} 
           {doc.daysPending} DÍAS {status === 'expired' ? 'VENCIDO' : 'RESTANTES'}
        </div>
      )}

      <div className="flex flex-col gap-6 mb-8">
        <div className="flex items-center gap-6">
          <div className={`p-6 rounded-[2rem] transition-all duration-500 shadow-2xl shrink-0 ${currentStyle.iconBg}`}>
            {React.cloneElement(icon as React.ReactElement<any>, { size: 36 })}
          </div>

          <div className="flex flex-col gap-1 flex-grow">
            <span className={`w-fit px-4 py-1 rounded-xl text-[10px] font-black tracking-[0.3em] uppercase shadow-sm mb-1 ${currentStyle.badge}`}>
              {currentStyle.label}
            </span>
            <h3 className="font-black text-slate-900 text-2xl uppercase tracking-tighter leading-none">
              {title}
            </h3>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-slate-400 bg-slate-100/50 p-4 rounded-2xl border-2 border-slate-100">
          <Calendar size={20} className="text-indigo-500" />
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Vencimiento</span>
            <span className={`text-sm md:text-base font-black tracking-tight ${currentStyle.dateColor}`}>
              {hasDate ? formatDate(doc.expiryDate) : 'PENDIENTE DE REGISTRO'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-auto">
        {doc.url ? (
          <button 
            onClick={() => onViewDoc?.(doc.url!, title)}
            className={`w-full flex items-center justify-center gap-4 py-5 rounded-[2rem] text-xs font-black transition-all uppercase tracking-[0.25em] border-b-4 border-black/10 active:translate-y-1 active:border-b-0 ${currentStyle.btn}`}
          >
            <Eye size={20} /> VER SOPORTE {title}
          </button>
        ) : (
          <div className={`w-full py-5 bg-slate-100 text-slate-400 rounded-[2rem] text-xs font-black text-center uppercase tracking-[0.2em] border-4 border-dashed border-slate-200`}>
            NO DISPONIBLE
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentCard;
